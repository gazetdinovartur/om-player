<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Api\TrackApiSerializer;
use App\Repository\AlbumRepository;
use App\Repository\ArtistRepository;
use App\Repository\PlaylistRepository;
use App\Repository\TrackRepository;
use App\Service\AnalyticsIngestService;
use App\Service\MediaUrlGenerator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/v1')]
final class MusicApiController extends AbstractController
{
    public function __construct(
        private readonly TrackRepository $trackRepository,
        private readonly AlbumRepository $albumRepository,
        private readonly ArtistRepository $artistRepository,
        private readonly PlaylistRepository $playlistRepository,
        private readonly TrackApiSerializer $serializer,
        private readonly AnalyticsIngestService $analytics,
        private readonly MediaUrlGenerator $mediaUrls,
        #[Autowire(service: 'limiter.api')]
        private readonly RateLimiterFactory $apiLimiter,
    ) {
    }

    private function limited(Request $request): ?JsonResponse
    {
        $limiter = $this->apiLimiter->create($request->getClientIp() ?? 'anon');
        if (!$limiter->consume(1)->isAccepted()) {
            return $this->json(
                ['error' => ['code' => 'RATE_LIMITED', 'message' => 'Too many requests']],
                Response::HTTP_TOO_MANY_REQUESTS,
            );
        }

        return null;
    }

    #[Route('/tracks', name: 'api_tracks_list', methods: ['GET'])]
    public function tracks(Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(50, max(1, (int) $request->query->get('perPage', 20)));
        $album = $request->query->get('album');

        $items = $this->trackRepository->findPublishedPaginated($page, $perPage, is_string($album) ? $album : null);
        $total = $this->trackRepository->countPublished(is_string($album) ? $album : null);

        return $this->json([
            'data' => array_map(fn ($t) => $this->serializer->summary($t), $items),
            'meta' => [
                'total' => $total,
                'page' => $page,
                'perPage' => $perPage,
                'totalPages' => (int) ceil($total / $perPage),
            ],
        ]);
    }

    #[Route('/tracks/{slug}', name: 'api_track_detail', methods: ['GET'])]
    public function track(string $slug, Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $track = $this->trackRepository->findOneBySlug($slug);
        if ($track === null || !$track->isPublished()) {
            return $this->json(['error' => ['code' => 'NOT_FOUND', 'message' => 'Track not found']], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializer->detail($track));
    }

    #[Route('/albums', name: 'api_albums_list', methods: ['GET'])]
    public function albums(Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $albums = $this->albumRepository->findPublishedSummaries();

        return $this->json([
            'data' => array_map(fn ($a) => $this->serializer->albumSummary($a), $albums),
        ]);
    }

    #[Route('/albums/{slug}', name: 'api_album_detail', methods: ['GET'])]
    public function album(string $slug, Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $album = $this->albumRepository->findOneBySlug($slug);
        if ($album === null || !$album->isPublished()) {
            return $this->json(['error' => ['code' => 'NOT_FOUND', 'message' => 'Album not found']], Response::HTTP_NOT_FOUND);
        }

        $data = $this->serializer->albumSummary($album);
        $data['description'] = $album->getDescription();

        return $this->json($data);
    }

    #[Route('/albums/{slug}/tracks', name: 'api_album_tracks', methods: ['GET'])]
    public function albumTracks(string $slug, Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $album = $this->albumRepository->findOneBySlug($slug);
        if ($album === null || !$album->isPublished()) {
            return $this->json(['error' => ['code' => 'NOT_FOUND', 'message' => 'Album not found']], Response::HTTP_NOT_FOUND);
        }

        $tracks = $this->trackRepository->findPublishedByAlbum($album);
        $albumData = $this->serializer->albumSummary($album);

        return $this->json([
            'album' => [
                'slug' => $albumData['slug'],
                'title' => $albumData['title'],
                'artistName' => $albumData['artistName'],
                'releasedAt' => $albumData['releasedAt'],
                'coverUrl' => $albumData['coverUrl'],
                'coverThumbUrl' => $albumData['coverThumbUrl'],
            ],
            'data' => array_map(fn ($t) => $this->serializer->trackWithStream($t), $tracks),
        ]);
    }

    #[Route('/playlists', name: 'api_playlists_list', methods: ['GET'])]
    public function playlists(Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $playlists = $this->playlistRepository->findPublicOrdered();

        return $this->json([
            'data' => array_map(fn ($p) => [
                'slug' => $p->getSlug(),
                'title' => $p->getTitle(),
                'description' => $p->getDescription(),
                'coverUrl' => $this->mediaUrls->url($p->getCoverPath()),
                'trackCount' => $p->getItems()->count(),
            ], $playlists),
        ]);
    }

    #[Route('/playlists/{slug}', name: 'api_playlist_detail', methods: ['GET'])]
    public function playlist(string $slug, Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $playlist = $this->playlistRepository->findOneBySlug($slug);
        if ($playlist === null) {
            return $this->json(['error' => ['code' => 'NOT_FOUND', 'message' => 'Playlist not found']], Response::HTTP_NOT_FOUND);
        }

        $tracks = [];
        foreach ($playlist->getItems() as $item) {
            $track = $item->getTrack();
            if ($track === null || !$track->isPublished()) {
                continue;
            }
            $tracks[] = array_merge($this->serializer->trackWithStream($track), []);
        }

        return $this->json([
            'slug' => $playlist->getSlug(),
            'title' => $playlist->getTitle(),
            'description' => $playlist->getDescription(),
            'tracks' => $tracks,
        ]);
    }

    #[Route('/artists/{slug}', name: 'api_artist_detail', methods: ['GET'])]
    public function artist(string $slug, Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $artist = $this->artistRepository->findOneBySlug($slug);
        if ($artist === null) {
            return $this->json(['error' => ['code' => 'NOT_FOUND', 'message' => 'Artist not found']], Response::HTTP_NOT_FOUND);
        }

        $albums = array_filter(
            $artist->getAlbums()->toArray(),
            fn ($a) => $a->isPublished(),
        );

        return $this->json([
            'slug' => $artist->getSlug(),
            'name' => $artist->getName(),
            'bio' => $artist->getBio(),
            'photoUrl' => $this->mediaUrls->url($artist->getPhotoPath()),
            'albums' => array_map(fn ($a) => $this->serializer->albumSummary($a), $albums),
        ]);
    }

    #[Route('/search', name: 'api_search', methods: ['GET'])]
    public function search(Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $q = trim((string) $request->query->get('q', ''));
        if ($q === '') {
            return $this->json(['tracks' => [], 'albums' => []]);
        }

        return $this->json([
            'tracks' => array_map(fn ($t) => $this->serializer->summary($t), $this->trackRepository->searchPublished($q)),
            'albums' => array_map(fn ($a) => $this->serializer->albumSummary($a), $this->albumRepository->searchPublished($q)),
        ]);
    }

    #[Route('/analytics/playback', name: 'api_analytics_playback', methods: ['POST'])]
    public function analyticsPlayback(Request $request): JsonResponse
    {
        if ($response = $this->limited($request)) {
            return $response;
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload) || !isset($payload['sessionId'], $payload['events'])) {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Invalid payload']], Response::HTTP_BAD_REQUEST);
        }

        $this->analytics->ingest($payload, $request);

        return $this->json(null, Response::HTTP_ACCEPTED);
    }
}
