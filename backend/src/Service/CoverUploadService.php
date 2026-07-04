<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Album;
use App\Entity\Playlist;
use League\Flysystem\FilesystemOperator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class CoverUploadService
{
    public function __construct(
        private readonly CoverProcessor $coverProcessor,
        private readonly UploadFileValidator $uploadFileValidator,
        #[Autowire('@media.storage')]
        private readonly FilesystemOperator $mediaStorage,
    ) {
    }

    public function applyToAlbum(Album $album, ?UploadedFile $file): void
    {
        if ($file === null || !$file->isValid()) {
            return;
        }

        $error = $this->uploadFileValidator->describeImageError($file);
        if ($error !== null) {
            throw new \InvalidArgumentException($error);
        }

        $paths = $this->coverProcessor->storeCover($this->toExtractedCover($file));
        $this->deletePaths([$album->getCoverPath(), $album->getCoverThumbPath()]);
        $album->setCoverPath($paths['coverPath']);
        $album->setCoverThumbPath($paths['coverThumbPath']);
    }

    public function applyToPlaylist(Playlist $playlist, ?UploadedFile $file): void
    {
        if ($file === null || !$file->isValid()) {
            return;
        }

        $error = $this->uploadFileValidator->describeImageError($file);
        if ($error !== null) {
            throw new \InvalidArgumentException($error);
        }

        $paths = $this->coverProcessor->storeCover($this->toExtractedCover($file));
        $this->deletePaths([$playlist->getCoverPath()]);
        $playlist->setCoverPath($paths['coverPath']);
    }

    private function toExtractedCover(UploadedFile $file): ExtractedCover
    {
        $binary = (string) file_get_contents($file->getPathname());
        $mimeType = $file->getMimeType() ?? 'image/jpeg';

        return new ExtractedCover($binary, $mimeType);
    }

    /** @param array<int, string|null> $paths */
    private function deletePaths(array $paths): void
    {
        foreach ($paths as $path) {
            if ($path === null || $path === '') {
                continue;
            }
            if ($this->mediaStorage->fileExists($path)) {
                $this->mediaStorage->delete($path);
            }
        }
    }
}
