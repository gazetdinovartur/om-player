<?php

declare(strict_types=1);

namespace App\Api;

use App\Entity\Album;
use App\Entity\Track;
use App\Service\MediaUrlGenerator;

final class TrackApiSerializer
{
    public function __construct(private readonly MediaUrlGenerator $mediaUrlGenerator)
    {
    }

    /** @return array<string, mixed> */
    public function summary(Track $track): array
    {
        $album = $track->getAlbum();

        return [
            'slug' => $track->getSlug(),
            'title' => $track->getTitle(),
            'artistName' => $track->getArtistName(),
            'albumSlug' => $album?->getSlug(),
            'albumTitle' => $album?->getTitle(),
            'albumReleasedAt' => $album?->getReleasedAt()?->format('Y-m-d'),
            'durationMs' => $track->getDurationMs(),
            'type' => $track->getType()->value,
            'coverUrl' => $this->mediaUrlGenerator->url($track->getEffectiveCoverPath()),
            'coverThumbUrl' => $this->mediaUrlGenerator->url($track->getEffectiveCoverThumbPath()),
        ];
    }

    /** @return array<string, mixed> */
    public function detail(Track $track): array
    {
        $album = $track->getAlbum();
        $data = $this->summary($track);
        $data['trackNumber'] = $track->getTrackNumber();
        $data['description'] = $track->getDescription();
        $data['credits'] = $track->getCredits();
        $data['lyrics'] = $track->getLyrics();
        $data['genre'] = $track->getGenre();
        $data['album'] = $album !== null ? [
            'slug' => $album->getSlug(),
            'title' => $album->getTitle(),
            'releasedAt' => $album->getReleasedAt()?->format('Y-m-d'),
            'coverUrl' => $this->mediaUrlGenerator->url($album->getCoverPath()),
        ] : null;
        $data['stream'] = [
            'url' => $this->mediaUrlGenerator->url($track->getAudioPath()),
            'mimeType' => $track->getAudioMimeType(),
            'expiresAt' => null,
        ];
        $data['publishedAt'] = $track->getCreatedAt()->format(\DateTimeInterface::ATOM);

        return $data;
    }

    /** @return array{url: ?string, mimeType: string, expiresAt: null} */
    public function stream(Track $track): array
    {
        return [
            'url' => $this->mediaUrlGenerator->url($track->getAudioPath()),
            'mimeType' => $track->getAudioMimeType(),
            'expiresAt' => null,
        ];
    }

    /** @return array<string, mixed> */
    public function trackWithStream(Track $track): array
    {
        return array_merge($this->summary($track), [
            'trackNumber' => $track->getTrackNumber(),
            'stream' => $this->stream($track),
        ]);
    }

    /** @return array<string, mixed> */
    public function albumSummary(Album $album): array
    {
        return [
            'slug' => $album->getSlug(),
            'title' => $album->getTitle(),
            'artistName' => $album->getArtist()->getName(),
            'type' => $album->getType()->value,
            'typeLabel' => $album->getType()->label(),
            'releasedAt' => $album->getReleasedAt()?->format('Y-m-d'),
            'coverUrl' => $this->mediaUrlGenerator->url($album->getCoverPath()),
            'coverThumbUrl' => $this->mediaUrlGenerator->url($album->getCoverThumbPath()),
            'trackCount' => $album->getTrackCount(),
            'totalDurationMs' => $album->getTotalDurationMs(),
        ];
    }
}
