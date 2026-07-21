<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final class InferenceGatewayException extends \RuntimeException
{
    public function __construct(
        public readonly string $category,
        string $message = 'Inference gateway failed safely.',
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
