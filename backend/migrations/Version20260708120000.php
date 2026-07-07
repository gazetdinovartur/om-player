<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260708120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add composer, album_artist, label columns to tracks';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE tracks ADD composer VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE tracks ADD album_artist VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE tracks ADD label VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE tracks DROP composer');
        $this->addSql('ALTER TABLE tracks DROP album_artist');
        $this->addSql('ALTER TABLE tracks DROP label');
    }
}
