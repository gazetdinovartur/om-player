<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Album;
use App\Entity\Artist;
use App\Entity\Track;
use App\Enum\AlbumType;
use App\Enum\TrackType;
use App\Repository\AlbumRepository;
use Doctrine\ORM\EntityManagerInterface;
use League\Flysystem\FilesystemOperator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Uid\Uuid;

final class AlbumFolderImporter
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AudioMetadataExtractor $metadataExtractor,
        private readonly CatalogResolver $catalogResolver,
        private readonly CoverProcessor $coverProcessor,
        private readonly SlugGenerator $slugGenerator,
        private readonly AlbumRepository $albumRepository,
        #[Autowire('@media.storage')]
        private readonly FilesystemOperator $mediaStorage,
        #[Autowire('%env(JMO_DEFAULT_ARTIST_NAME)%')]
        private readonly string $defaultArtistName,
    ) {
    }

    /**
     * @return array{album: Album, tracks: list<Track>}
     */
    public function import(
        string $folderPath,
        string $albumTitle,
        ?string $artistName = null,
        ?\DateTimeImmutable $releasedAt = null,
        bool $publish = true,
        bool $purgeExisting = false,
    ): array {
        $folderPath = rtrim($folderPath, '/');
        if (!is_dir($folderPath)) {
            throw new \InvalidArgumentException(sprintf('Папка не найдена: %s', $folderPath));
        }

        if ($purgeExisting) {
            $this->purgeCatalog();
        }

        $artist = $this->catalogResolver->resolveArtist($artistName ?? $this->defaultArtistName);
        $album = $this->createAlbum($albumTitle, $artist, $releasedAt, $publish);
        $audioFiles = $this->collectAudioFiles($folderPath);
        $tracks = [];

        foreach ($audioFiles as $index => $filePath) {
            $filename = basename($filePath);
            $meta = $this->metadataExtractor->extract($filePath, $filename);
            $title = $this->resolveTrackTitle($meta, $filename);

            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION)) ?: 'm4a';
            $year = $releasedAt?->format('Y') ?? $meta->releasedAt?->format('Y') ?? date('Y');
            $audioRelative = sprintf('audio/%s/%s.%s', $year, Uuid::v7()->toRfc4122(), $extension);

            $stream = fopen($filePath, 'rb');
            if ($stream === false) {
                throw new \RuntimeException(sprintf('Не удалось прочитать файл: %s', $filePath));
            }
            $this->mediaStorage->writeStream($audioRelative, $stream);
            fclose($stream);

            $track = (new Track())
                ->setTitle($title)
                ->setSlug($this->catalogResolver->uniqueTrackSlug($title))
                ->setAlbum($album)
                ->setTrackNumber($index + 1)
                ->setDurationMs($meta->durationMs)
                ->setAudioPath($audioRelative)
                ->setAudioMimeType($meta->mimeType)
                ->setGenre($meta->genre)
                ->setType(TrackType::STUDIO)
                ->setPublished($publish);
            $album->addTrack($track);
            $tracks[] = $track;
        }

        $coverPath = $this->findCoverFile($folderPath, $albumTitle);
        if ($coverPath !== null && $album->getCoverPath() === null) {
            $coverBinary = (string) file_get_contents($coverPath);
            $mime = $this->guessImageMime($coverPath, $coverBinary);
            $this->catalogResolver->applyCoverToAlbum(
                $album,
                new ExtractedCover($coverBinary, $mime),
                $this->coverProcessor,
            );
        }

        $album->setType(AlbumType::STUDIO);
        $album->setSortOrder(1);
        $album->setPublished($publish);

        $this->em->flush();

        return ['album' => $album, 'tracks' => $tracks];
    }

    public function purgeCatalog(): void
    {
        $this->em->createQuery('DELETE FROM App\Entity\PlaybackEvent pe')->execute();
        $this->em->createQuery('DELETE FROM App\Entity\PlaylistItem pi')->execute();
        $this->em->createQuery('DELETE FROM App\Entity\Track t')->execute();
        $this->em->createQuery('DELETE FROM App\Entity\Album a')->execute();
        $this->em->createQuery('DELETE FROM App\Entity\Artist ar')->execute();
        $this->em->createQuery('DELETE FROM App\Entity\Playlist p')->execute();
        $this->em->flush();
        $this->em->clear();
        $this->purgeMediaStorage();
    }

    private function purgeMediaStorage(): void
    {
        foreach (['audio', 'covers'] as $dir) {
            try {
                foreach ($this->mediaStorage->listContents($dir, true) as $item) {
                    if ($item->isFile()) {
                        $this->mediaStorage->delete($item->path());
                    }
                }
            } catch (\Throwable) {
                // directory may be empty on first run
            }
        }
    }

    private function createAlbum(
        string $title,
        Artist $artist,
        ?\DateTimeImmutable $releasedAt,
        bool $published,
    ): Album {
        $album = (new Album())
            ->setTitle($title)
            ->setSlug($this->uniqueAlbumSlug($title))
            ->setArtist($artist)
            ->setType(AlbumType::STUDIO)
            ->setReleasedAt($releasedAt)
            ->setPublished($published)
            ->setSortOrder(1);

        $this->em->persist($album);

        return $album;
    }

    /** @return list<string> */
    private function collectAudioFiles(string $folderPath): array
    {
        $files = [];
        foreach (Finder::create()->files()->in($folderPath)->name('/\.(m4a|mp3|mp4|wav|flac)$/i') as $file) {
            $files[] = $file->getRealPath() ?: $file->getPathname();
        }

        usort($files, static fn (string $a, string $b): int => strnatcasecmp(basename($a), basename($b)));

        if ($files === []) {
            throw new \RuntimeException('В папке нет аудиофайлов.');
        }

        return $files;
    }

    private function uniqueAlbumSlug(string $title): string
    {
        $base = $this->slugGenerator->fromText($title);
        $slug = $base;
        $i = 2;
        while ($this->albumRepository->findOneBySlug($slug) !== null) {
            $slug = $base.'-'.$i;
            ++$i;
        }

        return $slug;
    }

    private function resolveTrackTitle(ExtractedAudioMetadata $meta, string $filename): string
    {
        $fromFile = trim(str_replace(['_', '-'], ' ', pathinfo($filename, PATHINFO_FILENAME)));
        $fromTags = trim($meta->title);

        if ($fromFile === '') {
            return $fromTags !== '' ? $fromTags : 'Untitled';
        }

        if ($fromTags === '' || $this->shouldPreferFilenameTitle($fromTags, $fromFile)) {
            return $fromFile;
        }

        return $fromTags;
    }

    private function shouldPreferFilenameTitle(string $tagTitle, string $fileTitle): bool
    {
        if (preg_match('/[\p{Cyrillic}]/u', $fileTitle) && !preg_match('/[\p{Cyrillic}]/u', $tagTitle)) {
            return true;
        }

        return mb_strlen($tagTitle) <= 3;
    }

    private function findCoverFile(string $folderPath, string $albumTitle): ?string
    {
        $candidates = [];
        foreach (Finder::create()->files()->in($folderPath)->name('/\.(jpe?g|png|webp)$/i') as $file) {
            $candidates[] = $file->getRealPath() ?: $file->getPathname();
        }

        if ($candidates === []) {
            return null;
        }

        $albumSlug = $this->slugGenerator->fromText($albumTitle);
        foreach ($candidates as $path) {
            $base = $this->slugGenerator->fromText(pathinfo($path, PATHINFO_FILENAME));
            if ($base === $albumSlug) {
                return $path;
            }
        }

        return $candidates[0];
    }

    private function guessImageMime(string $path, string $binary): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if ($ext === 'png') {
            return 'image/png';
        }
        if ($ext === 'webp') {
            return 'image/webp';
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->buffer($binary);

        return is_string($detected) && $detected !== '' ? $detected : 'image/jpeg';
    }
}
