<?php

declare(strict_types=1);

namespace App\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;

final class DurationExtension extends AbstractExtension
{
    public function getFilters(): array
    {
        return [
            new TwigFilter('duration_ms', $this->formatDurationMs(...)),
        ];
    }

    public function formatDurationMs(int $durationMs): string
    {
        $totalSeconds = max(0, (int) round($durationMs / 1000));
        if ($totalSeconds === 0) {
            return '';
        }

        $hours = intdiv($totalSeconds, 3600);
        $minutes = intdiv($totalSeconds % 3600, 60);

        if ($hours > 0) {
            return $minutes > 0
                ? sprintf('%d ч %d мин', $hours, $minutes)
                : sprintf('%d ч', $hours);
        }

        if ($minutes > 0) {
            return sprintf('%d мин', $minutes);
        }

        return sprintf('%d сек', $totalSeconds);
    }
}
