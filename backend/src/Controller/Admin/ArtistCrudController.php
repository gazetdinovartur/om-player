<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Artist;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\SlugField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

final class ArtistCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Artist::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud->setEntityLabelInSingular('Артист')->setEntityLabelInPlural('Артисты');
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name', 'Имя');
        yield SlugField::new('slug', 'Slug')->setTargetFieldName('name');
        yield TextareaField::new('bio', 'Биография')->hideOnIndex();
    }
}
