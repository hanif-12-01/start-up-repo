<?php

namespace App\Services\Recommendations;

use App\Models\Business;
use App\Services\Appliances\ApplianceEstimator;
use App\Services\Electricity\ElectricityCalculator;

class EfficiencyScoreService
{
    public function __construct(
        private readonly ApplianceEstimator $applianceEstimator,
        private readonly ElectricityCalculator $electricityCalculator
    ) {}

    /**
     * Calculate electricity efficiency score and status for a business.
     *
     * @param Business $business
     * @return array
     */
    public function calculateForBusiness(Business $business): array
    {
        // 1. Fetch latest entries
        $latestElectricityEntry = $business->electricityEntries()
            ->orderBy('period_month', 'desc')
            ->first();

        $latestRevenueEntry = $business->revenueEntries()
            ->orderBy('period_month', 'desc')
            ->first();

        // 2. Resolve electricity cost
        $electricityCostIdr = null;
        if ($latestElectricityEntry) {
            if ($latestElectricityEntry->bill_amount_idr !== null) {
                $electricityCostIdr = (float) $latestElectricityEntry->bill_amount_idr;
            } else {
                $usageKwh = $latestElectricityEntry->usage_kwh !== null ? (float) $latestElectricityEntry->usage_kwh : null;
                $tariffPerKwh = $latestElectricityEntry->tariff_per_kwh !== null ? (float) $latestElectricityEntry->tariff_per_kwh : null;
                $electricityCostIdr = $this->electricityCalculator->estimateBillAmount($usageKwh, $tariffPerKwh);
            }
        }

        // 3. Resolve revenue amount
        $revenueAmountIdr = $latestRevenueEntry ? (float) $latestRevenueEntry->revenue_amount_idr : null;

        // 4. Check for incomplete data
        if ($electricityCostIdr === null || $revenueAmountIdr === null || $revenueAmountIdr <= 0) {
            return [
                'score' => null,
                'label' => 'Data belum cukup',
                'status' => 'INCOMPLETE',
                'confidence' => 'LOW',
                'explanation' => 'Data tagihan listrik atau pendapatan bulan terbaru belum lengkap untuk menghitung skor efisiensi.',
            ];
        }

        // 5. Initialize score and check data completeness for confidence
        $score = 100;
        $hasMissingSupportingData = false;

        // A. Penalty: Electricity cost to revenue ratio
        $ratio = ($electricityCostIdr / $revenueAmountIdr) * 100.0;
        if ($ratio > 20.0) {
            $score -= 25;
        } elseif ($ratio > 15.0) {
            $score -= 15;
        } elseif ($ratio > 10.0) {
            $score -= 8;
        }

        // B. Penalty: No appliances data
        $appliances = $business->appliances;
        $applianceCount = $appliances->count();
        if ($applianceCount === 0) {
            $score -= 10;
            $hasMissingSupportingData = true;
        }

        // C. Penalty: No tariff configuration
        $tariff = $this->getTariff($business, $latestElectricityEntry);
        $hasTariff = $tariff !== null && $tariff > 0;
        if (!$hasTariff) {
            $score -= 10;
            $hasMissingSupportingData = true;
        }

        // D. Penalty: Top appliance dominates estimated usage (>30%)
        if ($applianceCount > 0) {
            $totalKwh = 0.0;
            $maxKwh = 0.0;

            foreach ($appliances as $appliance) {
                $watt = $appliance->watt !== null ? (float) $appliance->watt : null;
                $qty = $appliance->quantity;
                $hours = $appliance->hours_per_day !== null ? (float) $appliance->hours_per_day : null;
                $days = $appliance->days_per_month;

                $kwh = $this->applianceEstimator->estimateMonthlyKwh($watt, $qty, $hours, $days);
                if ($kwh !== null) {
                    $totalKwh += $kwh;
                    if ($kwh > $maxKwh) {
                        $maxKwh = $kwh;
                    }
                }
            }

            if ($totalKwh > 0.0) {
                $pct = ($maxKwh / $totalKwh) * 100.0;
                if ($pct > 30.0) {
                    $score -= 10;
                }
            }
        }

        // 6. Clamp score between 0 and 100
        $score = max(0, min(100, $score));

        // 7. Resolve status and label
        $status = 'CHECK';
        $label = 'Perlu Dicek';
        if ($score >= 80) {
            $status = 'GOOD';
            $label = 'Baik';
        } elseif ($score >= 60) {
            $status = 'WATCH';
            $label = 'Perlu Dipantau';
        }

        // 8. Resolve confidence level
        $confidence = ($hasMissingSupportingData) ? 'MEDIUM' : 'HIGH';

        // 9. Generate explanation
        $explanation = $this->generateExplanation($score, $ratio, $hasMissingSupportingData, $applianceCount);

        return [
            'score' => $score,
            'label' => $label,
            'status' => $status,
            'confidence' => $confidence,
            'explanation' => $explanation,
        ];
    }

    /**
     * Resolve the active tariff per kWh for a business.
     */
    private function getTariff(Business $business, $latestElectricityEntry): ?float
    {
        $profile = $business->electricityProfile;
        if ($profile && $profile->tariff_per_kwh !== null) {
            return (float) $profile->tariff_per_kwh;
        }
        if ($latestElectricityEntry && $latestElectricityEntry->tariff_per_kwh !== null) {
            return (float) $latestElectricityEntry->tariff_per_kwh;
        }
        return null;
    }

    /**
     * Generate user friendly explanation based on score and status.
     */
    private function generateExplanation(int $score, float $ratio, bool $hasMissingSupportingData, int $applianceCount): string
    {
        $ratioText = round($ratio, 1) . '%';

        if ($score >= 80) {
            if ($hasMissingSupportingData) {
                return "Kinerja biaya listrik usaha Anda dalam kondisi baik dengan rasio pengeluaran {$ratioText}, namun disarankan melengkapi seluruh data pendukung untuk analisis lebih mendalam.";
            }
            return "Kinerja biaya listrik usaha Anda dalam kondisi baik dan efisien dengan rasio pengeluaran {$ratioText} dari total pendapatan.";
        }

        if ($score >= 60) {
            if ($applianceCount === 0) {
                return "Efisiensi listrik Anda cukup baik dengan rasio pengeluaran {$ratioText}, tetapi data peralatan masih kosong sehingga rekomendasi belum optimal.";
            }
            return "Efisiensi listrik Anda dalam kategori perlu dipantau. Rasio biaya listrik sebesar {$ratioText} mulai menekan profitabilitas usaha.";
        }

        return "Efisiensi listrik Anda rendah (rasio pengeluaran {$ratioText}). Segera periksa peralatan berdaya tinggi dan kurangi durasi penggunaan yang tidak perlu.";
    }
}
