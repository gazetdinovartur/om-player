<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use EasyCorp\Bundle\EasyAdminBundle\Field\Field;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Session\Flash\FlashBagInterface;

trait AdminCoverUploadTrait
{
    abstract protected function getRequestStack(): RequestStack;

    protected function coverUploadField(): Field
    {
        return Field::new('coverUpload', 'Загрузить обложку')
            ->setFormType(FileType::class)
            ->setFormTypeOptions([
                'mapped' => false,
                'required' => false,
                'attr' => [
                    'accept' => 'image/jpeg,image/png,image/webp,image/gif',
                    'class' => 'om-cover-upload-input',
                ],
            ])
            ->onlyOnForms()
            ->setColumns(12)
            ->setHelp('JPG, PNG или WebP, до 8 МБ. Оставьте пустым, чтобы не менять текущую обложку.');
    }

    protected function coverPreviewField(): Field
    {
        return Field::new('coverPreview', 'Текущая')
            ->setPropertySuffix('Preview')
            ->setFormType(HiddenType::class)
            ->setFormTypeOptions([
                'mapped' => false,
                'required' => false,
            ])
            ->onlyWhenUpdating()
            ->hideOnIndex()
            ->hideOnDetail()
            ->setTemplatePath('admin/field/cover_preview.html.twig')
            ->setColumns(12);
    }

    protected function flashCoverUploadError(\Throwable $e): void
    {
        $request = $this->getRequestStack()->getCurrentRequest();
        if ($request === null) {
            return;
        }

        $flashBag = $request->getSession()->getFlashBag();
        if ($flashBag instanceof FlashBagInterface) {
            $flashBag->add('danger', $e->getMessage());
        }
    }
}
