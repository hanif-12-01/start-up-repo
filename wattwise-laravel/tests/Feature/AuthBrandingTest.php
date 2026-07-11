<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Guards that the auth/entry screens present WattWise AI branding instead of
 * the default Laravel starter-kit UI.
 *
 * Auth pages are client-rendered Inertia/Vue (no SSR), so the visible copy
 * lives in the .vue source and is asserted by scanning those files — the same
 * approach used by SafeWordingRegressionTest. HTTP-level checks confirm the
 * routes still resolve to the expected Inertia pages.
 */
class AuthBrandingTest extends TestCase
{
    use RefreshDatabase;

    private function source(string $relativePath): string
    {
        $path = resource_path($relativePath);
        $this->assertFileExists($path);

        $content = file_get_contents($path);
        $this->assertNotFalse($content);

        return $content;
    }

    public function test_login_screen_shows_wattwise_branding_and_copy(): void
    {
        $combined = $this->source('js/pages/auth/Login.vue')
            .$this->source('js/layouts/auth/AuthSimpleLayout.vue');

        $required = [
            'WattWise AI',
            'Masuk ke WattWise AI',
            'Listrik Lebih Cerdas, Cash Flow Lebih Terkendali.',
            'SaaS electricity cost intelligence untuk pemilik kos, pengelola properti kecil, dan UMKM padat energi',
            'Demo lokal: {{ demo.credentials.email }} / {{ demo.credentials.password }}',
            'Akun demo hanya untuk pengujian lokal atau staging terkontrol, bukan kredensial produksi.',
        ];

        foreach ($required as $needle) {
            $this->assertStringContainsString(
                $needle,
                $combined,
                "Login screen is missing required WattWise copy: [$needle]"
            );
        }
    }

    public function test_login_screen_does_not_show_default_laravel_starter_copy(): void
    {
        $login = $this->source('js/pages/auth/Login.vue');

        $forbidden = [
            'Log in to your account',
            'Enter your email and password below to log in',
        ];

        foreach ($forbidden as $needle) {
            $this->assertStringNotContainsString(
                $needle,
                $login,
                "Login screen still contains default Laravel starter copy: [$needle]"
            );
        }
    }

    public function test_app_logo_icon_is_wattwise_not_laravel_mark(): void
    {
        $icon = $this->source('js/components/AppLogoIcon.vue');

        // The original Laravel logo path signature must be gone.
        $this->assertStringNotContainsString('M17.2 5.633', $icon);
        $this->assertStringContainsString('WattWise AI lightning bolt mark', $icon);
    }

    public function test_welcome_page_is_wattwise_not_laravel_starter(): void
    {
        $welcome = $this->source('js/pages/Welcome.vue');

        $this->assertStringContainsString('WattWise AI', $welcome);

        $forbidden = [
            'Laravel Starter Kit',
            "Let's get started",
            'Laravel has an incredibly rich ecosystem',
            'Deploy now',
            'Laracasts',
        ];

        foreach ($forbidden as $needle) {
            $this->assertStringNotContainsString(
                $needle,
                $welcome,
                "Welcome page still contains Laravel starter content: [$needle]"
            );
        }
    }

    public function test_welcome_landing_page_contains_required_copy(): void
    {
        $welcome = $this->source('js/pages/Welcome.vue');

        $required = [
            'Listrik Lebih Cerdas',
            'Cash Flow Lebih Terkendali',
            'Coba Demo Dashboard',
            'Prediksi pemakaian listrik',
            'Estimasi tagihan listrik',
            'Hybrid AI Decision Support',
            'Demo lokal',
            'Kos Melati Purwokerto',
        ];

        foreach ($required as $needle) {
            $this->assertStringContainsString(
                $needle,
                $welcome,
                "Landing page is missing required copy: [$needle]"
            );
        }
    }

    public function test_welcome_landing_page_contains_required_disclaimers(): void
    {
        $welcome = $this->source('js/pages/Welcome.vue');

        $disclaimers = [
            'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.',
            'WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.',
            'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.',
            'Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.',
        ];

        foreach ($disclaimers as $disclaimer) {
            $this->assertStringContainsString(
                $disclaimer,
                $welcome,
                'Landing page is missing a required disclaimer.'
            );
        }
    }

    public function test_welcome_landing_page_avoids_forbidden_product_claims(): void
    {
        $welcome = $this->source('js/pages/Welcome.vue');

        $forbidden = [
            'penyebab pasti',
            'alat rusak',
            'sensor membaca',
            'terdeteksi real-time',
            'AI memastikan',
            'prediksi tagihan',
        ];

        foreach ($forbidden as $needle) {
            $this->assertStringNotContainsString(
                $needle,
                $welcome,
                "Landing page contains forbidden product claim: [$needle]"
            );
        }
    }

    public function test_app_name_default_is_wattwise_not_laravel(): void
    {
        $appTs = (string) file_get_contents(resource_path('js/app.ts'));

        // When VITE_APP_NAME is absent, the app name must fall back to
        // WattWise AI, never the Laravel default (which produced tab titles
        // like "Masuk ke WattWise AI - Laravel").
        $this->assertStringNotContainsString("|| 'Laravel'", $appTs);
        $this->assertStringContainsString("|| 'WattWise AI'", $appTs);
    }

    public function test_login_route_resolves_to_auth_login_inertia_page(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('auth/Login'));
    }

    public function test_root_route_resolves_to_welcome_inertia_page(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Welcome'));
    }

    public function test_login_inertia_prop_demo_is_disabled_when_demo_flag_is_false(): void
    {
        config(['demo.enabled' => false]);

        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/Login')
                ->where('demo.enabled', false)
                ->where('demo.ready', false)
                ->missing('demo.credentials')
            );
    }

    public function test_login_inertia_prop_demo_is_enabled_but_not_ready_when_demo_flag_is_true_without_seeding(): void
    {
        config(['demo.enabled' => true]);

        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/Login')
                ->where('demo.enabled', true)
                ->where('demo.ready', false)
                ->where('demo.message', 'Demo sementara tidak tersedia.')
                ->missing('demo.credentials')
            );
    }

    public function test_login_vue_conditionally_renders_banner_using_demo_enabled(): void
    {
        $login = $this->source('js/pages/auth/Login.vue');

        $this->assertStringContainsString('v-if="demo.enabled"', $login);
    }
}
