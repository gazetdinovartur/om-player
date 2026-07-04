<?php

declare(strict_types=1);

namespace App\Controller\Web;

use App\Service\StreamTokenService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Serves audio with HTTP Range support (required for seeking in HTML5 audio).
 * PHP built-in server does not range static files; router.php forwards /media/audio here.
 */
final class MediaStreamController extends AbstractController
{
    public function __construct(
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
        private readonly StreamTokenService $streamTokens,
    ) {
    }

    #[Route('/media/audio/{path}', name: 'media_audio_stream', requirements: ['path' => '.+'], methods: ['GET', 'HEAD'])]
    public function streamAudio(string $path, Request $request): Response
    {
        if (str_contains($path, '..')) {
            throw new NotFoundHttpException();
        }

        $exp = $request->query->has('exp') ? (int) $request->query->get('exp') : null;
        $sig = $request->query->has('sig') ? (string) $request->query->get('sig') : null;

        if (!$this->streamTokens->verify($path, $exp, $sig)) {
            throw new AccessDeniedHttpException('Direct download is not allowed.');
        }

        $filePath = $this->projectDir.'/public/media/audio/'.$path;
        if (!is_file($filePath)) {
            throw new NotFoundHttpException();
        }

        $response = new BinaryFileResponse($filePath);
        $response->setPrivate();
        $response->setAutoEtag();
        $response->setAutoLastModified();
        $response->headers->set('Accept-Ranges', 'bytes');
        $response->headers->set('Content-Disposition', 'inline');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
