<?php

namespace Tests\Feature;

use Tests\TestCase;

class SafeWordingRegressionTest extends TestCase
{
    /**
     * Test that forbidden unsafe phrases do not appear in relevant PHP/Vue files.
     */
    public function test_forbidden_unsafe_phrases_do_not_appear(): void
    {
        $forbiddenWording = [
            'penyebab pasti',
            'alat rusak',
            'sensor membaca',
            'terdeteksi real-time',
            'AI memastikan',
            'prediksi tagihan',
            // Step 2 copy corrections — old phrasing must not reappear
            'memengaruhi profitabilitas',
            'profit margin bersih',
            'alat penyedot energi utama',
            'akurasi maksimal',
        ];

        $filesToScan = [
            resource_path('js/pages/Dashboard.vue'),
            resource_path('js/pages/Electricity/Index.vue'),
            resource_path('js/pages/Revenue/Index.vue'),
            resource_path('js/pages/Appliances/Index.vue'),
            resource_path('js/pages/Recommendations/Index.vue'),
            resource_path('js/pages/Reports/Index.vue'),
            resource_path('js/pages/Plans/Index.vue'),
            resource_path('js/pages/Predictions/Index.vue'),
            resource_path('js/components/PredictionChart.vue'),
            resource_path('js/pages/Onboarding.vue'),
            resource_path('js/components/AppSidebar.vue'),
            app_path('Services/Recommendations/RecommendationService.php'),
            app_path('Services/Reports/MonthlyReportService.php'),
        ];

        foreach ($filesToScan as $filePath) {
            if (!file_exists($filePath)) {
                continue;
            }

            $content = file_get_contents($filePath);

            foreach ($forbiddenWording as $word) {
                $this->assertStringNotContainsString(
                    $word,
                    $content,
                    "Forbidden phrase [$word] found in file: " . basename($filePath)
                );
            }
        }
    }

    /**
     * Test that 'konsumsi aktual' is only allowed inside the required disclaimer sentence.
     */
    public function test_konsumsi_aktual_only_appears_within_disclaimer(): void
    {
        $filesToScan = [
            resource_path('js/pages/Dashboard.vue'),
            resource_path('js/pages/Electricity/Index.vue'),
            resource_path('js/pages/Revenue/Index.vue'),
            resource_path('js/pages/Appliances/Index.vue'),
            resource_path('js/pages/Recommendations/Index.vue'),
            resource_path('js/pages/Reports/Index.vue'),
            resource_path('js/pages/Plans/Index.vue'),
            resource_path('js/pages/Predictions/Index.vue'),
            resource_path('js/components/PredictionChart.vue'),
            resource_path('js/pages/Onboarding.vue'),
            resource_path('js/components/AppSidebar.vue'),
            app_path('Services/Recommendations/RecommendationService.php'),
            app_path('Services/Reports/MonthlyReportService.php'),
        ];

        $disclaimerSentence1 = 'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.';
        $disclaimerSentence2 = 'Perhitungan ini berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.';

        foreach ($filesToScan as $filePath) {
            if (!file_exists($filePath)) {
                continue;
            }

            $content = file_get_contents($filePath);

            // Temporarily strip the valid disclaimer sentences
            $cleanedContent = str_replace([$disclaimerSentence1, $disclaimerSentence2], '', $content);

            // Assert that "konsumsi aktual" does not appear in the cleaned content
            $this->assertStringNotContainsString(
                'konsumsi aktual',
                $cleanedContent,
                "The phrase 'konsumsi aktual' is used outside of the permitted disclaimers in: " . basename($filePath)
            );
        }
    }

    /**
     * Test that required disclaimers appear in MonthlyReportService.php
     */
    public function test_required_disclaimers_exist_in_service(): void
    {
        $servicePath = app_path('Services/Reports/MonthlyReportService.php');
        $this->assertFileExists($servicePath);

        $content = file_get_contents($servicePath);

        $disclaimers = [
            'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.',
            'WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.',
            'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.',
            'Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.',
        ];

        foreach ($disclaimers as $disclaimer) {
            $this->assertStringContainsString($disclaimer, $content);
        }
    }

    /**
     * Test that Plans page includes pilot/validation wording.
     */
    public function test_plans_page_includes_pilot_validation_wording(): void
    {
        $plansPagePath = resource_path('js/pages/Plans/Index.vue');
        $this->assertFileExists($plansPagePath);

        $content = file_get_contents($plansPagePath);

        $this->assertStringContainsString('pilot dan validasi pasar', $content);
    }

    /**
     * Test that the Step 2 safe-copy corrections are applied with the new phrasing.
     */
    public function test_step2_copy_corrections_are_applied(): void
    {
        $recommendationService = file_get_contents(app_path('Services/Recommendations/RecommendationService.php'));
        $dashboard = file_get_contents(resource_path('js/pages/Dashboard.vue'));

        $this->assertStringContainsString('sisa pendapatan setelah listrik', $recommendationService);
        $this->assertStringContainsString('kandidat alat dengan estimasi konsumsi terbesar', $recommendationService);
        $this->assertStringContainsString('hasil yang lebih relevan berdasarkan kelengkapan data', $recommendationService);
        $this->assertStringContainsString('memengaruhi porsi pendapatan', $dashboard);
    }

    /**
     * Test that the Predictions page uses safe wording and the required disclaimer.
     */
    public function test_predictions_page_uses_safe_wording_and_disclaimer(): void
    {
        $path = resource_path('js/pages/Predictions/Index.vue');
        $this->assertFileExists($path);

        $content = file_get_contents($path);

        $this->assertStringContainsString('Prediksi pemakaian listrik', $content);
        $this->assertStringContainsString('Estimasi tagihan listrik', $content);
        $this->assertStringContainsString('Berdasarkan data input', $content);
        $this->assertStringContainsString('Perlu Verifikasi Manual', $content);
        $this->assertStringContainsString(
            'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.',
            $content
        );
    }

    /**
     * Test that Recommendations Index.vue imports the Activity icon to avoid crash.
     */
    public function test_recommendations_page_imports_activity_icon(): void
    {
        $path = resource_path('js/pages/Recommendations/Index.vue');
        $this->assertFileExists($path);

        $content = file_get_contents($path);
        $this->assertStringContainsString('Activity', $content);
    }
}
