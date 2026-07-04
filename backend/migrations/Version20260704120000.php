<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\SQLitePlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260704120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Initial schema: artists, albums, tracks';
    }

    public function up(Schema $schema): void
    {
        $id = $this->idColumnType();

        $this->addSql("CREATE TABLE artists (id {$id} NOT NULL, slug VARCHAR(100) NOT NULL, name VARCHAR(255) NOT NULL, bio TEXT DEFAULT NULL, photo_path VARCHAR(512) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY(id))");
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ARTIST_SLUG ON artists (slug)');

        $this->addSql("CREATE TABLE albums (id {$id} NOT NULL, artist_id {$id} NOT NULL, slug VARCHAR(100) NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, cover_path VARCHAR(512) DEFAULT NULL, cover_thumb_path VARCHAR(512) DEFAULT NULL, released_at DATE DEFAULT NULL, type VARCHAR(20) NOT NULL, published {$this->boolType()} NOT NULL, sort_order INTEGER DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY(id), CONSTRAINT FK_ALBUM_ARTIST FOREIGN KEY (artist_id) REFERENCES artists (id))");
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ALBUM_SLUG ON albums (slug)');
        $this->addSql('CREATE INDEX IDX_ALBUM_ARTIST ON albums (artist_id)');

        $this->addSql("CREATE TABLE tracks (id {$id} NOT NULL, album_id {$id} DEFAULT NULL, slug VARCHAR(100) NOT NULL, title VARCHAR(255) NOT NULL, track_number INTEGER DEFAULT NULL, duration_ms INTEGER NOT NULL, audio_path VARCHAR(512) NOT NULL, audio_mime_type VARCHAR(64) NOT NULL, cover_path VARCHAR(512) DEFAULT NULL, cover_thumb_path VARCHAR(512) DEFAULT NULL, type VARCHAR(20) NOT NULL, genre VARCHAR(100) DEFAULT NULL, description TEXT DEFAULT NULL, credits TEXT DEFAULT NULL, lyrics TEXT DEFAULT NULL, published {$this->boolType()} NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY(id), CONSTRAINT FK_TRACK_ALBUM FOREIGN KEY (album_id) REFERENCES albums (id))");
        $this->addSql('CREATE UNIQUE INDEX UNIQ_TRACK_SLUG ON tracks (slug)');
        $this->addSql('CREATE INDEX IDX_TRACK_ALBUM ON tracks (album_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE tracks');
        $this->addSql('DROP TABLE albums');
        $this->addSql('DROP TABLE artists');
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
