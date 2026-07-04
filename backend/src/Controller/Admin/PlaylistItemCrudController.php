<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\PlaylistItem;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;

final class PlaylistItemCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return PlaylistItem::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Трек в плейлисте')
            ->setEntityLabelInPlural('Треки в плейлисте')
            ->setDefaultSort(['sortOrder' => 'ASC']);
    }

    public function configureFields(string $pageName): iterable
    {
        yield AssociationField::new('playlist', 'Плейлист');
        yield AssociationField::new('track', 'Трек');
        yield IntegerField::new('sortOrder', 'Порядок');
    }
}
