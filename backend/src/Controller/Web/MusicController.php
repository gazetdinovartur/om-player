<?php

declare(strict_types=1);

namespace App\Controller\Web;

use App\Api\TrackApiSerializer;
use App\Repository\AlbumRepository;
use App\Repository\TrackRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class MusicController extends AbstractController
{
    public function __construct(private readonly TrackApiSerializer $serializer)
    {
    }

    #[Route('/music', name: 'web_music_catalog')]
    public function catalog(
        AlbumRepository $albumRepository,
        TrackRepository $trackRepository,
        Request $request,
    ): Response {
        $q = trim((string) $request->query->get('q', ''));
        $albums = $q !== ''
            ? $albumRepository->searchPublished($q)
            : $albumRepository->findPublishedSummaries();
        $tracks = $q !== ''
            ? array_map(fn ($track) => $this->serializer->summary($track), $trackRepository->searchPublished($q))
            : [];

        return $this->render('web/music/catalog.html.twig', [
            'albums' => $albums,
            'tracks' => $tracks,
            'q' => $q,
        ]);
    }

    #[Route('/music/{slug}', name: 'web_music_album')]
    public function album(string $slug, AlbumRepository $albumRepository): Response
    {
        $album = $albumRepository->findOnePublishedBySlug($slug);
        if ($album === null) {
            throw $this->createNotFoundException();
        }

        $tracks = [];
        foreach ($album->getTracks() as $track) {
            if ($track->isPublished()) {
                $tracks[] = $this->serializer->trackWithStream($track);
            }
        }

        return $this->render('web/music/album.html.twig', [
            'album' => $album,
            'albumTracksJson' => json_encode($tracks, \JSON_UNESCAPED_UNICODE | \JSON_THROW_ON_ERROR),
        ]);
    }
}
