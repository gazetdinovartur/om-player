<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Album;
use App\Entity\Track;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Track> */
class TrackRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Track::class);
    }

    public function findOneBySlug(string $slug): ?Track
    {
        return $this->findOneBy(['slug' => $slug]);
    }

    /** @return Track[] */
    public function findPublishedByAlbum(Album $album): array
    {
        return $this->createQueryBuilder('t')
            ->andWhere('t.album = :albumId')
            ->andWhere('t.published = true')
            ->setParameter('albumId', $album->getId(), 'uuid')
            ->orderBy('t.trackNumber', 'ASC')
            ->addOrderBy('t.title', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @return Track[] */
    public function findPublishedPaginated(int $page, int $perPage, ?string $albumSlug = null): array
    {
        $qb = $this->createQueryBuilder('t')
            ->andWhere('t.published = true')
            ->orderBy('t.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        if ($albumSlug !== null) {
            $qb->join('t.album', 'a')->andWhere('a.slug = :slug')->setParameter('slug', $albumSlug);
        }

        return $qb->getQuery()->getResult();
    }

    public function countPublished(?string $albumSlug = null): int
    {
        $qb = $this->createQueryBuilder('t')
            ->select('COUNT(t.id)')
            ->andWhere('t.published = true');

        if ($albumSlug !== null) {
            $qb->join('t.album', 'a')->andWhere('a.slug = :slug')->setParameter('slug', $albumSlug);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /** @return Track[] */
    public function findPublishedOrdered(): array
    {
        return $this->createQueryBuilder('t')
            ->andWhere('t.published = true')
            ->orderBy('t.trackNumber', 'ASC')
            ->addOrderBy('t.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @return Track[] */
    public function searchPublished(string $query): array
    {
        $q = '%'.mb_strtolower(trim($query)).'%';

        return $this->createQueryBuilder('t')
            ->andWhere('t.published = true')
            ->andWhere('LOWER(t.title) LIKE :q OR LOWER(t.description) LIKE :q')
            ->setParameter('q', $q)
            ->orderBy('t.title', 'ASC')
            ->setMaxResults(50)
            ->getQuery()
            ->getResult();
    }
}
