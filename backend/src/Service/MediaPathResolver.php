<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class MediaPathResolver
{
    public function __construct(
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
    ) {
    }

    /** audio/2025/uuid.m4a → 2025/uuid.m4a */
    public function audioRelativePath(string $storagePath): string
    {
        $storagePath = ltrim($storagePath, '/');

        return preg_replace('#^audio/#', '', $storagePath) ?? $storagePath;
    }

    public function audioAbsolutePath(string $storagePath): string
    {
        return $this->projectDir.'/public/media/audio/'.$this->audioRelativePath($storagePath);
    }

    public function audioExists(?string $storagePath): bool
    {
        if ($storagePath === null || $storagePath === '') {
            return false;
        }

        return is_file($this->audioAbsolutePath($storagePath));
    }
}
