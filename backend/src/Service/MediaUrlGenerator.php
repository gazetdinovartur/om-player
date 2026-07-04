<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class MediaUrlGenerator
{
    public function __construct(
        #[Autowire('%env(default::MEDIA_BASE_URL)%')]
        private readonly ?string $mediaBaseUrl = '',
    ) {
    }

    public function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $relative = '/media/'.ltrim($path, '/');

        if ($this->mediaBaseUrl !== null && $this->mediaBaseUrl !== '') {
            return rtrim($this->mediaBaseUrl, '/').$relative;
        }

        return $relative;
    }
}
