<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\PlaybackEventType;
use App\Repository\PlaybackEventRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: PlaybackEventRepository::class)]
#[ORM\Table(name: 'playback_events')]
#[ORM\Index(columns: ['created_at'])]
class PlaybackEvent
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 100)]
    private string $trackSlug;

    #[ORM\Column(enumType: PlaybackEventType::class)]
    private PlaybackEventType $eventType;

    #[ORM\Column]
    private int $positionMs = 0;

    #[ORM\Column(length: 64)]
    private string $sessionId;

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $userAgent = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getTrackSlug(): string
    {
        return $this->trackSlug;
    }

    public function setTrackSlug(string $trackSlug): static
    {
        $this->trackSlug = $trackSlug;

        return $this;
    }

    public function getEventType(): PlaybackEventType
    {
        return $this->eventType;
    }

    public function setEventType(PlaybackEventType $eventType): static
    {
        $this->eventType = $eventType;

        return $this;
    }

    public function getPositionMs(): int
    {
        return $this->positionMs;
    }

    public function setPositionMs(int $positionMs): static
    {
        $this->positionMs = $positionMs;

        return $this;
    }

    public function getSessionId(): string
    {
        return $this->sessionId;
    }

    public function setSessionId(string $sessionId): static
    {
        $this->sessionId = $sessionId;

        return $this;
    }

    public function getUserAgent(): ?string
    {
        return $this->userAgent;
    }

    public function setUserAgent(?string $userAgent): static
    {
        $this->userAgent = $userAgent;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
