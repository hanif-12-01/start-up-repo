<?php

namespace App\Services\Predictions;

use App\Models\Business;
use App\Services\Electricity\ElectricityCalculator;
use Carbon\Carbon;

/**
 * Deterministic electricity-usage prediction domain service.
 *
 * This is a pure, rule-based estimator — NOT a machine-learning model. It does
 * not call external APIs, does not use randomness, and does not persist
 * anything. Given identical inputs it always produces identical outputs.
 *
 * Techniques used (all deterministic):
 *   - Recent weighted moving average (recent months weighted higher).
 *   - Recent linear trend projection (least-squares over the recent window).
 *   - Deterministic risk classification (thresholds on predicted change).
 *   - Deterministic confidence scoring (history depth, gaps, volatility).
 *
 * The LSTM / Gradient Boosting artefacts under /ML are intentionally NOT ported.
 */
class PredictionService
{
    // User-facing method labels (chosen deterministically by history depth).
    public const METHOD_HYBRID = 'Hybrid AI Decision Support';       // 3+ months
    public const METHOD_PATTERN = 'Analisis Berbasis Pola Pemakaian'; // 2 months
    public const METHOD_ADAPTIVE = 'Model Estimasi Adaptif';          // 1 month

    // Risk levels.
    public const RISK_LOW = 'LOW';
    public const RISK_MEDIUM = 'MEDIUM';
    public const RISK_HIGH = 'HIGH';

    // Confidence levels (user-facing Indonesian labels).
    public const CONFIDENCE_LOW = 'Rendah';
    public const CONFIDENCE_MEDIUM = 'Sedang';
    public const CONFIDENCE_HIGH = 'Tinggi';

    // Tunables (kept as named constants so behaviour is explicit and testable).
    private const TREND_WEIGHT = 0.75;              // weight of trend vs WMA for 3+ months
    private const WMA_WEIGHT = 0.25;
    private const RISK_HIGH_THRESHOLD = 15.0;       // predicted change_percent >= => HIGH
    private const RISK_MEDIUM_THRESHOLD = 5.0;      // predicted change_percent >= => MEDIUM
    private const HIGH_VOLATILITY_CV = 0.25;        // coefficient of variation above this reduces confidence
    private const CHART_WINDOW = 6;                 // months of history shown on the chart
    private const TREND_WINDOW = 6;                 // months used for the linear regression
    private const WMA_WINDOW = 3;                   // months used for the weighted moving average

    public function __construct(
        private readonly ElectricityCalculator $calculator
    ) {}

    /**
     * Build a prediction for a business by loading its electricity history.
     *
     * @param Business $business
     * @param bool $isDetailedUnlocked Whether the caller's plan unlocks detailed analysis.
     * @return array
     */
    public function predictForBusiness(Business $business, bool $isDetailedUnlocked = true): array
    {
        $entries = $business->electricityEntries()
            ->orderBy('period_month', 'asc')
            ->get();

        $history = [];
        foreach ($entries as $entry) {
            $history[] = [
                'period_month' => Carbon::parse($entry->period_month)->format('Y-m'),
                'usage_kwh' => $entry->usage_kwh !== null ? (float) $entry->usage_kwh : null,
                'bill_amount_idr' => $entry->bill_amount_idr !== null ? (float) $entry->bill_amount_idr : null,
                'tariff_per_kwh' => $entry->tariff_per_kwh !== null ? (float) $entry->tariff_per_kwh : null,
            ];
        }

        $tariff = $this->resolveTariff($business, $history);

        return $this->predict($history, $tariff, $isDetailedUnlocked);
    }

