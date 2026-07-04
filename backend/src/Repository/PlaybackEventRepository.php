<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\PlaybackEvent;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<PlaybackEvent> */
class PlaybackEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PlaybackEvent::class);
    }
}
