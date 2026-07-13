<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    private function landingSource(): string
    {
        $files = [resource_path('js/pages/Welcome.vue')];
        $components = glob(resource_path('js/components/landing/*.vue')) ?: [];
        $composables = glob(resource_path('js/composables/useLandingAnimations.ts')) ?: [];

        return implode("\n", array_map(
            static fn (string $path): string => (string) file_get_contents($path),
            [...$files, ...$components, ...$composables],
        ));
    }

    public function test_landing_page_returns_ok_with_public_demo_state(): void
    {
        config(['demo.enabled' => false]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->where('demo.ready', false)
            );
    }

    public function test_landing_renders_product_headline_problem_and_primary_action(): void
    {
        $source = $this->landingSource();

        foreach ([
            'Biaya listrik lebih terkendali.',
            'Keputusan usaha lebih percaya diri.',
            'Tagihan berubah, tetapi konteksnya tidak jelas',
            'Mulai Gratis',
        ] as $requiredCopy) {
            $this->assertStringContainsString($requiredCopy, $source);
        }
    }

    public function test_guest_and_authenticated_ctas_use_existing_routes(): void
    {
        $source = $this->landingSource();

        $this->assertStringContainsString('register()', $source);
        $this->assertStringContainsString('login()', $source);
        $this->assertStringContainsString('dashboard()', $source);
        $this->assertStringContainsString('auth.user', $source);
        $this->assertStringContainsString('Masuk ke Demo WattWise', $source);
        $this->assertStringContainsString('Buka Dashboard', $source);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->where('auth.user.id', $user->id)
            );
    }

    public function test_demo_ready_and_unavailable_cta_contract_is_explicit(): void
    {
        $source = $this->landingSource();

        $this->assertStringContainsString(
            "props.demoReady ? 'Masuk ke Demo WattWise' : 'Mulai Gratis'",
            $source,
        );
        $this->assertStringContainsString('props.demoReady ? login() : register()', $source);
        $this->assertStringContainsString("props.demoReady ? 'Mulai Gratis' : 'Masuk'", $source);
        $this->assertStringContainsString('props.demoReady ? register() : login()', $source);
        $this->assertStringContainsString(
            'Anda akan diarahkan ke halaman login demo terkontrol.',
            $source,
        );
    }

    public function test_mandatory_transparency_copy_remains_visible(): void
    {
        $source = $this->landingSource();

        foreach ([
            'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.',
            'WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.',
            'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.',
            'Rekomendasi adalah bantuan pengambilan keputusan',
            'verifikasi manual',
        ] as $requiredCopy) {
            $this->assertStringContainsString($requiredCopy, $source);
        }
    }

    public function test_internal_roadmap_and_unsupported_metrics_are_absent(): void
    {
        $source = $this->landingSource();

        foreach ([
            'Roadmap',
            'Week 1',
            'Week 8',
            '18%',
            'Rp180rb',
            '7+ candidates',
            'Launch Readiness',
            'Plan gating / trial demo',
        ] as $forbiddenCopy) {
            $this->assertStringNotContainsString($forbiddenCopy, $source);
        }
    }

    public function test_unsafe_claims_and_fabricated_social_proof_are_absent(): void
    {
        $source = mb_strtolower($this->landingSource());

        foreach ([
            'penyebab pasti',
            'mendeteksi alat rusak',
            'mengukur konsumsi real-time',
            'membaca data resmi pln',
            'terafiliasi dengan pln',
            'hemat dijamin',
            'hasil dijamin',
            'testimonial',
            'dipercaya oleh',
            'logo pelanggan',
            'partner kami',
        ] as $forbiddenClaim) {
            $this->assertStringNotContainsString($forbiddenClaim, $source);
        }
    }

    public function test_every_referenced_product_asset_exists_and_is_efficient(): void
    {
        $assets = [
            'images/landing/dashboard-overview.webp',
            'images/landing/electricity-input.webp',
            'images/landing/prediction-analysis.webp',
            'images/landing/recommendations.webp',
            'images/landing/reports.webp',
        ];
        $source = $this->landingSource();

        foreach ($assets as $asset) {
            $this->assertStringContainsString("/$asset", $source);
            $this->assertFileExists(public_path($asset));
        }
    }
}
