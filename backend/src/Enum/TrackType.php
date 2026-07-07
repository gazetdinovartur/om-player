<?php

declare(strict_types=1);

namespace App\Enum;

enum TrackType: string
{
    case STUDIO = 'studio';
    case LIVE = 'live';
    case DEMO = 'demo';
    case REHEARSAL = 'rehearsal';

    public function label(): string
    {
        return match ($this) {
            self::STUDIO => 'Студийная',
            self::LIVE => 'Концертная',
            self::DEMO => 'Демо',
            self::REHEARSAL => 'Репетиция',
        };
    }
}
