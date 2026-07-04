<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\PlaybackEvent;
use App\Enum\PlaybackEventType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<PlaybackEvent> */
class PlaybackEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PlaybackEvent::class);
    }

    public function countSince(\DateTimeImmutable $since): int
    {
        return (int) $this->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->andWhere('e.createdAt >= :since')
            ->setParameter('since', $since)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countByTypeSince(PlaybackEventType $type, \DateTimeImmutable $since): int
    {
        return (int) $this->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->andWhere('e.eventType = :type')
            ->andWhere('e.createdAt >= :since')
            ->setParameter('type', $type)
            ->setParameter('since', $since)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countUniqueSessionsSince(\DateTimeImmutable $since): int
    {
        return (int) $this->createQueryBuilder('e')
            ->select('COUNT(DISTINCT e.sessionId)')
            ->andWhere('e.createdAt >= :since')
            ->setParameter('since', $since)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /** @return list<array{slug: string, count: int}> */
    public function topTracksByPlays(int $limit, \DateTimeImmutable $since): array
    {
        $rows = $this->createQueryBuilder('e')
            ->select('e.trackSlug AS slug, COUNT(e.id) AS playCount')
            ->andWhere('e.eventType = :type')
            ->andWhere('e.createdAt >= :since')
            ->setParameter('type', PlaybackEventType::PLAY)
            ->setParameter('since', $since)
            ->groupBy('e.trackSlug')
            ->orderBy('playCount', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();

        return array_map(
            static fn (array $row): array => ['slug' => (string) $row['slug'], 'count' => (int) $row['playCount']],
            $rows,
        );
    }

    /** @return array<string, int> day (Y-m-d) => play count */
    public function dailyPlayCounts(int $days): array
    {
        $since = (new \DateTimeImmutable())->modify(sprintf('-%d days', max(1, $days - 1)))->setTime(0, 0, 0);

        /** @var PlaybackEvent[] $events */
        $events = $this->createQueryBuilder('e')
            ->andWhere('e.eventType = :type')
            ->andWhere('e.createdAt >= :since')
            ->setParameter('type', PlaybackEventType::PLAY)
            ->setParameter('since', $since)
            ->getQuery()
            ->getResult();

        $result = [];
        foreach ($events as $event) {
            $day = $event->getCreatedAt()->format('Y-m-d');
            $result[$day] = ($result[$day] ?? 0) + 1;
        }
        ksort($result);

        return $result;
    }
}