    /**
     * Pure deterministic prediction core.
     *
     * @param array $history Ordered oldest→newest list of monthly samples, each:
     *                       ['period_month' => 'YYYY-MM', 'usage_kwh' => ?float,
     *                        'bill_amount_idr' => ?float, 'tariff_per_kwh' => ?float]
     * @param float|null $tariffPerKwh Resolved tariff for the Rupiah estimate.
     * @param bool $isDetailedUnlocked Whether detailed analysis is unlocked.
     * @return array The prediction result contract.
     */
    public function predict(array $history, ?float $tariffPerKwh = null, bool $isDetailedUnlocked = true): array
    {
        $hasTariff = $tariffPerKwh !== null && $tariffPerKwh > 0.0;

        // Normalize into usable usage samples (derive usage from bill/tariff when possible).
        $samples = [];
        foreach ($history as $row) {
            $usage = $row['usage_kwh'] ?? null;
            $bill = $row['bill_amount_idr'] ?? null;
            $rowTariff = $row['tariff_per_kwh'] ?? $tariffPerKwh;

            if ($usage === null && $bill !== null && $rowTariff !== null && $rowTariff > 0.0) {
                $usage = $bill / $rowTariff;
            }

            if ($usage === null || !is_finite((float) $usage)) {
                continue; // month has no usable usage value — treated as a gap
            }

            $samples[] = [
                'period' => $row['period_month'],
                'usage' => (float) $usage,
                'bill' => ($bill !== null && is_finite((float) $bill)) ? (float) $bill : null,
            ];
        }

        $n = count($samples);

        if ($n === 0) {
            return $this->noPredictionResult($hasTariff, $isDetailedUnlocked);
        }

        $usages = array_map(static fn ($s) => $s['usage'], $samples);
        [$hasGaps, $gapMonths] = $this->detectGaps($samples);

        // --- Point estimate + method label ---
        if ($n === 1) {
            $predicted = $usages[0];                       // baseline carry-forward
            $method = self::METHOD_ADAPTIVE;
        } elseif ($n === 2) {
            $predicted = (2.0 * $usages[1]) - $usages[0];  // basic 2-point trend
            $method = self::METHOD_PATTERN;
        } else {
            $wma = $this->weightedMovingAverage($usages);
            $trend = $this->linearTrendProjection($usages);
            $predicted = (self::TREND_WEIGHT * $trend) + (self::WMA_WEIGHT * $wma);
            $method = self::METHOD_HYBRID;
        }

        $predicted = max(0.0, $predicted);                 // usage can never be negative
        $predictedUsage = $this->safeRound($predicted, 2);

        // --- Previous actual (latest month) ---
        $previousUsage = $this->safeRound($usages[$n - 1], 2);
        $previousBill = $samples[$n - 1]['bill'];
        if ($previousBill === null && $hasTariff) {
            $previousBill = $this->safeRound($usages[$n - 1] * $tariffPerKwh, 2);
        }

        // --- Change percent (guard against division by zero) ---
        $changePercent = null;
        if ($predictedUsage !== null && $usages[$n - 1] > 0.0) {
            $changePercent = $this->safeRound(
                (($predictedUsage - $usages[$n - 1]) / $usages[$n - 1]) * 100.0,
                1
            );
        }

        // --- Rupiah estimate (only when a tariff is available) ---
        $estimatedBill = null;
        if ($predictedUsage !== null && $hasTariff) {
            $estimatedBill = $this->safeRound($predictedUsage * $tariffPerKwh, 2);
        }

        // --- Deterministic risk + confidence ---
        $risk = $this->classifyRisk($changePercent);
        $cv = $this->coefficientOfVariation($usages);
        $highVolatility = $cv > self::HIGH_VOLATILITY_CV;
        $confidence = $this->scoreConfidence($n, $hasGaps, $highVolatility);
        $confidenceReason = $this->buildConfidenceReason($n, $hasGaps, $highVolatility);

        return [
            'has_prediction' => true,
            'predicted_usage_kwh' => $predictedUsage,
            'estimated_bill_idr' => $estimatedBill,
            'previous_usage_kwh' => $previousUsage,
            'previous_bill_idr' => $previousBill,
            'change_percent' => $changePercent,
            'risk_level' => $risk,
            'confidence_level' => $confidence,
            'confidence_reason' => $confidenceReason,
            'method_label' => $method,
            'possible_causes' => $this->buildPossibleCauses($risk, $isDetailedUnlocked),
            'chart_data' => $this->buildChartData($samples, $predictedUsage),
            'is_detailed_analysis_locked' => ! $isDetailedUnlocked,
            'data_requirements' => [
                'history_months' => $n,
                'has_gaps' => $hasGaps,
                'gap_months' => $gapMonths,
                'has_tariff' => $hasTariff,
                'needs_more_data' => $n < 3,
                'message' => $this->dataRequirementMessage($n, $hasGaps, $hasTariff),
            ],
        ];
    }

    /**
     * Resolve the effective tariff: business electricity profile first, then the
     * most recent entry that carries a tariff.
     */
    private function resolveTariff(Business $business, array $history): ?float
    {
        $profile = $business->electricityProfile;
        if ($profile && $profile->tariff_per_kwh !== null) {
            return (float) $profile->tariff_per_kwh;
        }

        for ($i = count($history) - 1; $i >= 0; $i--) {
            if (($history[$i]['tariff_per_kwh'] ?? null) !== null) {
                return (float) $history[$i]['tariff_per_kwh'];
            }
        }

        return null;
    }

