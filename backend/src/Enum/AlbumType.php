<?php

declare(strict_types=1);

namespace App\Enum;

enum AlbumType: string
{
    case STUDIO = 'studio';
    case EP = 'ep';
    case SINGLE = 'single';
    case LIVE = 'live';
    case COMPILATION = 'compilation';

    public function label(): string
    {
        return match ($this) {
            self::STUDIO => 'Альбом',
            self::EP => 'EP',
            self::SINGLE => 'Сингл',
            self::LIVE => 'Live',
            self::COMPILATION => 'Сборник',
        };
    }
}
