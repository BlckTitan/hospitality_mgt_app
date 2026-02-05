import { useMutation } from "convex/react";
import { SubmitHandler, useForm, FieldValues } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: number;
  cost?: number;
  isAvailable: boolean;
  imageUrl?: string;
  preparationTime?: number;
  isActive: boolean;
};

interface FnbMenuItem {
  _id: string;
  propertyId: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: number;
  cost?: number;
  isAvailable: boolean;
  imageUrl?: string;
  preparationTime?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export function EditFnbMenuItemForm({
  menuItem,
  onSuccess,
  onClose,
}: {
  menuItem: FnbMenuItem;
  onSuccess?: () => void;
  onClose?: () => void;
}) {
  const updateMenuItem = useMutation(api.fnbMenuItems.updateFnbMenuItem);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: menuItem.name,
      description: menuItem.description || '',
      category: menuItem.category,
      subcategory: menuItem.subcategory || '',
      price: menuItem.price,
      cost: menuItem.cost || 0,
      isAvailable: menuItem.isAvailable,
      imageUrl: menuItem.imageUrl || '',
      preparationTime: menuItem.preparationTime || 0,
      isActive: menuItem.isActive,
    },
  });

  const onSubmit: SubmitHandler<FormData | FieldValues> = async (data) => {
    try {
      const response = await updateMenuItem({
        menuItemId: menuItem._id as Id<'fnbMenuItems'>,
        name: data.name as string,
        description: data.description,
        category: data.category as string,
        subcategory: data.subcategory,
        price: data.price as number,
        cost: data.cost,
        isAvailable: data.isAvailable as boolean,
        imageUrl: data.imageUrl,
        preparationTime: data.preparationTime,
        isActive: data.isActive as boolean,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Menu item updated successfully!');
        if (onSuccess) onSuccess();
        if (onClose) onClose();
        setTimeout(() => {
          window.location.href = '/admin/food-n-beverage/fnb-menu-item';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update menu item failed:', error);
      toast.error('Failed to update menu item. Please try again.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className='mt-4'>
        <div
          className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
        >
          <InputComponent
            id='name'
            label='Menu Item Name *'
            type='string'
            inputWidth='w-full'
            placeholder='e.g., Grilled Salmon'
            register={register('name', { required: true })}
            error={errors.name}
          />
        </div>

        <div
          className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
        >
          <InputComponent
            id='description'
            label='Description'
            type='string'
            inputWidth='w-full'
            placeholder='Describe the menu item'
            register={register('description')}
            error={errors.description}
          />
        </div>

        <div
          className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
        >
          <InputComponent
            id='category'
            label='Category *'
            type='string'
            inputWidth='w-1/2'
            placeholder='e.g., Main Course, Appetizer'
            register={register('category', { required: true })}
            error={errors.category}
          />

          <InputComponent
            id='subcategory'
            label='Subcategory'
            type='string'
            inputWidth='w-1/2'
            placeholder='e.g., Alcoholic, Non-Alcoholic'
            register={register('subcategory')}
            error={errors.subcategory}
          />
        </div>

        <div
          className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
        >
          <InputComponent
            id='price'
            label='Price *'
            type='number'
            inputWidth='w-1/2'
            // step='0.01'
            placeholder='0.00'
            register={register('price', { required: true, valueAsNumber: true })}
            error={errors.price}
          />

          <InputComponent
            id='cost'
            label='Cost'
            type='number'
            inputWidth='w-1/2'
            // step='0.01'
            placeholder='0.00'
            register={register('cost', { valueAsNumber: true })}
            error={errors.cost}
          />
        </div>

        <div
          className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
        >
          <InputComponent
            id='imageUrl'
            label='Image URL'
            type='url'
            inputWidth='w-full'
            placeholder='https://example.com/image.jpg'
            register={register('imageUrl')}
            error={errors.imageUrl}
          />
        </div>

        <div
          className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
        >
          <InputComponent
            id='preparationTime'
            label='Preparation Time (mins)'
            type='number'
            inputWidth='w-1/2'
            placeholder='15'
            register={register('preparationTime', { valueAsNumber: true })}
            error={errors.preparationTime}
          />

          <div className='w-1/2'>
            <label htmlFor='isAvailable'>Available</label>
            <select
              id='isAvailable'
              {...register('isAvailable')}
              className='block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
            >
              <option value='true'>Yes</option>
              <option value='false'>No</option>
            </select>
            {errors.isAvailable && <span className='text-red-500 text-sm'>{errors.isAvailable.message}</span>}
          </div>
        </div>

        <div
          className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
        >
          <div className='w-full'>
            <label htmlFor='isActive'>Status</label>
            <select
              id='isActive'
              {...register('isActive')}
              className='block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
            >
              <option value='true'>Active</option>
              <option value='false'>Inactive</option>
            </select>
            {errors.isActive && <span className='text-red-500 text-sm'>{errors.isActive.message}</span>}
          </div>
        </div>

        <Button type='submit' variant='dark'>Submit</Button>
      </form>
    </>
  );
}
