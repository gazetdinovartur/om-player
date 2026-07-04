<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\SQLitePlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260704130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Playlists, playlist_items, playback_events';
    }

    public function up(Schema $schema): void
    {
        $id = $this->idColumnType();

        $this->addSql("CREATE TABLE playlists (id {$id} NOT NULL, slug VARCHAR(100) NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, cover_path VARCHAR(512) DEFAULT NULL, is_public {$this->boolType()} NOT NULL, sort_order INTEGER DEFAULT NULL, created_at DATETIME NOT NULL, PRIMARY KEY(id))");
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PLAYLIST_SLUG ON playlists (slug)');

        $this->addSql("CREATE TABLE playlist_items (id {$id} NOT NULL, playlist_id {$id} NOT NULL, track_id {$id} NOT NULL, sort_order INTEGER NOT NULL, PRIMARY KEY(id), CONSTRAINT FK_PI_PLAYLIST FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE, CONSTRAINT FK_PI_TRACK FOREIGN KEY (track_id) REFERENCES tracks (id))");
        $this->addSql('CREATE INDEX IDX_PI_PLAYLIST ON playlist_items (playlist_id)');

        $this->addSql("CREATE TABLE playback_events (id {$id} NOT NULL, track_slug VARCHAR(100) NOT NULL, event_type VARCHAR(20) NOT NULL, position_ms INTEGER NOT NULL, session_id VARCHAR(64) NOT NULL, user_agent VARCHAR(512) DEFAULT NULL, created_at DATETIME NOT NULL, PRIMARY KEY(id))");
        $this->addSql('CREATE INDEX IDX_PE_CREATED ON playback_events (created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE playback_events');
        $this->addSql('DROP TABLE playlist_items');
        $this->addSql('DROP TABLE playlists');
    }

    private function idColumnType(): string
    {
        return $this->connection->getDatabasePlatform() instanceof SQLitePlatform ? 'BLOB' : 'BINARY(16)';
    }

    private function boolType(): string
    {
        return $this->connection->getDatabasePlatform() instanceof SQLitePlatform ? 'BOOLEAN' : 'TINYINT(1)';
    }
}
