#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$public = $root.'/backend/public';
$iconsDir = $public.'/icons';
if (!is_dir($iconsDir)) {
    mkdir($iconsDir, 0775, true);
}

$accent = [74, 124, 89];
$bg = [247, 244, 239];

$targets = [
    192 => $iconsDir.'/icon-192.png',
    512 => $iconsDir.'/icon-512.png',
    180 => $public.'/apple-touch-icon.png',
    32 => $public.'/favicon-32.png',
];

foreach ($targets as $size => $path) {
    $img = imagecreatetruecolor($size, $size);
    if ($img === false) {
        fwrite(STDERR, "GD failed\n");
        exit(1);
    }
    $bgColor = imagecolorallocate($img, $bg[0], $bg[1], $bg[2]);
    $accentColor = imagecolorallocate($img, $accent[0], $accent[1], $accent[2]);
    imagefilledrectangle($img, 0, 0, $size, $size, $bgColor);

    $cx = (int) ($size * 0.5);
    $cy = (int) ($size * 0.5);
    $r = (int) ($size * 0.38);
    imagefilledellipse($img, $cx, $cy, $r, $r, $accentColor);
    $inner = (int) ($size * 0.12);
    imagefilledellipse($img, $cx, $cy, $inner, $inner, $bgColor);

    imagepng($img, $path);
    echo "Wrote {$path}\n";
}
