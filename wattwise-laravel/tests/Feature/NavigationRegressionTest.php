<?php

namespace Tests\Feature;

use Tests\TestCase;

class NavigationRegressionTest extends TestCase
{
    private function sidebarContent(): string
    {
        $sidebarPath = resource_path('js/components/AppSidebar.vue');
        $this->assertFileExists($sidebarPath);

        return file_get_contents($sidebarPath);
    }

    /**
     * Test that the sidebar contains all expected grouped sections and item titles.
     */
    public function test_sidebar_contains_expected_group_labels_and_items(): void
    {
        $content = $this->sidebarContent();

        // Grouped section labels
        $expectedGroups = [
            'Catat Data',
            'Analisis',
            'Properti & Peralatan',
            'Akun',
        ];

        foreach ($expectedGroups as $group) {
            $this->assertStringContainsString(
                $group,
                $content,
                "Sidebar is missing expected group label: $group"
            );
        }

        // Item titles present in the new structure
        $expectedTitles = [
            'Beranda',
            'Data Listrik',
            'Pendapatan & Listrik',
            'Prediksi & Estimasi',
            'Deteksi Anomali',
            'Rekomendasi Hemat',
            'Usaha / Properti',
            'Peralatan',
            'Laporan',
            'Paket & Langganan',
            'Pengaturan',
            'Onboarding',
        ];

        foreach ($expectedTitles as $title) {
            $this->assertStringContainsString(
                $title,
                $content,
                "Sidebar is missing expected navigation item title: $title"
            );
        }

        // Href targets that must still resolve to existing routes
        $expectedHrefs = [
            '/dashboard',
            '/onboarding',
            '/electricity',
            '/revenue',
            '/predictions',
            '/anomalies',
            '/recommendations',
            '/businesses',
            '/appliances',
            '/reports',
            '/plans',
            '/settings',
        ];

        foreach ($expectedHrefs as $href) {
            $this->assertStringContainsString(
                $href,
                $content,
                "Sidebar is missing expected navigation path target: $href"
            );
        }
    }

    /**
     * Test that Anomaly is linked now that its route exists.
     */
    public function test_anomaly_is_linked_to_a_route(): void
    {
        $content = $this->sidebarContent();

        $this->assertStringContainsString(
            '/anomalies',
            $content,
            "Sidebar is missing expected navigation path target: /anomalies"
        );
    }

    /**
     * Test that onboarding visibility is conditional (gated by needsOnboarding),
     * not permanently pinned into the primary navigation.
     */
    public function test_onboarding_navigation_is_conditional(): void
    {
        $content = $this->sidebarContent();

        $this->assertStringContainsString(
            'needsOnboarding',
            $content,
            'Onboarding navigation should be gated by needsOnboarding.'
        );
    }

    /**
     * Test that the Laravel starter-kit repository/documentation footer links are removed.
     */
    public function test_starter_kit_footer_links_are_removed(): void
    {
        $content = $this->sidebarContent();

        $forbidden = [
            'github.com/laravel',
            'laravel.com/docs',
            'NavFooter',
            'Repository',
            'Documentation',
        ];

        foreach ($forbidden as $needle) {
            $this->assertStringNotContainsString(
                $needle,
                $content,
                "Sidebar still references starter-kit footer content: $needle"
            );
        }
    }

    /**
     * Test that no obvious old Next.js dashboard subpaths are used in AppSidebar.vue.
     */
    public function test_no_old_nextjs_paths_used_in_sidebar(): void
    {
        $content = $this->sidebarContent();

        // Subpaths like /dashboard/appliances or similar that were used in the Next.js routes
        $forbiddenHrefs = [
            '/dashboard/appliances',
            '/dashboard/recommendations',
            '/dashboard/reports',
            '/dashboard/plans',
            '/dashboard/electricity',
            '/dashboard/revenue',
        ];

        foreach ($forbiddenHrefs as $forbidden) {
            $this->assertStringNotContainsString(
                $forbidden,
                $content,
                "Sidebar contains outdated Next.js nested path: $forbidden"
            );
        }
    }
}
