<?php

namespace Tests\Unit;

use App\Services\WhatsApp\PhoneNormalizer;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PhoneNormalizerTest extends TestCase
{
    private PhoneNormalizer $normalizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->normalizer = new PhoneNormalizer;
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function validNumbers(): array
    {
        return [
            'local zero prefix' => ['081234567890', '+6281234567890'],
            'country code' => ['6281234567890', '+6281234567890'],
            'plus country code' => ['+6281234567890', '+6281234567890'],
            'with spaces and hyphens' => ['+62 812-3456-7890', '+6281234567890'],
            'local with spaces' => ['0812 3456 7890', '+6281234567890'],
        ];
    }

    #[DataProvider('validNumbers')]
    public function test_it_normalizes_valid_indonesian_numbers(string $input, string $expected): void
    {
        $this->assertSame($expected, $this->normalizer->normalize($input));
    }

    /**
     * @return array<string, array{0: string|null}>
     */
    public static function invalidNumbers(): array
    {
        return [
            'null' => [null],
            'empty' => [''],
            'alphabetic' => ['not-a-number'],
            'letters mixed' => ['0812ABC7890'],
            'foreign country code' => ['+1234567890'],
            'foreign uk' => ['+447911123456'],
            'too short' => ['0812'],
            'too short with code' => ['62812'],
            'too long' => ['0812345678901234'],
            'no recognizable prefix' => ['71234567890'],
        ];
    }

    #[DataProvider('invalidNumbers')]
    public function test_it_rejects_invalid_numbers(?string $input): void
    {
        $this->assertNull($this->normalizer->normalize($input));
    }

    public function test_it_masks_a_normalized_number(): void
    {
        $this->assertSame('+62812*****890', $this->normalizer->mask('+6281234567890'));
    }

    public function test_fingerprint_is_deterministic_keyed_and_non_plaintext(): void
    {
        $number = '+6281234567890';
        $a = $this->normalizer->fingerprint($number);
        $b = $this->normalizer->fingerprint($number);

        // Deterministic within the deployment.
        $this->assertSame($a, $b);
        $this->assertSame(64, strlen($a));

        // Never contains the plaintext number.
        $this->assertStringNotContainsString('6281234567890', $a);

        // Keyed HMAC, not an unkeyed SHA-256 rainbow-table target.
        $this->assertNotSame(hash('sha256', $number), $a);
        $this->assertSame(hash_hmac('sha256', $number, (string) config('app.key')), $a);
    }
}