    /**
     * Weighted moving average of the most recent WMA_WINDOW months.
     * Recent months carry higher weight (1..k), anchoring the estimate to the
     * latest usage level while damping trend over-extrapolation.
     */
    private function weightedMovingAverage(array $usages): float
    {
        $window = array_slice($usages, -self::WMA_WINDOW);
        $numerator = 0.0;
        $denominator = 0.0;

        foreach ($window as $i => $value) {
            $weight = $i + 1;
            $numerator += $weight * $value;
            $denominator += $weight;
        }

        return $denominator > 0.0 ? $numerator / $denominator : 0.0;
    }

    /**
     * Least-squares linear trend projection for the next month over the most
     * recent TREND_WINDOW months. Deterministic; guarded against zero variance.
     */
    private function linearTrendProjection(array $usages): float
    {
        $window = array_slice($usages, -self::TREND_WINDOW);
        $k = count($window);

        if ($k < 2) {
            return $window[$k - 1] ?? 0.0;
        }

        $sumX = 0.0;
        $sumY = 0.0;
        $sumXY = 0.0;
        $sumX2 = 0.0;

        foreach ($window as $i => $y) {
            $x = (float) $i;
            $sumX += $x;
            $sumY += $y;
            $sumXY += $x * $y;
            $sumX2 += $x * $x;
        }

        $denominator = ($k * $sumX2) - ($sumX * $sumX);
        if ($denominator == 0.0) {
            return $window[$k - 1]; // fall back to last value if x has no variance
        }

        $slope = (($k * $sumXY) - ($sumX * $sumY)) / $denominator;
        $intercept = ($sumY - ($slope * $sumX)) / $k;

        // Project one step past the window (next month).
        return $intercept + ($slope * (float) $k);
    }

    /**
     * Coefficient of variation (std dev / mean). Returns 0 when the mean is not
     * positive so it never divides by zero or reports spurious volatility.
     */
    private function coefficientOfVariation(array $usages): float
    {
        $count = count($usages);
        if ($count === 0) {
            return 0.0;
        }

        $mean = array_sum($usages) / $count;
        if ($mean <= 0.0) {
            return 0.0;
        }

        $variance = 0.0;
        foreach ($usages as $value) {
            $variance += ($value - $mean) ** 2;
        }
        $variance /= $count;

        $stdDev = sqrt($variance);

        return $mean > 0.0 ? $stdDev / $mean : 0.0;
    }

    /**
     * Detect skipped months between consecutive samples.
     *
     * @return array{0: bool, 1: int} [hasGaps, totalGapMonths]
     */
    private function detectGaps(array $samples): array
    {
        $hasGaps = false;
        $gapMonths = 0;

        for ($i = 1; $i < count($samples); $i++) {
            $previous = Carbon::parse($samples[$i - 1]['period'] . '-01')->startOfMonth();
            $current = Carbon::parse($samples[$i]['period'] . '-01')->startOfMonth();
            $diff = (int) $previous->diffInMonths($current);

            if ($diff > 1) {
                $hasGaps = true;
                $gapMonths += ($diff - 1);
            }
        }

        return [$hasGaps, $gapMonths];
    }

    /**
     * Deterministic risk classification based on the predicted change.
     * Only increases raise risk; decreases and unknowns are LOW.
     */
    private function classifyRisk(?float $changePercent): string
    {
        if ($changePercent === null) {
            return self::RISK_LOW;
        }

        if ($changePercent >= self::RISK_HIGH_THRESHOLD) {
            return self::RISK_HIGH;
        }

        if ($changePercent >= self::RISK_MEDIUM_THRESHOLD) {
            return self::RISK_MEDIUM;
        }

        return self::RISK_LOW;
    }

    /**
     * Deterministic confidence scoring: history depth minus penalties for
     * skipped months and high volatility.
     */
    private function scoreConfidence(int $n, bool $hasGaps, bool $highVolatility): string
    {
        $score = 0;
        if ($n >= 6) {
            $score += 3;
        } elseif ($n >= 3) {
            $score += 2;
        } elseif ($n === 2) {
            $score += 1;
        }

        if ($hasGaps) {
            $score -= 1;
        }
        if ($highVolatility) {
            $score -= 1;
        }
        $score = max(0, $score);

        if ($score >= 3) {
            return self::CONFIDENCE_HIGH;
        }
        if ($score === 2) {
            return self::CONFIDENCE_MEDIUM;
        }

        return self::CONFIDENCE_LOW;
    }

