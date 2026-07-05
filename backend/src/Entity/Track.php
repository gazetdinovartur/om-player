<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TrackType;
use App\Repository\TrackRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: TrackRepository::class)]
#[ORM\Table(name: 'tracks')]
class Track
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 100, unique: true)]
    private string $slug;

    #[ORM\Column(length: 255)]
    private string $title;

    #[ORM\ManyToOne(inversedBy: 'tracks')]
    private ?Album $album = null;

    #[ORM\Column(nullable: true)]
    private ?int $trackNumber = null;

    #[ORM\Column]
    private int $durationMs = 0;

    #[ORM\Column(length: 512)]
    private string $audioPath;

    #[ORM\Column(length: 64)]
    private string $audioMimeType = 'audio/mpeg';

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $coverPath = null;

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $coverThumbPath = null;

    #[ORM\Column(enumType: TrackType::class)]
    private TrackType $type = TrackType::STUDIO;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $genre = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $credits = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $lyrics = null;

    #[ORM\Column]
    private bool $published = false;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    /** Form binding only — primary key is assigned in constructor. */
    public function setId(mixed $id): static
    {
        return $this;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): static
    {
        $this->slug = $slug;

        return $this;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getAlbum(): ?Album
    {
        return $this->album;
    }

    public function setAlbum(?Album $album): static
    {
        $this->album = $album;

        return $this;
    }

    public function getTrackNumber(): ?int
    {
        return $this->trackNumber;
    }

    public function setTrackNumber(?int $trackNumber): static
    {
        $this->trackNumber = $trackNumber;

        return $this;
    }

    public function getDurationMs(): int
    {
        return $this->durationMs;
    }

    public function setDurationMs(int $durationMs): static
    {
        $this->durationMs = $durationMs;

        return $this;
    }

    public function getAudioPath(): string
    {
        return $this->audioPath;
    }

    public function setAudioPath(string $audioPath): static
    {
        $this->audioPath = $audioPath;

        return $this;
    }

    public function getAudioMimeType(): string
    {
        return $this->audioMimeType;
    }

    public function setAudioMimeType(string $audioMimeType): static
    {
        $this->audioMimeType = $audioMimeType;

        return $this;
    }

    public function getCoverPath(): ?string
    {
        return $this->coverPath;
    }

    public function setCoverPath(?string $coverPath): static
    {
        $this->coverPath = $coverPath;

        return $this;
    }

    public function getCoverThumbPath(): ?string
    {
        return $this->coverThumbPath;
    }

    public function setCoverThumbPath(?string $coverThumbPath): static
    {
        $this->coverThumbPath = $coverThumbPath;

        return $this;
    }

    public function getType(): TrackType
    {
        return $this->type;
    }

    public function setType(TrackType $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getGenre(): ?string
    {
        return $this->genre;
    }

    public function setGenre(?string $genre): static
    {
        $this->genre = $genre;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getCredits(): ?string
    {
        return $this->credits;
    }

    public function setCredits(?string $credits): static
    {
        $this->credits = $credits;

        return $this;
    }

    public function getLyrics(): ?string
    {
        return $this->lyrics;
    }

    public function setLyrics(?string $lyrics): static
    {
        $this->lyrics = $lyrics;

        return $this;
    }

    public function isPublished(): bool
    {
        return $this->published;
    }

    public function setPublished(bool $published): static
    {
        $this->published = $published;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getArtistName(): string
    {
        if ($this->album !== null) {
            return $this->album->getArtist()->getName();
        }

        return 'Артур Лун';
    }

    public function getEffectiveCoverPath(): ?string
    {
        return $this->coverPath ?? $this->album?->getCoverPath();
    }

    public function getEffectiveCoverThumbPath(): ?string
    {
        return $this->coverThumbPath ?? $this->album?->getCoverThumbPath();
    }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function __toString(): string
    {
        return $this->title;
    }
}
