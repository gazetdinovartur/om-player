<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Album;
use App\Entity\Artist;
use App\Entity\Track;
use App\Enum\AlbumType;
use App\Enum\TrackType;
use App\Repository\AlbumRepository;
use App\Repository\ArtistRepository;
use App\Repository\TrackRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class CatalogResolver
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ArtistRepository $artistRepository,
        private readonly AlbumRepository $albumRepository,
        private readonly TrackRepository $trackRepository,
        private readonly SlugGenerator $slugGenerator,
        #[Autowire('%env(JMO_DEFAULT_ARTIST_NAME)%')]
        private readonly string $defaultArtistName,
    ) {
    }

    public function resolveArtist(?string $artistName): Artist
    {
        $name = trim($artistName ?? '') !== '' ? trim($artistName) : $this->defaultArtistName;

        $existing = $this->artistRepository->findOneByNameInsensitive($name);
        if ($existing !== null) {
            return $existing;
        }

        $artist = (new Artist())
            ->setName($name)
            ->setSlug($this->uniqueArtistSlug($name));

        $this->em->persist($artist);

        return $artist;
    }

    public function resolveAlbum(?string $albumTitle, Artist $artist, ExtractedAudioMetadata $meta): ?Album
    {
        if ($albumTitle === null || trim($albumTitle) === '') {
            return null;
        }

        $title = trim($albumTitle);
        $existing = $this->albumRepository->findOneByTitleAndArtist($title, $artist);
        if ($existing !== null) {
            if ($existing->getReleasedAt() === null && $meta->releasedAt !== null) {
                $existing->setReleasedAt($meta->releasedAt);
            }

            return $existing;
        }

        $album = (new Album())
            ->setTitle($title)
            ->setSlug($this->uniqueAlbumSlug($title))
            ->setArtist($artist)
            ->setType($this->suggestAlbumType($title, $meta))
            ->setReleasedAt($meta->releasedAt)
            ->setPublished(false);

        $this->em->persist($album);

        return $album;
    }

    public function uniqueTrackSlug(string $title): string
    {
        $base = $this->slugGenerator->fromText($title);
        $slug = $base;
        $i = 2;
        while ($this->trackRepository->findOneBySlug($slug) !== null) {
            $slug = $base.'-'.$i;
            ++$i;
        }

        return $slug;
    }

    public function applyCoverToAlbum(Album $album, ExtractedCover $cover, CoverProcessor $coverProcessor): void
    {
        if ($album->getCoverPath() !== null) {
            return;
        }

        $paths = $coverProcessor->storeCover($cover);
        $album->setCoverPath($paths['coverPath']);
        $album->setCoverThumbPath($paths['coverThumbPath']);
        $album->touch();
    }

    public function buildTrackFromMetadata(
        ExtractedAudioMetadata $meta,
        string $audioPath,
        bool $published = false,
    ): Track {
        $artist = $this->resolveArtist($meta->artist);
        $album = $this->resolveAlbum($meta->album, $artist, $meta);

        $track = (new Track())
            ->setTitle($meta->title)
            ->setSlug($this->uniqueTrackSlug($meta->title))
            ->setAlbum($album)
            ->setTrackNumber($meta->trackNumber)
            ->setDurationMs($meta->durationMs)
            ->setAudioPath($audioPath)
            ->setAudioMimeType($meta->mimeType)
            ->setGenre($meta->genre)
            ->setType(TrackType::STUDIO)
            ->setPublished($published);

        if ($album !== null) {
            $album->addTrack($track);
        }

        return $track;
    }

    private function suggestAlbumType(string $title, ExtractedAudioMetadata $meta): AlbumType
    {
        if (mb_strtolower($title) === mb_strtolower($meta->title)) {
            return AlbumType::SINGLE;
        }

        return AlbumType::STUDIO;
    }

    private function uniqueArtistSlug(string $name): string
    {
        $base = $this->slugGenerator->fromText($name);
        $slug = $base;
        $i = 2;
        while ($this->artistRepository->findOneBySlug($slug) !== null) {
            $slug = $base.'-'.$i;
            ++$i;
        }

        return $slug;
    }

    private function uniqueAlbumSlug(string $title): string
    {
        $base = $this->slugGenerator->fromText($title);
        $slug = $base;
        $i = 2;
        while ($this->albumRepository->findOneBySlug($slug) !== null) {
            $slug = $base.'-'.$i;
            ++$i;
        }

        return $slug;
    }
}
