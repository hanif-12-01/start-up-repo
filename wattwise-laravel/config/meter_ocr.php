<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Meter OCR Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains settings for the WattWise Meter OCR feature.
    | Processing is handled locally on the client-side browser to ensure
    | privacy and security of raw photographs.
    |
    */

    'enabled' => env('METER_OCR_ENABLED', false),

    'driver' => env('METER_OCR_DRIVER', 'browser'),

    'minimum_confidence' => env('METER_OCR_MIN_CONFIDENCE', 75),

    'maximum_file_size_kb' => env('METER_OCR_MAX_FILE_SIZE_KB', 8192),

    'maximum_image_dimension' => env('METER_OCR_MAX_IMAGE_DIMENSION', 2400),

    'processing_timeout_seconds' => env('METER_OCR_PROCESSING_TIMEOUT_SECONDS', 30),
];
