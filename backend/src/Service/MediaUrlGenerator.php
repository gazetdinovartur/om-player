<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RequestStack;

final class MediaUrlGenerator
{
    public function __construct(
        private readonly StreamTokenService $streamTokens,
        private readonly RequestStack $requestStack,
        #[Autowire('%env(default::MEDIA_BASE_URL)%')]
        private readonly ?string $mediaBaseUrl = '',
        #[Autowire('%env(default::DEFAULT_URI)%')]
        private readonly ?string $defaultUri = '',
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

        return $this->absolute($relative);
    }

    public function streamUrl(?string $audioStoragePath): ?string
    {
        if ($audioStoragePath === null || $audioStoragePath === '') {
            return null;
        }

        $signed = $this->streamTokens->signUrl($audioStoragePath);

        return $this->absolute($signed);
    }

    private function absolute(string $path): string
    {
        if ($this->mediaBaseUrl !== null && $this->mediaBaseUrl !== '') {
            return rtrim($this->mediaBaseUrl, '/').$path;
        }

        $request = $this->requestStack->getCurrentRequest();
        if ($request !== null) {
            return $request->getSchemeAndHttpHost().$path;
        }

        if ($this->defaultUri !== null && $this->defaultUri !== '') {
            return rtrim($this->defaultUri, '/').$path;
        }

        return $path;
    }
}
