<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Track;
use App\Enum\TrackType;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\SlugField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

final class TrackCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Track::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud->setEntityLabelInSingular('Трек')->setEntityLabelInPlural('Треки');
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('title', 'Название');
        yield SlugField::new('slug', 'Slug')->setTargetFieldName('title');
        yield AssociationField::new('album', 'Альбом');
        yield IntegerField::new('trackNumber', 'Номер');
        yield IntegerField::new('durationMs', 'Длительность, мс')->hideOnForm();
        yield TextField::new('audioPath', 'Аудиофайл')->hideOnIndex();
        yield BooleanField::new('published', 'Опубликован');
        yield ChoiceField::new('type', 'Тип')->setChoices([
            'Студийная' => TrackType::STUDIO,
            'Концертная' => TrackType::LIVE,
            'Демо' => TrackType::DEMO,
            'Репетиция' => TrackType::REHEARSAL,
        ]);
        yield TextField::new('genre', 'Жанр')->hideOnIndex();
        yield TextareaField::new('description', 'Описание')->hideOnIndex();
        yield TextareaField::new('credits', 'Участники')->hideOnIndex();
    }
}
