'use client'

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

type FormData = {
  roomNumber: string;
  roomTypeId: string;
  floor?: number;
  status: 'available' | 'occupied' | 'out-of-order' | 'maintenance';
  notes?: string;
  isActive: boolean;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createRoom = useMutation(api.rooms.createRoom);
  const roomTypesResponse = useQuery(api.roomTypes.getAllRoomTypes, { propertyId: propertyId as Id<'properties'> });
  const roomTypes = roomTypesResponse?.data || [];

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      roomNumber: '',
      roomTypeId: '',
      floor: undefined,
      status: 'available',
      notes: '',
      isActive: true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createRoom({
        propertyId: propertyId as Id<'properties'>,
        roomTypeId: data.roomTypeId as Id<'roomTypes'>,
        roomNumber: data.roomNumber,
        floor: data.floor,
        status: data.status,
        notes: data.notes,
        isActive: data.isActive,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Room created successfully!');
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/room-management/room';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Add new room failed:', error);
      toast.error('Failed to add new room. Please try again.');
    }
  };

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'out-of-order', label: 'Out of Order' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  const roomTypeOptions = roomTypes
    .filter((rt: any) => rt.isActive)
    .map((rt: any) => ({
      value: rt._id,
      label: `${rt.name} - $${rt.baseRate}/night`,
    }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createRoomForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <InputComponent
          id="roomNumber"
          label="Room Number *"
          type="text"
          inputWidth="w-full"
          register={register('roomNumber', { required: true })}
          error={errors.roomNumber}
        />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="roomTypeId" className="block mb-2">Room Type *</label>
          <select
            id="roomTypeId"
            {...register('roomTypeId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a room type</option>
            {roomTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.roomTypeId && <span className="text-red-500 text-sm">{errors.roomTypeId.message}</span>}
        </div>
        <div className="flex-1">
          <InputComponent
            id="floor"
            label="Floor"
            type="number"
            inputWidth="w-full"
            register={register('floor', { valueAsNumber: true })}
            error={errors.floor}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="status" className="block mb-2">Status *</label>
          <select
            id="status"
            {...register('status', { required: true })}
            className="w-full border rounded p-2"
            defaultValue="available"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status && <span className="text-red-500 text-sm">{errors.status.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Enter room notes (optional)"
          />
          {errors.notes && <span className="text-red-500 text-sm">{errors.notes.message}</span>}
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
        <span className="text-sm text-gray-500">Inactive rooms cannot be used for new bookings</span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Create Room
        </Button>
      </div>
    </form>
  );
}

