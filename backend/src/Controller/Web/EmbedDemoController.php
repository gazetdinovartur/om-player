<?php

declare(strict_types=1);

namespace App\Controller\Web;

use App\Repository\TrackRepository;
use App\Service\MediaPathResolver;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class EmbedDemoController extends AbstractController
{
    #[Route('/demo/embed', name: 'web_embed_demo')]
    public function embed(TrackRepository $trackRepository, MediaPathResolver $mediaPaths): Response
    {
        $demoTrack = null;
        foreach ($trackRepository->findPublishedOrdered() as $track) {
            if ($mediaPaths->audioExists($track->getAudioPath())) {
                $demoTrack = $track;
                break;
            }
        }

        return $this->render('web/embed_demo.html.twig', [
            'demoTrackSlug' => $demoTrack?->getSlug() ?? '',
        ]);
    }
}
