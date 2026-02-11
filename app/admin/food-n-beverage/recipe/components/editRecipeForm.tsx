import { useMutation } from 'convex/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { RecipeValidationSchema } from './validation';
import type { RecipeValidationType } from './validation';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import InputComponent from '../../../../../shared/input';
import { Button, Modal } from 'react-bootstrap';

export function EditFormComponent({ recipe, onSuccess, onClose }: { recipe: any; onSuccess?: () => void; onClose?: () => void }) {
  const updateRecipe = useMutation(api.recipes.updateRecipe);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipeValidationType>({
    resolver: yupResolver(RecipeValidationSchema) as any,
    defaultValues: {
      menuItemId: recipe.menuItemId,
      name: recipe.name || '',
      servings: recipe.servings,
      instructions: recipe.instructions || '',
    },
  });

  const onSubmit: SubmitHandler<RecipeValidationType> = async (data) => {
    try {
      const response = await updateRecipe({
        recipeId: recipe._id,
        name: data.name,
        servings: data.servings,
        instructions: data.instructions,
      });

      if (response.success) {
        toast.success('Recipe updated successfully');
        if (onSuccess) onSuccess();
        if (onClose) onClose();
        setTimeout(() => {
          window.location.href = '/admin/food-n-beverage/recipe';
        }, 1500);
      } else {
        toast.error(response.message || 'Failed to update recipe');
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to update recipe');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='editRecipeForm'>
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
          Update Recipe
        </Button>
      </Modal.Footer>
    </form>
  );
}
