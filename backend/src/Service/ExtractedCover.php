<?php

declare(strict_types=1);

namespace App\Service;

final readonly class ExtractedCover
{
    public function __construct(
        public string $binary,
        public string $mimeType,
    ) {
    }
}
