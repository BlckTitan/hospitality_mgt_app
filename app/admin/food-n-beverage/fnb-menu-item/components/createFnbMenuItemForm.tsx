import { useMutation } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button, Modal } from "react-bootstrap";
import { useState } from "react";
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

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess?: () => void; onClose?: () => void; propertyId: string }) {
  const createMenuItem = useMutation(api.fnbMenuItems.createFnbMenuItem);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      category: '',
      subcategory: '',
      price: 0,
      cost: 0,
      isAvailable: true,
      imageUrl: '',
      preparationTime: 0,
      isActive: true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createMenuItem({
        propertyId: propertyId as Id<'properties'>,
        name: data.name,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory,
        price: data.price,
        cost: data.cost,
        isAvailable: data.isAvailable,
        imageUrl: data.imageUrl,
        preparationTime: data.preparationTime,
        isActive: data.isActive,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Menu item created successfully!');
        reset();
        if (onSuccess) onSuccess();
        if (onClose) onClose();
        setTimeout(() => {
          window.location.href = '/admin/food-n-beverage/fnb-menu-item';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Create menu item failed:', error);
      toast.error('Failed to create menu item. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createFnbMenuItemForm'>
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
          step='0.01'
          placeholder='0.00'
          register={register('price', { required: true, valueAsNumber: true })}
          error={errors.price}
        />

        <InputComponent
          id='cost'
          label='Cost'
          type='number'
          inputWidth='w-1/2'
          step='0.01'
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

        <InputComponent
          id='isAvailable'
          label='Available'
          type='select'
          inputWidth='w-1/2'
          register={register('isAvailable')}
          options={[
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' }
          ]}
          error={errors.isAvailable}
        />
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='isActive'
          label='Status'
          type='select'
          inputWidth='w-full'
          register={register('isActive')}
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' }
          ]}
          error={errors.isActive}
        />
      </div>

      <Modal.Footer>
        <Button type='submit' variant='dark'>Submit</Button>
      </Modal.Footer>
    </form>
  );
}
