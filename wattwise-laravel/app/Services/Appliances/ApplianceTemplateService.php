<?php

namespace App\Services\Appliances;

use App\Models\Appliance;
use App\Models\Business;
use App\Support\Appliances\ApplianceTemplates;

class ApplianceTemplateService
{
    public function __construct(
        private readonly ApplianceEstimator $estimator,
    ) {}

    /**
     * Get the template items for a given business type.
     *
     * Falls back to OTHER for unrecognised types.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getTemplateForBusinessType(string $businessType): array
    {
        return ApplianceTemplates::forSegment($businessType);
    }

    /**
     * Get the human-readable label for a business type segment.
     */
    public function getSegmentLabel(string $businessType): string
    {
        return ApplianceTemplates::SEGMENT_LABELS[$businessType]
            ?? ApplianceTemplates::SEGMENT_LABELS['OTHER'];
    }

    /**
     * Apply the matching template to a business.
     *
     * Creates appliance rows for each template item that does not already
     * exist (by normalised name comparison). Existing appliances with a
     * matching name — or one of the template item's aliases — are skipped.
     *
     * @return array{created_count: int, skipped_count: int, created_names: string[], skipped_names: string[]}
     */
    public function applyTemplateToBusiness(Business $business): array
    {
        $template = $this->getTemplateForBusinessType($business->business_type ?? 'OTHER');

        // Build a set of normalised names from existing appliances
        $existingNames = $business->appliances()
            ->pluck('name')
            ->map(fn (string $n): string => $this->estimator->normalizeApplianceName($n))
            ->toArray();

        $createdNames = [];
        $skippedNames = [];

        foreach ($template as $item) {
            if ($this->isDuplicate($item, $existingNames)) {
                $skippedNames[] = $item['name'];
                continue;
            }

            Appliance::create([
                'business_id' => $business->id,
                'name' => $item['name'],
                'category' => $item['category'],
                'watt' => $item['default_watt'],
                'quantity' => $item['default_quantity'],
                'hours_per_day' => $item['default_hours_per_day'],
                'days_per_month' => $item['default_days_per_month'],
                'source' => 'TEMPLATE',
                'confidence' => $item['confidence'],
                'notes' => $item['usage_note'],
            ]);

            $createdNames[] = $item['name'];

            // Add the newly created name to the existing set so that
            // later template items with the same normalised name are
            // also skipped within a single apply call.
            $existingNames[] = $this->estimator->normalizeApplianceName($item['name']);
        }

        return [
            'created_count' => count($createdNames),
            'skipped_count' => count($skippedNames),
            'created_names' => $createdNames,
            'skipped_names' => $skippedNames,
        ];
    }

    /**
     * Check whether a template item collides with any existing name.
     *
     * Compares the template item's normalised name **and** all of its
     * normalised aliases against the set of existing normalised names.
     *
     * @param array<string, mixed> $item
     * @param string[] $existingNormalisedNames
     */
    private function isDuplicate(array $item, array $existingNormalisedNames): bool
    {
        $candidateNames = array_merge(
            [$item['name']],
            $item['aliases'] ?? [],
        );

        foreach ($candidateNames as $candidate) {
            $normalised = $this->estimator->normalizeApplianceName($candidate);
            if (in_array($normalised, $existingNormalisedNames, true)) {
                return true;
            }
        }

        return false;
    }
}
