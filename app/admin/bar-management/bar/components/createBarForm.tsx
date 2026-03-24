'use client'

import { useMutation } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  name: string;
  location: string;
  barType: 'Main' | 'Lounge' | 'Seat Out';
  isActive: boolean;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createBar = useMutation(api.bars.createBar);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: '',
      location: '',
      barType: 'Main',
      isActive: true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createBar({
        propertyId: propertyId as Id<'properties'>,
        name: data.name,
        location: data.location,
        barType: data.barType,
        isActive: data.isActive,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Bar created successfully!');
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/bar-management/bar';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Add new bar failed:', error);
      toast.error('Failed to add new bar. Please try again.');
    }
  };

  const barTypeOptions = [
    { value: 'Main', label: 'Main' },
    { value: 'Lounge', label: 'Lounge' },
    { value: 'Seat Out', label: 'Seat Out' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createBarForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <InputComponent
          id="name"
          label="Bar Name *"
          type="text"
          inputWidth="w-full"
          register={register('name', { required: true })}
          error={errors.name}
        />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <InputComponent
          id="location"
          label="Location *"
          type="text"
          inputWidth="w-full"
          register={register('location', { required: true })}
          error={errors.location}
        />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="barType" className="block mb-2">Bar Type *</label>
          <select
            id="barType"
            {...register('barType', { required: true })}
            className="w-full border rounded p-2"
            defaultValue="main"
          >
            {barTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.barType && <span className="text-red-500 text-sm">{errors.barType.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <label className="flex !items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isActive')}
            defaultChecked={true}
            className="mr-2 !w-4 !h-3"
          />
          <span className='p-1 ml-2'>Active</span>
        </label>
        <span className="text-sm text-gray-500">Inactive bars cannot be used for operations</span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Create Bar
        </Button>
      </div>
    </form>
  );
}