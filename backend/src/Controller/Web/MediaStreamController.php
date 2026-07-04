<?php

declare(strict_types=1);

namespace App\Controller\Web;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
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
    ) {
    }

    #[Route('/media/audio/{path}', name: 'media_audio_stream', requirements: ['path' => '.+'], methods: ['GET', 'HEAD'])]
    public function streamAudio(string $path): Response
    {
        if (str_contains($path, '..')) {
            throw new NotFoundHttpException();
        }

        $filePath = $this->projectDir.'/public/media/audio/'.$path;
        if (!is_file($filePath)) {
            throw new NotFoundHttpException();
        }

        $response = new BinaryFileResponse($filePath);
        $response->setPublic();
        $response->setAutoEtag();
        $response->setAutoLastModified();
        $response->headers->set('Accept-Ranges', 'bytes');
        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            basename($filePath),
        );

        return $response;
    }
}
