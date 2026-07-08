<?php

namespace App\Services\Electricity;

class ElectricityCalculator
{
    /**
     * Calculate electricity usage from meter readings.
     *
     * @param mixed $meterStart
     * @param mixed $meterEnd
     * @return float|null
     * @throws \InvalidArgumentException
     */
    public function calculateUsageFromMeter(mixed $meterStart, mixed $meterEnd): ?float
    {
        if ($meterStart === null || $meterEnd === null) {
            return null;
        }

        $start = (float) $meterStart;
        $end = (float) $meterEnd;

        if ($end < $start) {
            throw new \InvalidArgumentException('Meter end cannot be less than meter start.');
        }

        return $end - $start;
    }

    /**
     * Estimate the bill amount from usage and tariff rate.
     *
     * @param mixed $usageKwh
     * @param mixed $tariffPerKwh
     * @return float|null
     */
    public function estimateBillAmount(mixed $usageKwh, mixed $tariffPerKwh): ?float
    {
        if ($usageKwh === null || $tariffPerKwh === null) {
            return null;
        }

        return (float) $usageKwh * (float) $tariffPerKwh;
    }

    /**
     * Calculate the ratio of electricity cost to total revenue as a percentage.
     *
     * @param mixed $electricityCost
     * @param mixed $revenueAmount
     * @return float|null
     */
    public function calculateElectricityRevenueRatio(mixed $electricityCost, mixed $revenueAmount): ?float
    {
        if ($electricityCost === null || $revenueAmount === null) {
            return null;
        }

        $revenue = (float) $revenueAmount;
        if ($revenue <= 0) {
            return null;
        }

        return ((float) $electricityCost / $revenue) * 100.0;
    }

    /**
     * Calculate remaining revenue after subtracting electricity cost.
     *
     * @param mixed $revenueAmount
     * @param mixed $electricityCost
     * @return float|null
     */
    public function calculateRemainingRevenueAfterElectricity(mixed $revenueAmount, mixed $electricityCost): ?float
    {
        if ($revenueAmount === null || $electricityCost === null) {
            return null;
        }

        return (float) $revenueAmount - (float) $electricityCost;
    }
}
