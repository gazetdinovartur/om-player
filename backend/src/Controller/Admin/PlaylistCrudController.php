<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Playlist;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
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
        return $crud->setEntityLabelInSingular('Плейлист')->setEntityLabelInPlural('Плейлисты');
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('title', 'Название');
        yield SlugField::new('slug', 'Slug')->setTargetFieldName('title');
        yield TextareaField::new('description', 'Описание')->hideOnIndex();
        yield BooleanField::new('isPublic', 'Публичный');
        yield IntegerField::new('sortOrder', 'Порядок');
    }
}
