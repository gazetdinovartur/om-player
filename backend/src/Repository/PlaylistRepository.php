<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Playlist;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Playlist> */
class PlaylistRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Playlist::class);
    }

    public function findOneBySlug(string $slug): ?Playlist
    {
        return $this->findOneBy(['slug' => $slug, 'isPublic' => true]);
    }

    /** @return Playlist[] */
    public function findPublicOrdered(): array
    {
        return $this->createQueryBuilder('p')
            ->andWhere('p.isPublic = true')
            ->orderBy('p.sortOrder', 'ASC')
            ->addOrderBy('p.title', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
