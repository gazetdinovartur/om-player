<?php

declare(strict_types=1);

namespace App\Service;

final readonly class ExtractedAudioMetadata
{
    public function __construct(
        public string $title,
        public ?string $artist,
        public ?string $album,
        public ?int $trackNumber,
        public ?int $year,
        public ?\DateTimeImmutable $releasedAt,
        public int $durationMs,
        public ?string $genre,
        public ?ExtractedCover $embeddedCover,
        public string $mimeType,
    ) {
    }
}
