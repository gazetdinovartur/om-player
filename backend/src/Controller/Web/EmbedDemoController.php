<?php

declare(strict_types=1);

namespace App\Controller\Web;

use App\Repository\TrackRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class EmbedDemoController extends AbstractController
{
    #[Route('/demo/embed', name: 'web_embed_demo')]
    public function embed(TrackRepository $trackRepository): Response
    {
        $demoTrack = $trackRepository->findOneBy(['published' => true], ['trackNumber' => 'ASC', 'createdAt' => 'ASC']);

        return $this->render('web/embed_demo.html.twig', [
            'demoTrackSlug' => $demoTrack?->getSlug() ?? '',
        ]);
    }
}
