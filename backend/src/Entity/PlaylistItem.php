<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PlaylistItemRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: PlaylistItemRepository::class)]
#[ORM\Table(name: 'playlist_items')]
class PlaylistItem
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Playlist $playlist;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Track $track = null;

    #[ORM\Column]
    private int $sortOrder = 0;

    public function __construct()
    {
        $this->id = Uuid::v7();
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

    public function getPlaylist(): Playlist
    {
        return $this->playlist;
    }

    public function setPlaylist(Playlist $playlist): static
    {
        $this->playlist = $playlist;

        return $this;
    }

    public function getTrack(): ?Track
    {
        return $this->track;
    }

    public function setTrack(Track $track): static
    {
        $this->track = $track;

        return $this;
    }

    public function getSortOrder(): int
    {
        return $this->sortOrder;
    }

    public function setSortOrder(int $sortOrder): static
    {
        $this->sortOrder = $sortOrder;

        return $this;
    }

    public function __toString(): string
    {
        if ($this->track === null) {
            return 'Новый трек';
        }

        $title = $this->track->getTitle();
        $order = $this->sortOrder > 0 ? sprintf('#%d · ', $this->sortOrder) : '';

        return $order.$title;
    }
}