    private function buildConfidenceReason(int $n, bool $hasGaps, bool $highVolatility): string
    {
        $parts = ["Berdasarkan {$n} bulan data pemakaian."];

        if ($n === 1) {
            $parts[] = 'Estimasi baseline dari pemakaian terakhir.';
        } elseif ($n === 2) {
            $parts[] = 'Tren dasar dari dua bulan terakhir.';
        } else {
            $parts[] = 'Menggunakan rata-rata bergerak dan proyeksi tren.';
        }

        if ($hasGaps) {
            $parts[] = 'Terdapat bulan yang terlewat sehingga menurunkan tingkat keyakinan.';
        }
        if ($highVolatility) {
            $parts[] = 'Pola pemakaian cukup fluktuatif sehingga menurunkan tingkat keyakinan.';
        }

        return implode(' ', $parts);
    }

    /**
     * Safe, input-grounded possible causes. Never claims certainty and never
     * uses forbidden phrasing. Empty when detailed analysis is locked.
     */
    private function buildPossibleCauses(string $risk, bool $isDetailedUnlocked): array
    {
        if (! $isDetailedUnlocked) {
            return [];
        }

        if ($risk === self::RISK_HIGH || $risk === self::RISK_MEDIUM) {
            return [
                'Kemungkinan penyebab yang perlu dicek: durasi atau intensitas pemakaian alat berdaya besar bertambah. Berdasarkan data input.',
                'Kemungkinan penyebab yang perlu dicek: penambahan jumlah unit atau jam operasional usaha. Perlu Verifikasi Manual.',
                'Kemungkinan penyebab yang perlu dicek: perubahan pola musiman atau tingkat hunian. Perlu Verifikasi Manual.',
            ];
        }

        return [
            'Pola pemakaian relatif stabil berdasarkan data input. Belum ada indikasi lonjakan yang perlu dicek saat ini.',
        ];
    }

    /**
     * Build chart series: recent actual months plus one projected point.
     */
    private function buildChartData(array $samples, ?float $predictedUsage): array
    {
        $chart = [];
        $window = array_slice($samples, -self::CHART_WINDOW);

        foreach ($window as $sample) {
            $chart[] = [
                'period_month' => $sample['period'],
                'usage_kwh' => $this->safeRound($sample['usage'], 2),
                'type' => 'actual',
            ];
        }

        $lastPeriod = $samples[count($samples) - 1]['period'];
        $nextPeriod = Carbon::parse($lastPeriod . '-01')->addMonth()->format('Y-m');

        $chart[] = [
            'period_month' => $nextPeriod,
            'usage_kwh' => $predictedUsage,
            'type' => 'predicted',
        ];

        return $chart;
    }

    private function dataRequirementMessage(int $n, bool $hasGaps, bool $hasTariff): string
    {
        if ($n === 1) {
            $message = 'Estimasi baseline dari 1 bulan data. Tambah data bulan berikutnya untuk analisis tren.';
        } elseif ($n === 2) {
            $message = 'Analisis tren dasar dari 2 bulan data. Tambah 1 bulan lagi untuk pola yang lebih relevan.';
        } else {
            $message = 'Data cukup untuk analisis pola pemakaian dan proyeksi tren.';
            if ($hasGaps) {
                $message .= ' Terdapat bulan yang terlewat pada riwayat Anda.';
            }
        }

        if (! $hasTariff) {
            $message .= ' Tarif per kWh belum tersedia sehingga estimasi biaya Rupiah tidak ditampilkan.';
        }

        return $message;
    }

    private function noPredictionResult(bool $hasTariff, bool $isDetailedUnlocked): array
    {
        return [
            'has_prediction' => false,
            'predicted_usage_kwh' => null,
            'estimated_bill_idr' => null,
            'previous_usage_kwh' => null,
            'previous_bill_idr' => null,
            'change_percent' => null,
            'risk_level' => null,
            'confidence_level' => null,
            'confidence_reason' => 'Belum ada data pemakaian listrik untuk membuat estimasi.',
            'method_label' => null,
            'possible_causes' => [],
            'chart_data' => [],
            'is_detailed_analysis_locked' => ! $isDetailedUnlocked,
            'data_requirements' => [
                'history_months' => 0,
                'has_gaps' => false,
                'gap_months' => 0,
                'has_tariff' => $hasTariff,
                'needs_more_data' => true,
                'message' => 'Belum ada data pemakaian listrik. Tambahkan minimal 1 bulan data untuk melihat estimasi.',
            ],
        ];
    }

    /**
     * Round only finite values; anything non-finite (NaN/Infinity) becomes null
     * so the contract never leaks NaN or Infinity.
     */
    private function safeRound(float $value, int $precision): ?float
    {
        if (! is_finite($value)) {
            return null;
        }

        return round($value, $precision);
    }
}
