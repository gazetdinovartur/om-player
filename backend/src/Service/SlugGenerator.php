<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\String\Slugger\SluggerInterface;

final class SlugGenerator
{
    public function __construct(private readonly SluggerInterface $slugger)
    {
    }

    public function fromText(string $text): string
    {
        return strtolower((string) $this->slugger->slug($text)->replace('-', '-'));
    }
}
