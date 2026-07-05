<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Album;
use App\Entity\Artist;
use App\Entity\Track;
use Doctrine\ORM\EntityManagerInterface;
use League\Flysystem\FilesystemOperator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Uid\Uuid;

final class TrackUploadHandler
{
    private readonly string $stagingDir;

    public function __construct(
        #[Autowire('@media.storage')]
        private readonly FilesystemOperator $mediaStorage,
        private readonly AudioMetadataExtractor $metadataExtractor,
        private readonly CatalogResolver $catalogResolver,
        private readonly CoverProcessor $coverProcessor,
        private readonly EntityManagerInterface $em,
        private readonly UploadFileValidator $uploadFileValidator,
        #[Autowire('%kernel.project_dir%/var/upload-staging')]
        string $stagingDir,
    ) {
        $this->stagingDir = $stagingDir;
        if (!is_dir($this->stagingDir)) {
            mkdir($this->stagingDir, 0775, true);
        }
    }

    /** @return array{token: string, preview: array<string, mixed>} */
    public function stageUpload(UploadedFile $file): array
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException(
                $this->uploadFileValidator->describeError($file) ?? 'Файл не был загружен.',
            );
        }

        return $this->stageValidUpload($file, $file->getClientOriginalName());
    }

    /**
     * @param UploadedFile[] $files
     *
     * @return list<array{token: string, preview: array<string, mixed>, fileName: string}|array{fileName: string, error: string}>
     */
    public function stageBatchUpload(array $files): array
    {
        $items = [];
        foreach ($files as $file) {
            if (!$file instanceof UploadedFile) {
                continue;
            }

            $fileName = $file->getClientOriginalName();
            if (!$file->isValid()) {
                $items[] = [
                    'fileName' => $fileName,
                    'error' => $this->uploadFileValidator->describeError($file) ?? 'Файл не был загружен.',
                ];
                continue;
            }

            try {
                $staged = $this->stageValidUpload($file, $fileName);
                $items[] = [
                    'token' => $staged['token'],
                    'preview' => $staged['preview'],
                    'fileName' => $fileName,
                ];
            } catch (\Throwable $e) {
                $items[] = [
                    'fileName' => $fileName,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $items;
    }

    /**
     * @param list<array{token: string, title?: mixed, trackNumber?: mixed, year?: mixed}> $items
     * @param array{title?: mixed, artist?: mixed, album?: mixed, trackNumber?: mixed, year?: mixed, publish?: mixed, publish_album?: mixed} $defaults
     *
     * @return Track[]
     */
    public function confirmBatchStagedUpload(array $items, array $defaults): array
    {
        $sharedArtist = trim((string) ($defaults['artist'] ?? ''));
        $sharedAlbum = trim((string) ($defaults['album'] ?? ''));
        if ($sharedAlbum === '') {
            throw new \InvalidArgumentException('Укажите название альбома — все треки пакета сохраняются в один альбом.');
        }

        $artist = $this->catalogResolver->resolveArtist($sharedArtist !== '' ? $sharedArtist : null);
        $year = isset($defaults['year']) && $defaults['year'] !== '' ? (int) $defaults['year'] : null;
        $releasedAt = $year !== null ? new \DateTimeImmutable(sprintf('%04d-01-01', $year)) : null;
        $albumMeta = new ExtractedAudioMetadata(
            title: $sharedAlbum,
            artist: $sharedArtist !== '' ? $sharedArtist : null,
            album: $sharedAlbum,
            trackNumber: null,
            year: $year,
            releasedAt: $releasedAt,
            durationMs: 0,
            genre: null,
            embeddedCover: null,
            mimeType: 'audio/mpeg',
        );
        $album = $this->catalogResolver->resolveAlbum($sharedAlbum, $artist, $albumMeta);
        $this->em->flush();

        $tokens = [];
        $tracks = [];
        foreach ($items as $item) {
            $token = (string) ($item['token'] ?? '');
            if ($token === '') {
                throw new \InvalidArgumentException('Отсутствует token для одного из файлов.');
            }

            $form = $defaults;
            $form['artist'] = $sharedArtist;
            $form['album'] = $sharedAlbum;
            foreach (['title', 'trackNumber', 'year'] as $field) {
                if (array_key_exists($field, $item) && $item[$field] !== '' && $item[$field] !== null) {
                    $form[$field] = $item[$field];
                }
            }

            $tracks[] = $this->confirmStagedUpload(
                $token,
                $form,
                flush: false,
                resolvedArtist: $artist,
                resolvedAlbum: $album,
                cleanupStaging: false,
            );
            $tokens[] = $token;
        }

        $this->em->flush();

        foreach ($tokens as $token) {
            $this->cleanupStaging($token);
        }

        return $tracks;
    }

    /** @return array{token: string, preview: array<string, mixed>} */
    private function stageValidUpload(UploadedFile $file, string $originalName): array
    {
        $token = bin2hex(random_bytes(16));
        $extension = $this->resolveExtension($file);
        $stagedPath = $this->stagingDir.'/'.$token.'.'.$extension;
        $file->move(dirname($stagedPath), basename($stagedPath));

        if (!is_readable($stagedPath)) {
            throw new \RuntimeException('Не удалось сохранить загруженный файл во временную папку.');
        }

        $meta = $this->metadataExtractor->extract($stagedPath, $originalName);
        if ($meta->embeddedCover !== null) {
            file_put_contents(
                $this->stagingDir.'/'.$token.'.cover.json',
                json_encode([
                    'binary' => base64_encode($meta->embeddedCover->binary),
                    'mime' => $meta->embeddedCover->mimeType,
                ], JSON_THROW_ON_ERROR),
            );
        }

        file_put_contents($this->stagingDir.'/'.$token.'.json', json_encode([
            'originalName' => $originalName,
            'extension' => $extension,
        ], JSON_THROW_ON_ERROR));

        return [
            'token' => $token,
            'preview' => $this->previewFromMetadata($meta),
        ];
    }

    /**
     * @param array{title?: string, artist?: string, album?: string, trackNumber?: string, year?: string, publish?: bool, publish_album?: bool} $form
     */
    public function confirmStagedUpload(
        string $token,
        array $form,
        bool $flush = true,
        ?Artist $resolvedArtist = null,
        ?Album $resolvedAlbum = null,
        bool $cleanupStaging = true,
    ): Track {
        $staged = $this->resolveStagedFile($token);
        $metaJson = json_decode((string) file_get_contents($staged['json']), true, 512, JSON_THROW_ON_ERROR);
        $meta = $this->metadataExtractor->extract($staged['path'], $metaJson['originalName']);
        $meta = $this->applyFormOverrides($meta, $form, $staged['cover']);

        $year = $meta->releasedAt?->format('Y') ?? date('Y');
        $audioRelative = sprintf('audio/%s/%s.%s', $year, Uuid::v7()->toRfc4122(), $metaJson['extension']);

        $stream = fopen($staged['path'], 'rb');
        if ($stream === false) {
            throw new \RuntimeException('Cannot read staged file.');
        }
        $this->mediaStorage->writeStream($audioRelative, $stream);
        fclose($stream);

        $publish = !empty($form['publish']);
        $track = $this->catalogResolver->buildTrackFromMetadata(
            $meta,
            $audioRelative,
            $publish,
            $resolvedArtist,
            $resolvedAlbum,
        );

        if ($meta->embeddedCover !== null) {
            if ($track->getAlbum() !== null) {
                $this->catalogResolver->applyCoverToAlbum($track->getAlbum(), $meta->embeddedCover, $this->coverProcessor);
            } else {
                $paths = $this->coverProcessor->storeCover($meta->embeddedCover);
                $track->setCoverPath($paths['coverPath']);
                $track->setCoverThumbPath($paths['coverThumbPath']);
            }
        }

        if (!empty($form['publish_album']) && $track->getAlbum() !== null) {
            $track->getAlbum()->setPublished(true);
        } elseif ($publish && $track->getAlbum() !== null && !$track->getAlbum()->isPublished()) {
            $track->getAlbum()->setPublished(true);
        }

        $this->em->persist($track);
        if ($flush) {
            $this->em->flush();
        }
        if ($cleanupStaging) {
            $this->cleanupStaging($token);
        }

        return $track;
    }

    public function handleUpload(UploadedFile $file, bool $publish = false): Track
    {
        $staged = $this->stageUpload($file);

        return $this->confirmStagedUpload($staged['token'], ['publish' => $publish, 'publish_album' => true]);
    }

    public function flush(): void
    {
        $this->em->flush();
    }

    /** @return array<string, mixed> */
    private function previewFromMetadata(ExtractedAudioMetadata $meta): array
    {
        $coverDataUri = null;
        if ($meta->embeddedCover !== null) {
            $coverDataUri = sprintf(
                'data:%s;base64,%s',
                $meta->embeddedCover->mimeType,
                base64_encode($meta->embeddedCover->binary),
            );
        }

        return [
            'title' => $meta->title,
            'artist' => $meta->artist,
            'album' => $meta->album,
            'trackNumber' => $meta->trackNumber,
            'year' => $meta->year ?? ($meta->releasedAt?->format('Y')),
            'durationMs' => $meta->durationMs,
            'durationLabel' => $this->formatDuration($meta->durationMs),
            'genre' => $meta->genre,
            'hasCover' => $meta->embeddedCover !== null,
            'coverDataUri' => $coverDataUri,
        ];
    }

    private function loadStagedCover(string $coverPath): ?ExtractedCover
    {
        $contents = (string) file_get_contents($coverPath);

        if (str_ends_with($coverPath, '.cover.json')) {
            $raw = json_decode($contents, true);
            if (!is_array($raw) || !isset($raw['binary'], $raw['mime'])) {
                return null;
            }
            $binary = base64_decode((string) $raw['binary'], true);

            return $binary !== false ? new ExtractedCover($binary, (string) $raw['mime']) : null;
        }

        $raw = unserialize($contents, ['allowed_classes' => false]);
        if (is_array($raw) && isset($raw['binary'], $raw['mime'])) {
            return new ExtractedCover((string) $raw['binary'], (string) $raw['mime']);
        }

        return null;
    }

    private function formatDuration(int $durationMs): string
    {
        $totalSeconds = max(0, (int) round($durationMs / 1000));
        $minutes = intdiv($totalSeconds, 60);
        $seconds = $totalSeconds % 60;

        return sprintf('%d:%02d', $minutes, $seconds);
    }

    /**
     * @return array{path: string, json: string, cover: ?string}
     */
    private function resolveStagedFile(string $token): array
    {
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            throw new \InvalidArgumentException('Invalid upload token.');
        }

        $matches = glob($this->stagingDir.'/'.$token.'.*') ?: [];
        $audioPath = null;
        $jsonPath = $this->stagingDir.'/'.$token.'.json';
        $coverPath = $this->stagingDir.'/'.$token.'.cover.json';
        if (!is_readable($coverPath)) {
            $legacyCover = $this->stagingDir.'/'.$token.'.cover';
            if (is_readable($legacyCover)) {
                $coverPath = $legacyCover;
            } else {
                $coverPath = null;
            }
        }

        foreach ($matches as $path) {
            if (str_ends_with($path, '.json') && !str_ends_with($path, '.cover.json')) {
                continue;
            }
            if (str_ends_with($path, '.cover.json') || str_ends_with($path, '.cover')) {
                continue;
            }
            $audioPath = $path;
        }

        if ($audioPath === null || !is_readable($jsonPath)) {
            throw new \RuntimeException('Сессия загрузки истекла. Загрузите файл снова.');
        }

        return [
            'path' => $audioPath,
            'json' => $jsonPath,
            'cover' => $coverPath !== null && is_readable($coverPath) ? $coverPath : null,
        ];
    }

    /** @param array<string, mixed> $form */
    private function applyFormOverrides(ExtractedAudioMetadata $meta, array $form, ?string $coverPath): ExtractedAudioMetadata
    {
        $title = trim((string) ($form['title'] ?? '')) ?: $meta->title;
        $artist = trim((string) ($form['artist'] ?? '')) ?: $meta->artist;
        $album = trim((string) ($form['album'] ?? '')) ?: $meta->album;
        $trackNumber = isset($form['trackNumber']) && $form['trackNumber'] !== ''
            ? (int) $form['trackNumber']
            : $meta->trackNumber;
        $year = isset($form['year']) && $form['year'] !== '' ? (int) $form['year'] : $meta->year;
        $releasedAt = $year !== null ? new \DateTimeImmutable(sprintf('%04d-01-01', $year)) : $meta->releasedAt;

        $embeddedCover = $meta->embeddedCover;
        if ($embeddedCover === null && $coverPath !== null) {
            $embeddedCover = $this->loadStagedCover($coverPath);
        }

        return new ExtractedAudioMetadata(
            $title,
            $artist,
            $album,
            $trackNumber,
            $year,
            $releasedAt,
            $meta->durationMs,
            $meta->genre,
            $embeddedCover,
            $meta->mimeType,
        );
    }

    private function cleanupStaging(string $token): void
    {
        foreach (glob($this->stagingDir.'/'.$token.'.*') ?: [] as $path) {
            @unlink($path);
        }
    }

    private function resolveExtension(UploadedFile $file): string
    {
        $clientExt = strtolower(pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));
        if (in_array($clientExt, ['mp3', 'mpeg', 'mpga', 'm4a', 'mp4'], true)) {
            return $clientExt === 'mpeg' || $clientExt === 'mpga' ? 'mp3' : $clientExt;
        }
        if ($clientExt !== '' && preg_match('/^[a-z0-9]{2,5}$/', $clientExt)) {
            return $clientExt;
        }

        $pathname = $file->getPathname();
        if ($pathname !== '' && is_readable($pathname)) {
            return $file->guessExtension() ?: 'mp3';
        }

        return 'mp3';
    }
}
