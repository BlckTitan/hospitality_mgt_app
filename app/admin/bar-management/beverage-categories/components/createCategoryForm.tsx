'use client';

import { useMutation } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'sonner';
import { Button } from '../../../../../shared/button';
import InputComponent from '../../../../../shared/input';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { recordName } from '../../../../../lib/yupFields';

type FormData = { name: string };

const formSchema = yup.object({
  name: recordName('Category name', { min: 2, max: 40 }),
});

export function CreateBeverageCategoryForm({
  propertyId,
  onClose,
}: {
  propertyId: Id<'properties'>;
  onClose: () => void;
}) {
  const createCategory = useMutation(api.beverageCategories.createBeverageCategory);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema),
    defaultValues: { name: '' },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const response = await createCategory({ propertyId, name: data.name });
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    toast.success(response.message);
    reset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <InputComponent
        id="name"
        label="Category name *"
        type="text"
        inputWidth="w-full"
        placeholder="e.g. Craft beer"
        register={register('name')}
        error={errors.name}
      />
      <div className="flex gap-2 justify-end mt-4">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Create category</Button>
      </div>
    </form>
  );
}
