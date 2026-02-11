import { useMutation, useQuery } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { RecipeValidationSchema, RecipeValidationType } from './validation';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import InputComponent from '../../../../../shared/input';
import { Button, Modal } from 'react-bootstrap';

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess?: () => void; onClose?: () => void; propertyId?: string }) {
  const createRecipe = useMutation(api.recipes.createRecipe);
  const properties = useQuery(api.property.getAllProperties);
  const fnbMenuItems = useQuery(api.fnbMenuItems.getAllFnbMenuItems, 
    properties && properties.data && properties.data[0] ? { propertyId: properties.data[0]._id } : 'skip'
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipeValidationType>({
    resolver: yupResolver(RecipeValidationSchema) as any,
    defaultValues: {
      menuItemId: '',
      name: '',
      servings: undefined,
      instructions: '',
    },
  });

  const onSubmit: SubmitHandler<RecipeValidationType> = async (data) => {
    try {
      const response = await createRecipe({
        menuItemId: data.menuItemId as any,
        name: data.name,
        servings: data.servings,
        instructions: data.instructions,
      });

      if (response.success) {
        toast.success('Recipe created successfully');
        if (onSuccess) onSuccess();
        if (onClose) onClose();
        setTimeout(() => {
          window.location.href = '/admin/food-n-beverage/recipe';
        }, 1500);
      } else {
        toast.error(response.message || 'Failed to create recipe');
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to create recipe');
    }
  };

  const menuItems = fnbMenuItems?.data || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createRecipeForm'>
      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <div className="w-full">
          <label htmlFor='menuItemId' className='block text-sm font-medium mb-1'>
            Menu Item *
          </label>
          <select
            id='menuItemId'
            {...register('menuItemId')}
            className={`w-full border rounded p-2 ${errors.menuItemId ? 'border-red-500' : ''}`}
          >
            <option value=''>Select a menu item</option>
            {menuItems.map((item: any) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
          {errors.menuItemId && (
            <span className='text-red-500 text-sm'>{errors.menuItemId.message}</span>
          )}
        </div>
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='name'
          label='Name *'
          type='text'
          inputWidth='w-1/2'
          placeholder='Recipe name'
          register={register('name')}
          error={errors.name}
        />

        <InputComponent
          id='servings'
          label='Servings'
          type='number'
          inputWidth='w-1/2'
          placeholder='Number of servings'
          register={register('servings', { valueAsNumber: true })}
          error={errors.servings}
        />
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <div className='w-full'>
          <label htmlFor='instructions' className='block text-sm font-medium mb-1'>
            Instructions *
          </label>
          <textarea
            id='instructions'
            placeholder='Recipe instructions'
            {...register('instructions')}
            className={`w-full border rounded p-2 ${errors.instructions ? 'border-red-500' : ''}`}
            rows={4}
          />
          {errors.instructions && (
            <span className='text-red-500 text-sm'>{errors.instructions.message}</span>
          )}
        </div>
      </div>

      <Modal.Footer>
        <Button variant='secondary' onClick={onClose}>
          Cancel
        </Button>
        <Button type='submit' variant='dark'>
          Create Recipe
        </Button>
      </Modal.Footer>
    </form>
  );
}
