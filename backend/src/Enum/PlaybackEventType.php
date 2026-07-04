<?php

declare(strict_types=1);

namespace App\Enum;

enum PlaybackEventType: string
{
    case PLAY = 'play';
    case PAUSE = 'pause';
    case COMPLETE = 'complete';
    case SEEK = 'seek';
    case SKIP = 'skip';
}
