<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Album;
use App\Entity\Playlist;
use App\Entity\PlaylistItem;
use App\Entity\Track;
use App\Repository\AlbumRepository;
use App\Repository\PlaylistRepository;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Csrf\CsrfToken;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;
use Symfony\Component\Uid\Uuid;

final class AdminCollectionSortController extends AbstractController
{
    public const CSRF_TOKEN_ID = 'admin_sort';

    #[AdminRoute(path: '/api/sort-collection', name: 'api_sort_collection', options: ['methods' => ['POST']])]
    public function sortCollection(
        Request $request,
        EntityManagerInterface $entityManager,
        AlbumRepository $albumRepository,
        PlaylistRepository $playlistRepository,
        CsrfTokenManagerInterface $csrfTokenManager,
    ): JsonResponse {
        $token = (string) $request->headers->get('X-CSRF-Token', '');
        if (!$csrfTokenManager->isTokenValid(new CsrfToken(self::CSRF_TOKEN_ID, $token))) {
            return new JsonResponse(
                ['ok' => false, 'error' => 'Сессия устарела. Обновите страницу.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $type = (string) $request->request->get('type', '');
        $parentId = (string) $request->request->get('parentId', '');
        /** @var list<string> $ids */
        $ids = array_values(array_filter(
            $request->request->all('ids'),
            static fn (mixed $id): bool => is_string($id) && $id !== '',
        ));

        if ($parentId === '' || $ids === []) {
            return new JsonResponse(['ok' => false, 'error' => 'Некорректные данные'], Response::HTTP_BAD_REQUEST);
        }

        try {
            match ($type) {
                'album_tracks' => $this->sortAlbumTracks($albumRepository, $parentId, $ids),
                'playlist_items' => $this->sortPlaylistItems($playlistRepository, $parentId, $ids),
                default => throw new \InvalidArgumentException('Неизвестный тип сортировки'),
            };
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['ok' => false, 'error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->flush();

        return new JsonResponse(['ok' => true]);
    }

    /** @param list<string> $ids */
    private function sortAlbumTracks(AlbumRepository $albumRepository, string $parentId, array $ids): void
    {
        $album = $albumRepository->find(Uuid::fromString($parentId));
        if (!$album instanceof Album) {
            throw new \InvalidArgumentException('Альбом не найден');
        }

        /** @var array<string, Track> $tracksById */
        $tracksById = [];
        foreach ($album->getTracks() as $track) {
            $tracksById[$track->getId()->toRfc4122()] = $track;
        }

        if (count($ids) !== count($tracksById)) {
            throw new \InvalidArgumentException('Список треков не совпадает с альбомом');
        }

        $position = 1;
        foreach ($ids as $id) {
            if (!isset($tracksById[$id])) {
                throw new \InvalidArgumentException('Трек не принадлежит альбому');
            }
            $tracksById[$id]->setTrackNumber($position++);
        }

        $album->touch();
    }

    /** @param list<string> $ids */
    private function sortPlaylistItems(PlaylistRepository $playlistRepository, string $parentId, array $ids): void
    {
        $playlist = $playlistRepository->find(Uuid::fromString($parentId));
        if (!$playlist instanceof Playlist) {
            throw new \InvalidArgumentException('Плейлист не найден');
        }

        /** @var array<string, PlaylistItem> $itemsById */
        $itemsById = [];
        foreach ($playlist->getItems() as $item) {
            $itemsById[$item->getId()->toRfc4122()] = $item;
        }

        if (count($ids) !== count($itemsById)) {
            throw new \InvalidArgumentException('Список треков не совпадает с плейлистом');
        }

        $position = 1;
        foreach ($ids as $id) {
            if (!isset($itemsById[$id])) {
                throw new \InvalidArgumentException('Элемент не принадлежит плейлисту');
            }
            $itemsById[$id]->setSortOrder($position++);
        }
    }
}
