<?php

declare(strict_types=1);

namespace App\Controller\Web;

use App\Api\TrackApiSerializer;
use App\Repository\PlaylistRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PlaylistController extends AbstractController
{
    public function __construct(private readonly TrackApiSerializer $serializer)
    {
    }

    #[Route('/music/playlists', name: 'web_music_playlists', priority: 10)]
    public function catalog(PlaylistRepository $playlistRepository): Response
    {
        return $this->render('web/music/playlists.html.twig', [
            'playlists' => $playlistRepository->findPublicOrdered(),
        ]);
    }

    #[Route('/music/playlists/{slug}', name: 'web_music_playlist', priority: 10)]
    public function show(string $slug, PlaylistRepository $playlistRepository): Response
    {
        $playlist = $playlistRepository->findOneBySlug($slug);
        if ($playlist === null) {
            throw $this->createNotFoundException();
        }

        $tracks = [];
        foreach ($playlist->getItems() as $item) {
            $track = $item->getTrack();
            if ($track === null || !$track->isPublished()) {
                continue;
            }
            $tracks[] = $this->serializer->summary($track);
        }

        return $this->render('web/music/playlist.html.twig', [
            'playlist' => $playlist,
            'playlistTracksJson' => json_encode($tracks, \JSON_UNESCAPED_UNICODE | \JSON_THROW_ON_ERROR),
        ]);
    }
}
