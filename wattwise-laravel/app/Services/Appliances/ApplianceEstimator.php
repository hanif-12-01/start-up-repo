<?php

namespace App\Services\Appliances;

class ApplianceEstimator
{
    /**
     * Estimate monthly kWh usage of an appliance.
     * Formula: watt / 1000 * quantity * hours_per_day * days_per_month
     *
     * @param float|null $watt
     * @param int|null $quantity
     * @param float|null $hoursPerDay
     * @param int|null $daysPerMonth
     * @return float|null
     */
    public function estimateMonthlyKwh(?float $watt, ?int $quantity, ?float $hoursPerDay, ?int $daysPerMonth): ?float
    {
        if ($watt === null || $quantity === null || $hoursPerDay === null || $daysPerMonth === null) {
            return null;
        }

        return ($watt / 1000.0) * $quantity * $hoursPerDay * $daysPerMonth;
    }

    /**
     * Estimate monthly electricity cost of an appliance.
     * Formula: monthly_kwh * tariff_per_kwh
     *
     * @param float|null $monthlyKwh
     * @param float|null $tariffPerKwh
     * @return float|null
     */
    public function estimateMonthlyCost(?float $monthlyKwh, ?float $tariffPerKwh): ?float
    {
        if ($monthlyKwh === null || $tariffPerKwh === null) {
            return null;
        }

        return $monthlyKwh * $tariffPerKwh;
    }

    /**
     * Normalize appliance name for comparison and duplicate prevention.
     *
     * @param string $name
     * @return string
     */
    public function normalizeApplianceName(string $name): string
    {
        $normalized = trim(strtolower($name));
        return preg_replace('/\s+/', ' ', $normalized);
    }

    /**
     * Determine the primary reason for high energy contribution.
     *
     * @param float|null $watt
     * @param int|null $quantity
     * @param float|null $hoursPerDay
     * @return string
     */
    public function getRankingReason(?float $watt, ?int $quantity, ?float $hoursPerDay): string
    {
        if ($watt !== null && $watt >= 300) {
            return 'Daya besar';
        }
        if ($hoursPerDay !== null && $hoursPerDay >= 8) {
            return 'Jam pakai lama';
        }
        if ($quantity !== null && $quantity >= 3) {
            return 'Jumlah unit banyak';
        }
        return 'Daya besar';
    }

    /**
     * Estimate potential monthly cost saving if usage is reduced by 1 hour/day.
     * Formula: (watt / 1000) * quantity * 1 hour * days_per_month * tariff_per_kwh
     *
     * @param float|null $watt
     * @param int|null $quantity
     * @param int|null $daysPerMonth
     * @param float|null $tariffPerKwh
     * @return float|null
     */
    public function estimatePotentialSaving(?float $watt, ?int $quantity, ?int $daysPerMonth, ?float $tariffPerKwh): ?float
    {
        if ($watt === null || $quantity === null || $daysPerMonth === null || $tariffPerKwh === null) {
            return null;
        }

        $savingKwh = ($watt / 1000.0) * $quantity * 1.0 * $daysPerMonth;
        return $savingKwh * $tariffPerKwh;
    }
}
