'use client';

import { useMutation } from 'convex/react';
import { Resolver, SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'sonner';
import { Button } from '../../../../../shared/button';
import InputComponent from '../../../../../shared/input';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { recordName } from '../../../../../lib/yupFields';

type CategoryFormData = { name: string };

const formSchema: yup.ObjectSchema<CategoryFormData> = yup.object({
  name: recordName('Category name', { min: 2, max: 40 }),
});

export function CreateExpenseCategoryForm({
  propertyId,
  onClose,
}: {
  propertyId: Id<'properties'>;
  onClose: () => void;
}) {
  const createCategory = useMutation(api.expenseCategories.createExpenseCategory);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CategoryFormData>({
    resolver: yupResolver(formSchema) as Resolver<CategoryFormData>,
    defaultValues: { name: '' },
  });

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
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
        placeholder="e.g. Marketing"
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
