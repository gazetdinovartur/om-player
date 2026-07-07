<?php

declare(strict_types=1);

namespace App\Service;

use getID3;

final class AudioMetadataExtractor
{
    public function extract(string $filePath, string $fallbackFilename): ExtractedAudioMetadata
    {
        $getId3 = new getID3();
        $getId3->option_md5_data = false;
        $getId3->option_md5_data_source = false;
        $getId3->encoding = 'UTF-8';

        $info = $getId3->analyze($filePath);

        $title = $this->firstNonEmpty([
            $info['tags']['id3v2']['title'][0] ?? null,
            $info['tags']['id3v1']['title'][0] ?? null,
            $info['tags']['quicktime']['title'][0] ?? null,
        ]) ?? $this->titleFromFilename($fallbackFilename);

        $artist = $this->firstNonEmpty([
            $info['tags']['id3v2']['artist'][0] ?? null,
            $info['tags']['id3v1']['artist'][0] ?? null,
            $info['tags']['quicktime']['artist'][0] ?? null,
        ]);

        $album = $this->firstNonEmpty([
            $info['tags']['id3v2']['album'][0] ?? null,
            $info['tags']['id3v1']['album'][0] ?? null,
        ]);

        $trackNumber = null;
        $trackRaw = $this->firstNonEmpty([
            $info['tags']['id3v2']['track_number'][0] ?? null,
            $info['tags']['id3v1']['track'][0] ?? null,
        ]);
        if ($trackRaw !== null && preg_match('/(\d+)/', (string) $trackRaw, $m)) {
            $trackNumber = (int) $m[1];
        }

        $year = null;
        $releasedAt = null;
        $dateRaw = $this->firstNonEmpty([
            $info['tags']['id3v2']['year'][0] ?? null,
            $info['tags']['id3v1']['year'][0] ?? null,
            $info['tags']['id3v2']['date'][0] ?? null,
        ]);
        if ($dateRaw !== null) {
            if (preg_match('/(\d{4})/', (string) $dateRaw, $m)) {
                $year = (int) $m[1];
                $releasedAt = new \DateTimeImmutable(sprintf('%d-01-01', $year));
            }
            $parsed = \DateTimeImmutable::createFromFormat('Y-m-d', substr((string) $dateRaw, 0, 10));
            if ($parsed instanceof \DateTimeImmutable) {
                $releasedAt = $parsed;
                $year = (int) $parsed->format('Y');
            }
        }

        $genre = $this->firstNonEmpty([
            $info['tags']['id3v2']['genre'][0] ?? null,
            $info['tags']['id3v1']['genre'][0] ?? null,
        ]);

        $lyrics = $this->extractLyrics($info);

        $composer = $this->firstNonEmpty([
            $info['tags']['id3v2']['composer'][0] ?? null,
            $info['tags']['id3v1']['composer'][0] ?? null,
        ]);

        $albumArtist = $this->firstNonEmpty([
            $info['tags']['id3v2']['band'][0] ?? null,
            $info['tags']['id3v2']['albumartist'][0] ?? null,
            $info['tags']['id3v2']['album_artist'][0] ?? null,
        ]);

        $label = $this->firstNonEmpty([
            $info['tags']['id3v2']['publisher'][0] ?? null,
            $info['tags']['id3v1']['publisher'][0] ?? null,
            $info['tags']['id3v2']['label'][0] ?? null,
        ]);

        $durationMs = (int) round((float) ($info['playtime_seconds'] ?? 0) * 1000);

        $embeddedCover = null;
        if (!empty($info['comments']['picture'][0]['data'])) {
            $pic = $info['comments']['picture'][0];
            $embeddedCover = new ExtractedCover(
                $pic['data'],
                (string) ($pic['image_mime'] ?? 'image/jpeg'),
            );
        } elseif (!empty($info['id3v2']['APIC'][0]['data'])) {
            $pic = $info['id3v2']['APIC'][0];
            $embeddedCover = new ExtractedCover(
                $pic['data'],
                (string) ($pic['mime'] ?? 'image/jpeg'),
            );
        }

        $mimeType = (string) ($info['mime_type'] ?? 'audio/mpeg');

        return new ExtractedAudioMetadata(
            title: trim($title),
            artist: $artist !== null ? trim($artist) : null,
            album: $album !== null ? trim($album) : null,
            trackNumber: $trackNumber,
            year: $year,
            releasedAt: $releasedAt,
            durationMs: $durationMs,
            genre: $genre !== null ? trim($genre) : null,
            embeddedCover: $embeddedCover,
            mimeType: $mimeType,
            lyrics: $lyrics !== null ? trim($lyrics) : null,
            composer: $composer !== null ? trim($composer) : null,
            albumArtist: $albumArtist !== null ? trim($albumArtist) : null,
            label: $label !== null ? trim($label) : null,
        );
    }

    /** @param array<string, mixed> $info */
    private function extractLyrics(array $info): ?string
    {
        $candidates = [];

        foreach (['unsynchronised_lyric', 'lyrics', 'unsynchronised lyrics'] as $key) {
            $value = $info['tags']['id3v2'][$key][0] ?? null;
            if (is_string($value) && trim($value) !== '') {
                $candidates[] = $value;
            }
        }

        if (!empty($info['id3v2']['USLT']) && is_array($info['id3v2']['USLT'])) {
            foreach ($info['id3v2']['USLT'] as $frame) {
                if (is_array($frame) && !empty($frame['data']) && is_string($frame['data'])) {
                    $candidates[] = $frame['data'];
                }
            }
        }

        foreach ($candidates as $text) {
            $trimmed = trim($text);
            if ($trimmed !== '') {
                return $trimmed;
            }
        }

        return null;
    }

    /** @param list<string|null> $values */
    private function firstNonEmpty(array $values): ?string
    {
        foreach ($values as $value) {
            if ($value !== null && trim((string) $value) !== '') {
                return (string) $value;
            }
        }

        return null;
    }

    private function titleFromFilename(string $filename): string
    {
        $base = pathinfo($filename, PATHINFO_FILENAME);
        $base = str_replace(['_', '-'], ' ', $base);

        return trim($base) !== '' ? trim($base) : 'Untitled';
    }
}
