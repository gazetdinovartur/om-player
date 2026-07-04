<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\PlaylistItem;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;

/**
 * Используется только как вложенная форма в PlaylistCrudController (CollectionField).
 */
final class PlaylistItemCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return PlaylistItem::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Трек')
            ->setEntityLabelInPlural('Треки')
            ->setDefaultSort(['sortOrder' => 'ASC']);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->disable(Action::INDEX, Action::NEW, Action::DETAIL, Action::DELETE, Action::EDIT);
    }

    public function configureFields(string $pageName): iterable
    {
        yield AssociationField::new('track', 'Трек')
            ->setRequired(true)
            ->autocomplete()
            ->setColumns('col-12')
            ->setHelp('Начните вводить название — поиск по каталогу.');
        yield IntegerField::new('sortOrder', 'Порядок')
            ->setColumns('col-12 col-md-4')
            ->setHelp('0 — проставится автоматически при сохранении.');
    }
}
