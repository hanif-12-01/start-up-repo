<?php

namespace Tests\Feature;

use Tests\TestCase;

class NavigationRegressionTest extends TestCase
{
    /**
     * Test that the sidebar contains all expected navigation items and links.
     */
    public function test_sidebar_contains_expected_navigation_items(): void
    {
        $sidebarPath = resource_path('js/components/AppSidebar.vue');
        $this->assertFileExists($sidebarPath);

        $content = file_get_contents($sidebarPath);

        // Required titles
        $expectedTitles = [
            'Beranda',
            'Catat Listrik',
            'Catat Pendapatan',
            'Peralatan',
            'Rekomendasi',
            'Laporan',
            'Paket',
            'Onboarding',
            'Usaha/Properti',
            'Pengaturan',
        ];

        foreach ($expectedTitles as $title) {
            $this->assertStringContainsString(
                $title,
                $content,
                "Sidebar is missing expected navigation item title: $title"
            );
        }

        // Required href targets
        $expectedHrefs = [
            '/dashboard',
            '/electricity',
            '/revenue',
            '/appliances',
            '/recommendations',
            '/reports',
            '/plans',
            '/onboarding',
            '/businesses',
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
     * Test that no obvious old Next.js dashboard subpaths are used in AppSidebar.vue.
     */
    public function test_no_old_nextjs_paths_used_in_sidebar(): void
    {
        $sidebarPath = resource_path('js/components/AppSidebar.vue');
        $this->assertFileExists($sidebarPath);

        $content = file_get_contents($sidebarPath);

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
