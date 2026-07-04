<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class StreamTokenService
{
    public function __construct(
        #[Autowire('%env(APP_SECRET)%')]
        private readonly string $secret,
        #[Autowire('%env(bool:MEDIA_STREAM_PROTECT)%')]
        private readonly bool $protectEnabled = true,
        #[Autowire('%env(int:MEDIA_STREAM_TTL)%')]
        private readonly int $ttlSeconds = 14400,
    ) {
    }

    public function isProtectionEnabled(): bool
    {
        return $this->protectEnabled;
    }

    /** Storage path, e.g. audio/2025/uuid.m4a → /media/audio/2025/uuid.m4a?exp=&sig= */
    public function signUrl(string $storagePath): string
    {
        $streamPath = $this->toStreamPath($storagePath);
        $url = '/media/audio/'.$streamPath;

        if (!$this->protectEnabled) {
            return $url;
        }

        $exp = time() + max(300, $this->ttlSeconds);
        $sig = $this->computeSignature($streamPath, $exp);

        return $url.'?exp='.$exp.'&sig='.$sig;
    }

    /** Route {path} param, e.g. 2025/uuid.m4a */
    public function verify(string $streamPath, ?int $exp, ?string $sig): bool
    {
        if (!$this->protectEnabled) {
            return true;
        }

        if ($exp === null || $sig === null || $exp < time()) {
            return false;
        }

        $streamPath = ltrim($streamPath, '/');
        if (str_contains($streamPath, '..')) {
            return false;
        }

        return hash_equals($this->computeSignature($streamPath, $exp), $sig);
    }

    public function expiresAtIso(int $exp): string
    {
        return (new \DateTimeImmutable('@'.$exp))->format(\DateTimeInterface::ATOM);
    }

    private function toStreamPath(string $storagePath): string
    {
        $storagePath = ltrim($storagePath, '/');

        return preg_replace('#^audio/#', '', $storagePath) ?? $storagePath;
    }

    private function computeSignature(string $streamPath, int $exp): string
    {
        return hash_hmac('sha256', $streamPath.'|'.$exp, $this->secret);
    }
}
