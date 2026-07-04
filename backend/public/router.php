<?php

declare(strict_types=1);

/**
 * Dev router: forward audio requests to Symfony for HTTP Range (seek/scrub).
 * Covers and other static assets are served as usual.
 */
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '');

if (preg_match('#^/media/audio/.+#', $uri) === 1) {
    $_SERVER['SCRIPT_FILENAME'] = __DIR__.'/index.php';
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';

    require __DIR__.'/index.php';

    return true;
}

return false;
