<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Track;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

/** Вложенная форма: порядок треков альбома (drag-and-drop). */
final class AlbumTrackCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Track::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Трек')
            ->setEntityLabelInPlural('Треки');
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->disable(Action::INDEX, Action::NEW, Action::DETAIL, Action::DELETE, Action::EDIT);
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('title', 'Трек')
            ->setFormTypeOption('disabled', true)
            ->setColumns(12);
        yield IntegerField::new('trackNumber', '№')
            ->setFormTypeOption('attr', ['class' => 'om-sort-order-input'])
            ->setColumns(12)
            ->setLabel(false);
    }
}
