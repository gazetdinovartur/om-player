<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Album;
use App\Enum\AlbumType;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\SlugField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

final class AlbumCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Album::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud->setEntityLabelInSingular('Альбом')->setEntityLabelInPlural('Альбомы');
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('title', 'Название');
        yield SlugField::new('slug', 'Slug')->setTargetFieldName('title');
        yield AssociationField::new('artist', 'Артист');
        yield ChoiceField::new('type', 'Тип')->setChoices([
            'Альбом' => AlbumType::STUDIO,
            'EP' => AlbumType::EP,
            'Сингл' => AlbumType::SINGLE,
            'Концертный' => AlbumType::LIVE,
            'Сборник' => AlbumType::COMPILATION,
        ]);
        yield DateField::new('releasedAt', 'Дата релиза');
        yield BooleanField::new('published', 'Опубликован');
        yield IntegerField::new('sortOrder', 'Порядок');
        yield TextareaField::new('description', 'Описание')->hideOnIndex();
        yield TextField::new('coverPath', 'Обложка')->hideOnIndex();
    }
}
