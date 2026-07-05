<?php

declare(strict_types=1);

namespace App\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;

final class ReleaseDateExtension extends AbstractExtension
{
    /** @var array<int, string> */
    private const MONTHS = [
        1 => 'января',
        2 => 'февраля',
        3 => 'марта',
        4 => 'апреля',
        5 => 'мая',
        6 => 'июня',
        7 => 'июля',
        8 => 'августа',
        9 => 'сентября',
        10 => 'октября',
        11 => 'ноября',
        12 => 'декабря',
    ];

    public function getFilters(): array
    {
        return [
            new TwigFilter('release_date', $this->formatReleaseDate(...)),
        ];
    }

    public function formatReleaseDate(?\DateTimeInterface $date): string
    {
        if ($date === null) {
            return '';
        }

        $month = (int) $date->format('n');
        $day = (int) $date->format('j');
        $year = $date->format('Y');

        if ($month === 1 && $day === 1) {
            return $year;
        }

        $monthLabel = self::MONTHS[$month] ?? $date->format('m');

        return sprintf('%d %s %s', $day, $monthLabel, $year);
    }
}
