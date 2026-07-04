<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\PlaybackEvent;
use App\Enum\PlaybackEventType;
use App\Repository\PlaybackEventRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;

final class AnalyticsIngestService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PlaybackEventRepository $repository,
    ) {
    }

    /**
     * @param array{sessionId: string, events: list<array{type: string, trackSlug: string, positionMs: int, timestamp?: string}>} $payload
     */
    public function ingest(array $payload, Request $request): int
    {
        $sessionId = substr($payload['sessionId'], 0, 64);
        $ua = substr((string) $request->headers->get('User-Agent', ''), 0, 512);
        $count = 0;

        foreach ($payload['events'] as $event) {
            $type = PlaybackEventType::tryFrom($event['type'] ?? '');
            if ($type === null || empty($event['trackSlug'])) {
                continue;
            }

            $record = (new PlaybackEvent())
                ->setSessionId($sessionId)
                ->setTrackSlug((string) $event['trackSlug'])
                ->setEventType($type)
                ->setPositionMs((int) ($event['positionMs'] ?? 0))
                ->setUserAgent($ua);

            $this->em->persist($record);
            ++$count;
        }

        if ($count > 0) {
            $this->em->flush();
        }

        return $count;
    }
}
