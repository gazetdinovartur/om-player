<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Album;
use App\Entity\Artist;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Album> */
class AlbumRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Album::class);
    }

    public function findOneBySlug(string $slug): ?Album
    {
        return $this->findOneBy(['slug' => $slug]);
    }

    public function findOneByTitleAndArtist(string $title, Artist $artist): ?Album
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.artist = :artist')
            ->andWhere('LOWER(a.title) = :title')
            ->setParameter('artist', $artist)
            ->setParameter('title', mb_strtolower(trim($title)))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** @return Album[] */
    public function findPublishedSummaries(): array
    {
        return $this->createQueryBuilder('a')
            ->join('a.artist', 'ar')
            ->addSelect('ar')
            ->andWhere('a.published = true')
            ->orderBy('a.sortOrder', 'ASC')
            ->addOrderBy('a.releasedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** @return Album[] */
    public function findPublishedOrdered(): array
    {
        return $this->findPublishedSummaries();
    }

    public function findOnePublishedBySlug(string $slug): ?Album
    {
        return $this->createQueryBuilder('a')
            ->join('a.artist', 'ar')
            ->addSelect('ar')
            ->leftJoin('a.tracks', 't')
            ->addSelect('t')
            ->andWhere('a.slug = :slug')
            ->andWhere('a.published = true')
            ->setParameter('slug', $slug)
            ->orderBy('t.trackNumber', 'ASC')
            ->addOrderBy('t.title', 'ASC')
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findLatestPublished(): ?Album
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.published = true')
            ->orderBy('a.releasedAt', 'DESC')
            ->addOrderBy('a.createdAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** @return Album[] */
    public function searchPublished(string $query): array
    {
        $q = '%'.mb_strtolower(trim($query)).'%';

        return $this->createQueryBuilder('a')
            ->distinct()
            ->join('a.artist', 'ar')
            ->addSelect('ar')
            ->leftJoin('a.tracks', 't')
            ->andWhere('a.published = true')
            ->andWhere(
                'LOWER(a.title) LIKE :q OR LOWER(ar.name) LIKE :q OR (t.published = true AND LOWER(t.title) LIKE :q)',
            )
            ->setParameter('q', $q)
            ->orderBy('a.title', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
