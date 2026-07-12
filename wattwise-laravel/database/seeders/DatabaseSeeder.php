<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Sandbox billing plans are safe to seed in every environment: they are
        // simulation-only and contain no secrets.
        $this->call(BillingPlanSeeder::class);

        // Call demo seeder strictly in dev environment for safety
        if (app()->environment('local', 'testing')) {
            $this->call(WattWiseDemoSeeder::class);
        }
    }
}
