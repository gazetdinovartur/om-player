<?php

declare(strict_types=1);

namespace App\Enum;

enum TrackType: string
{
    case STUDIO = 'studio';
    case LIVE = 'live';
    case DEMO = 'demo';
    case REHEARSAL = 'rehearsal';
}
