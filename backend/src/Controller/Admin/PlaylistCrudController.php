<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Playlist;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\SlugField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

final class PlaylistCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Playlist::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Плейлист')
            ->setEntityLabelInPlural('Плейлисты')
            ->setDefaultSort(['sortOrder' => 'ASC', 'title' => 'ASC']);
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('title', 'Название');
        yield SlugField::new('slug', 'Slug')->setTargetFieldName('title');
        yield TextareaField::new('description', 'Описание')->hideOnIndex();
        yield BooleanField::new('isPublic', 'Публичный');
        yield IntegerField::new('sortOrder', 'Порядок');

        yield IntegerField::new('trackCount', 'Треков')
            ->onlyOnIndex()
            ->setVirtual(true)
            ->formatValue(static fn ($value, Playlist $playlist): int => $playlist->getItems()->count());

        yield CollectionField::new('items', 'Треки')
            ->useEntryCrudForm(PlaylistItemCrudController::class)
            ->setEntryIsComplex(true)
            ->allowAdd()
            ->allowDelete()
            ->setFormTypeOption('by_reference', false)
            ->setColumns(12)
            ->setHelp('Добавьте треки из каталога и при необходимости задайте порядок.')
            ->hideOnIndex();
    }

    public function persistEntity(EntityManagerInterface $entityManager, mixed $entityInstance): void
    {
        \assert($entityInstance instanceof Playlist);
        $this->syncItems($entityInstance);
        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity(EntityManagerInterface $entityManager, mixed $entityInstance): void
    {
        \assert($entityInstance instanceof Playlist);
        $this->syncItems($entityInstance);
        parent::updateEntity($entityManager, $entityInstance);
    }

    private function syncItems(Playlist $playlist): void
    {
        $order = 1;
        foreach ($playlist->getItems() as $item) {
            $item->setPlaylist($playlist);
            if ($item->getSortOrder() <= 0) {
                $item->setSortOrder($order);
            }
            ++$order;
        }
    }
}
