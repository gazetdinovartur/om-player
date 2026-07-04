<?php

declare(strict_types=1);

namespace App\Service;

use League\Flysystem\FilesystemOperator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Uid\Uuid;

final class CoverProcessor
{
    public function __construct(
        #[Autowire('@media.storage')]
        private readonly FilesystemOperator $mediaStorage,
    ) {
    }

    /**
     * @return array{coverPath: string, coverThumbPath: string}
     */
    public function storeCover(ExtractedCover $cover): array
    {
        $uuid = Uuid::v7()->toRfc4122();
        $extension = str_contains($cover->mimeType, 'png') ? 'png' : 'jpg';
        $coverRelative = sprintf('covers/%s.%s', $uuid, $extension);
        $thumbRelative = sprintf('covers/%s_thumb.%s', $uuid, $extension);

        $image = @imagecreatefromstring($cover->binary);
        if ($image === false) {
            $this->mediaStorage->write($coverRelative, $cover->binary);
            $this->mediaStorage->write($thumbRelative, $cover->binary);

            return ['coverPath' => $coverRelative, 'coverThumbPath' => $thumbRelative];
        }

        $width = imagesx($image);
        $height = imagesy($image);

        $coverBinary = $this->resizeToBinary($image, $width, $height, 800);
        $thumbBinary = $this->resizeToBinary($image, $width, $height, 256);
        imagedestroy($image);

        $this->mediaStorage->write($coverRelative, $coverBinary);
        $this->mediaStorage->write($thumbRelative, $thumbBinary);

        return ['coverPath' => $coverRelative, 'coverThumbPath' => $thumbRelative];
    }

    private function resizeToBinary(\GdImage $source, int $width, int $height, int $maxSize): string
    {
        $scale = min($maxSize / max($width, 1), $maxSize / max($height, 1), 1.0);
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $dest = imagecreatetruecolor($newWidth, $newHeight);
        imagecopyresampled($dest, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        ob_start();
        imagejpeg($dest, quality: 88);
        $binary = (string) ob_get_clean();
        imagedestroy($dest);

        return $binary;
    }
}
