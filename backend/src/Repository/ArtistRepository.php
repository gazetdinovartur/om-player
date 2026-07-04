<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Artist;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Artist> */
class ArtistRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Artist::class);
    }

    public function findOneByNameInsensitive(string $name): ?Artist
    {
        return $this->createQueryBuilder('a')
            ->andWhere('LOWER(a.name) = :name')
            ->setParameter('name', mb_strtolower(trim($name)))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findOneBySlug(string $slug): ?Artist
    {
        return $this->findOneBy(['slug' => $slug]);
    }
}
