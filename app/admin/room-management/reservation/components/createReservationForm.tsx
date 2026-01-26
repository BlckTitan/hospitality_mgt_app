'use client';

import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect } from "react";

type FormData = {
  guestId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  rate: number;
  totalAmount: number;
  depositAmount?: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  source?: 'direct' | 'ota' | 'walk-in' | 'phone' | 'other';
  specialRequests?: string;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createReservation = useMutation(api.reservations.createReservation);
  const guestsResponse = useQuery(api.guests.getAllGuests, { propertyId: propertyId as Id<'properties'> });
  const roomsResponse = useQuery(api.rooms.getAllRooms, { propertyId: propertyId as Id<'properties'> });
  
  const guests = guestsResponse?.data || [];
  const rooms = roomsResponse?.data || [];

  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [nights, setNights] = useState<number>(1);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      guestId: '',
      roomId: '',
      checkInDate: '',
      checkOutDate: '',
      numberOfGuests: 1,
      rate: 0,
      totalAmount: 0,
      depositAmount: 0,
      status: 'pending',
      source: 'direct',
      specialRequests: '',
    },
  });

  const watchCheckIn = watch('checkInDate');
  const watchCheckOut = watch('checkOutDate');
  const watchRate = watch('rate');
  const watchRoomId = watch('roomId');

  // Calculate nights and total when dates or rate change
  useEffect(() => {
    if (watchCheckIn && watchCheckOut && watchRate) {
      const checkIn = new Date(watchCheckIn);
      const checkOut = new Date(watchCheckOut);
      const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        setNights(diffDays);
        const total = diffDays * watchRate;
        setCalculatedTotal(total);
        setValue('totalAmount', total);
      }
    }
  }, [watchCheckIn, watchCheckOut, watchRate, setValue]);

  // Set rate when room is selected
  useEffect(() => {
    if (watchRoomId) {
      const room = rooms.find((r: any) => r._id === watchRoomId);
      if (room?.roomType?.baseRate) {
        setValue('rate', room.roomType.baseRate);
        setSelectedRoom(watchRoomId);
      }
    }
  }, [watchRoomId, rooms, setValue]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const checkInTimestamp = new Date(data.checkInDate).getTime();
      const checkOutTimestamp = new Date(data.checkOutDate).getTime();

      const response = await createReservation({
        propertyId: propertyId as Id<'properties'>,
        roomId: data.roomId as Id<'rooms'>,
        guestId: data.guestId as Id<'guests'>,
        checkInDate: checkInTimestamp,
        checkOutDate: checkOutTimestamp,
        numberOfGuests: data.numberOfGuests,
        rate: data.rate,
        totalAmount: data.totalAmount,
        depositAmount: data.depositAmount,
        status: data.status,
        source: data.source,
        specialRequests: data.specialRequests,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success(`Reservation created successfully! Confirmation: ${response.confirmationNumber}`);
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/room-management/reservation';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Add new reservation failed:', error);
      toast.error('Failed to add new reservation. Please try again.');
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'checked-in', label: 'Checked In' },
    { value: 'checked-out', label: 'Checked Out' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const sourceOptions = [
    { value: 'direct', label: 'Direct' },
    { value: 'ota', label: 'OTA (Online Travel Agency)' },
    { value: 'walk-in', label: 'Walk-in' },
    { value: 'phone', label: 'Phone' },
    { value: 'other', label: 'Other' },
  ];

  const availableRooms = rooms.filter((room: any) => 
    room.isActive && (room.status === 'available' || room.status === 'occupied')
  );

  const guestOptions = guests.map((guest: any) => ({
    value: guest._id,
    label: `${guest.firstName} ${guest.lastName}${guest.email ? ` (${guest.email})` : ''}`,
  }));

  const roomOptions = availableRooms.map((room: any) => ({
    value: room._id,
    label: `${room.roomNumber} - ${room.roomType?.name || 'N/A'} (${room.status})`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createReservationForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="guestId" className="block mb-2">Guest *</label>
          <select
            id="guestId"
            {...register('guestId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a guest</option>
            {guestOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.guestId && <span className="text-red-500 text-sm">{errors.guestId.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="roomId" className="block mb-2">Room *</label>
          <select
            id="roomId"
            {...register('roomId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a room</option>
            {roomOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.roomId && <span className="text-red-500 text-sm">{errors.roomId.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="checkInDate"
            label="Check-in Date *"
            type="date"
            inputWidth="w-full"
            register={register('checkInDate', { required: true })}
            error={errors.checkInDate}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="checkOutDate"
            label="Check-out Date *"
            type="date"
            inputWidth="w-full"
            register={register('checkOutDate', { required: true })}
            error={errors.checkOutDate}
          />
        </div>
      </div>

      {nights > 0 && (
        <div className="w-full mb-4 p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-700">
            <strong>Nights:</strong> {nights} | <strong>Rate per night:</strong> {watchRate.toFixed(2)} | <strong>Total:</strong> {calculatedTotal.toFixed(2)}
          </p>
        </div>
      )}

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="numberOfGuests"
            label="Number of Guests *"
            type="number"
            inputWidth="w-full"
            register={register('numberOfGuests', { valueAsNumber: true, required: true })}
            error={errors.numberOfGuests}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="rate"
            label="Rate per Night *"
            type="number"
            inputWidth="w-full"
            register={register('rate', { valueAsNumber: true, required: true })}
            error={errors.rate}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="totalAmount"
            label="Total Amount *"
            type="number"
            inputWidth="w-full"
            register={register('totalAmount', { valueAsNumber: true, required: true })}
            error={errors.totalAmount}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="depositAmount"
            label="Deposit Amount"
            type="number"
            inputWidth="w-full"
            register={register('depositAmount', { valueAsNumber: true })}
            error={errors.depositAmount}
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
            defaultValue="pending"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status && <span className="text-red-500 text-sm">{errors.status.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="source" className="block mb-2">Booking Source</label>
          <select
            id="source"
            {...register('source')}
            className="w-full border rounded p-2"
            defaultValue="direct"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.source && <span className="text-red-500 text-sm">{errors.source.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full">
          <label htmlFor="specialRequests">Special Requests</label>
          <textarea
            id="specialRequests"
            {...register('specialRequests')}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Enter special requests or notes (optional)"
          />
          {errors.specialRequests && <span className="text-red-500 text-sm">{errors.specialRequests.message}</span>}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Create Reservation
        </Button>
      </div>
    </form>
  );
}
