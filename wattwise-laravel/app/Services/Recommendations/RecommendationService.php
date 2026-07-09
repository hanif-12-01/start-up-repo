<?php

namespace App\Services\Recommendations;

use App\Models\Business;
use App\Services\Appliances\ApplianceEstimator;
use App\Services\Electricity\ElectricityCalculator;

class RecommendationService
{
    public function __construct(
        private readonly ApplianceEstimator $applianceEstimator,
        private readonly ElectricityCalculator $electricityCalculator
    ) {}

    /**
     * Get all recommendations for a given business, sorted by priority.
     *
     * @param Business $business
     * @return array
     */
    public function getRecommendationsForBusiness(Business $business): array
    {
        $recommendations = [];

        // 1. Fetch latest entries
        $latestElectricityEntry = $business->electricityEntries()
            ->orderBy('period_month', 'desc')
            ->first();

        $latestRevenueEntry = $business->revenueEntries()
            ->orderBy('period_month', 'desc')
            ->first();

        // 2. Resolve tariff
        $profile = $business->electricityProfile;
        $tariff = null;
        if ($profile && $profile->tariff_per_kwh !== null) {
            $tariff = (float) $profile->tariff_per_kwh;
        } elseif ($latestElectricityEntry && $latestElectricityEntry->tariff_per_kwh !== null) {
            $tariff = (float) $latestElectricityEntry->tariff_per_kwh;
        }
        $hasTariff = $tariff !== null && $tariff > 0;

        // Rule 1: Missing Electricity Data
        if (!$latestElectricityEntry) {
            $recommendations[] = [
                'type' => 'MISSING_ELECTRICITY_DATA',
                'priority' => 'HIGH',
                'title' => 'Catat data listrik bulan ini',
                'description' => 'Data listrik diperlukan agar WattWise bisa membuat ringkasan dan rekomendasi yang lebih relevan.',
                'action' => 'Catat pemakaian atau biaya listrik bulanan.',
                'reason' => 'Sistem mendeteksi belum adanya catatan tagihan listrik terbaru untuk bisnis Anda.',
                'estimated_saving_idr' => null,
                'badges' => ['Perlu Verifikasi Manual'],
            ];
        }

        // Rule 2: Missing Revenue Data
        if (!$latestRevenueEntry) {
            $recommendations[] = [
                'type' => 'MISSING_REVENUE_DATA',
                'priority' => 'MEDIUM',
                'title' => 'Tambahkan data pendapatan',
                'description' => 'Data pendapatan membantu menghitung rasio listrik terhadap pemasukan.',
                'action' => 'Isi pendapatan bulanan jika tersedia.',
                'reason' => 'Rasio beban tagihan terhadap omzet tidak dapat dievaluasi tanpa data pendapatan bulanan.',
                'estimated_saving_idr' => null,
                'badges' => ['Perlu Verifikasi Manual'],
            ];
        }

        // Rule 3: Missing Tariff Data
        if (!$hasTariff) {
            $recommendations[] = [
                'type' => 'MISSING_TARIFF_DATA',
                'priority' => 'MEDIUM',
                'title' => 'Lengkapi tarif rata-rata per kWh',
                'description' => 'Estimasi biaya peralatan akan lebih mudah dihitung jika tarif rata-rata tersedia.',
                'action' => 'Isi tarif rata-rata per kWh dari data listrik Anda.',
                'reason' => 'Konversi daya alat (kWh) ke biaya rupiah memerlukan besaran tarif per kWh yang valid.',
                'estimated_saving_idr' => null,
                'badges' => ['Perlu Verifikasi Manual'],
            ];
        }

        // Rule 4: High Electricity/Revenue Ratio
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
        $revenueAmountIdr = $latestRevenueEntry ? (float) $latestRevenueEntry->revenue_amount_idr : null;

        if ($electricityCostIdr !== null && $revenueAmountIdr !== null && $revenueAmountIdr > 0) {
            $ratio = ($electricityCostIdr / $revenueAmountIdr) * 100.0;
            if ($ratio > 10.0) {
                $priority = 'LOW';
                if ($ratio > 20.0) {
                    $priority = 'HIGH';
                } elseif ($ratio > 15.0) {
                    $priority = 'MEDIUM';
                }

                $ratioText = round($ratio, 1) . '%';
                $recommendations[] = [
                    'type' => 'HIGH_ELECTRICITY_REVENUE_RATIO',
                    'priority' => $priority,
                    'title' => 'Rasio listrik terhadap pendapatan perlu dipantau',
                    'description' => "Biaya listrik bulan ini sekitar {$ratioText} dari pendapatan. Ini belum memperhitungkan biaya operasional lain.",
                    'action' => 'Cek alat dengan kontribusi estimasi terbesar dan jam pakai paling lama.',
                    'reason' => "Pengeluaran biaya listrik sebesar {$ratioText} dari total pemasukan berisiko menekan profit margin bersih usaha Anda.",
                    'estimated_saving_idr' => null,
                    'badges' => ['Berdasarkan data input'],
                ];
            }
        }

        // Rule 5: Missing Appliance Data
        $appliances = $business->appliances;
        $applianceCount = $appliances->count();
        if ($applianceCount === 0) {
            $recommendations[] = [
                'type' => 'MISSING_APPLIANCE_DATA',
                'priority' => 'MEDIUM',
                'title' => 'Tambahkan daftar peralatan',
                'description' => 'Daftar peralatan membantu memperkirakan kandidat alat yang perlu dicek.',
                'action' => 'Gunakan template peralatan atau tambah manual.',
                'reason' => 'Sistem tidak dapat mengidentifikasi kandidat alat penyedot energi utama jika daftar alat kosong.',
                'estimated_saving_idr' => null,
                'badges' => ['Perlu Verifikasi Manual'],
            ];
        }

        // Rule 6: High Contribution Appliance
        if ($applianceCount > 0) {
            $totalKwh = 0.0;
            $maxKwh = 0.0;
            $topAppliance = null;

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
                        $topAppliance = $appliance;
                    }
                }
            }

            if ($totalKwh > 0.0 && $topAppliance) {
                $pct = ($maxKwh / $totalKwh) * 100.0;
                if ($pct > 30.0) {
                    $priority = $pct > 50.0 ? 'HIGH' : 'MEDIUM';
                    $pctText = round($pct, 1) . '%';
                    $recommendations[] = [
                        'type' => 'HIGH_CONTRIBUTION_APPLIANCE',
                        'priority' => $priority,
                        'title' => "Cek penggunaan {$topAppliance->name}",
                        'description' => "Berdasarkan estimasi daya dan jam pakai, alat ini menjadi salah satu kandidat kontribusi listrik terbesar yaitu sekitar {$pctText} dari total penggunaan alat.",
                        'action' => 'Periksa jam pakai, jumlah unit, dan daya alat.',
                        'reason' => "Kombinasi daya Watt dan jam pakai harian membuat {$topAppliance->name} mendominasi total konsumsi listrik.",
                        'estimated_saving_idr' => null,
                        'badges' => ['Estimasi Simulatif', 'Berdasarkan data input'],
                    ];
                }
            }
        }

        // Rule 7: Long Runtime Appliance
        if ($applianceCount > 0) {
            foreach ($appliances as $appliance) {
                $hours = $appliance->hours_per_day !== null ? (float) $appliance->hours_per_day : 0.0;
                if ($hours >= 8.0) {
                    $priority = $hours >= 12.0 ? 'MEDIUM' : 'LOW';
                    $recommendations[] = [
                        'type' => 'LONG_RUNTIME_APPLIANCE',
                        'priority' => $priority,
                        'title' => "Kurangi jam pakai {$appliance->name}",
                        'description' => "Peralatan {$appliance->name} terindikasi aktif selama {$hours} jam per hari. Durasi penggunaan yang lama berpotensi meningkatkan biaya secara signifikan.",
                        'action' => 'Coba kurangi 1 jam per hari jika memungkinkan.',
                        'reason' => 'Mengurangi durasi penggunaan harian adalah cara efektif menekan akumulasi kWh bulanan tanpa penggantian alat.',
                        'estimated_saving_idr' => null,
                        'badges' => ['Estimasi Simulatif', 'Berdasarkan data input'],
                    ];
                }
            }
        }

        // Rule 8: Many Units Appliance
        if ($applianceCount > 0) {
            foreach ($appliances as $appliance) {
                $qty = $appliance->quantity;
                if ($qty >= 5) {
                    $priority = $qty >= 10 ? 'MEDIUM' : 'LOW';
                    $recommendations[] = [
                        'type' => 'MANY_UNITS_APPLIANCE',
                        'priority' => $priority,
                        'title' => "Optimalkan jumlah unit {$appliance->name}",
                        'description' => "Terdapat {$qty} unit {$appliance->name} yang terdaftar. Akumulasi daya dari banyak unit sejenis dapat dengan cepat meningkatkan tagihan listrik.",
                        'action' => 'Matikan unit yang tidak aktif dan hindari posisi standby.',
                        'reason' => 'Pengoperasian beberapa unit sejenis secara simultan melipatgandakan beban total listrik bisnis.',
                        'estimated_saving_idr' => null,
                        'badges' => ['Berdasarkan data input'],
                    ];
                }
            }
        }

        // Rule 9: Saving Scenario
        if ($hasTariff && $applianceCount > 0) {
            foreach ($appliances as $appliance) {
                $watt = $appliance->watt !== null ? (float) $appliance->watt : null;
                $qty = $appliance->quantity;
                $hours = $appliance->hours_per_day !== null ? (float) $appliance->hours_per_day : null;
                $days = $appliance->days_per_month;

                if ($hours >= 1.0 && $watt > 0 && $qty > 0 && $days > 0) {
                    $saving = $this->applianceEstimator->estimatePotentialSaving($watt, $qty, $days, $tariff);
                    if ($saving > 0.0) {
                        $savingText = 'Rp' . number_format($saving, 0, ',', '.');
                        $recommendations[] = [
                            'type' => 'SAVING_SCENARIO_REDUCE_USAGE',
                            'priority' => 'MEDIUM',
                            'title' => "Skenario hemat penggunaan {$appliance->name}",
                            'description' => "Jika dikurangi 1 jam/hari, potensi hemat simulatif sekitar {$savingText}/bulan.",
                            'action' => 'Kurangi durasi pakai alat selama 1 jam dari durasi harian biasanya.',
                            'reason' => "Pengurangan waktu operasional harian sebanyak 1 jam secara berkala menghasilkan penghematan biaya secara langsung.",
                            'estimated_saving_idr' => $saving,
                            'badges' => ['Estimasi Simulatif', 'Berdasarkan data input'],
                        ];
                    }
                }
            }
        }

        // Rule 10: Data Completeness Reminder
        if (!$latestElectricityEntry || !$latestRevenueEntry || !$hasTariff || $applianceCount === 0) {
            $recommendations[] = [
                'type' => 'DATA_COMPLETENESS_REMINDER',
                'priority' => 'LOW',
                'title' => 'Lengkapi profil dan data berkala',
                'description' => 'WattWise membutuhkan data tagihan listrik, pendapatan, dan peralatan secara lengkap untuk memberikan rekomendasi dengan akurasi maksimal.',
                'action' => 'Lengkapi seluruh data input pada menu yang tersedia.',
                'reason' => 'Rekomendasi yang lebih spesifik membutuhkan kelengkapan data operasional berkala Anda.',
                'estimated_saving_idr' => null,
                'badges' => ['Perlu Verifikasi Manual'],
            ];
        }

        // 3. Sort recommendations by priority (HIGH -> MEDIUM -> LOW)
        usort($recommendations, function ($a, $b) {
            $priorityWeight = [
                'HIGH' => 3,
                'MEDIUM' => 2,
                'LOW' => 1,
            ];
            $weightA = $priorityWeight[$a['priority']] ?? 0;
            $weightB = $priorityWeight[$b['priority']] ?? 0;

            return $weightB <=> $weightA;
        });

        return $recommendations;
    }

    /**
     * Get top recommendations for a given business up to a certain limit.
     *
     * @param Business $business
     * @param int $limit
     * @return array
     */
    public function getTopRecommendationsForBusiness(Business $business, int $limit = 3): array
    {
        $recommendations = $this->getRecommendationsForBusiness($business);
        return array_slice($recommendations, 0, $limit);
    }
}
