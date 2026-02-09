import { useMutation, useQuery } from "convex/react";
import { Button, Modal } from "react-bootstrap";
import { api } from "../../../../../convex/_generated/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import InputComponent from "../../../../../shared/input";
import { useState, useEffect } from "react";

type FormData = {
  id: Id<'reservations'>;
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

export function FormComponent({
  id,
  roomId,
  checkInDate,
  checkOutDate,
  numberOfGuests,
  rate,
  totalAmount,
  depositAmount,
  status,
  source,
  specialRequests,
  propertyId,
}: {
  id: Id<'reservations'>;
  roomId: string;
  checkInDate: number;
  checkOutDate: number;
  numberOfGuests: number;
  rate: number;
  totalAmount: number;
  depositAmount?: number;
  status: string;
  source?: string;
  specialRequests?: string;
  propertyId: string;
}) {
  const updateReservation = useMutation(api.reservations.updateReservation);
  const roomsResponse = useQuery(api.rooms.getAllRooms, { propertyId: propertyId as Id<'properties'> });
  
  const rooms = roomsResponse?.data || [];
  const [nights, setNights] = useState<number>(1);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);

  const formatDateForInput = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      roomId: roomId,
      checkInDate: formatDateForInput(checkInDate),
      checkOutDate: formatDateForInput(checkOutDate),
      numberOfGuests: numberOfGuests,
      rate: rate,
      totalAmount: totalAmount,
      depositAmount: depositAmount,
      status: status as 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled',
      source: source as 'direct' | 'ota' | 'walk-in' | 'phone' | 'other' | undefined,
      specialRequests: specialRequests || '',
    },
  });

  const watchCheckIn = watch('checkInDate');
  const watchCheckOut = watch('checkOutDate');
  const watchRate = watch('rate');

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

  const onSubmit: SubmitHandler<FormData | FieldValues> = async (data) => {
    try {
      const checkInTimestamp = new Date(data.checkInDate as string).getTime();
      const checkOutTimestamp = new Date(data.checkOutDate as string).getTime();

      const response = await updateReservation({
        reservationId: id,
        roomId: data.roomId as Id<'rooms'>,
        checkInDate: checkInTimestamp,
        checkOutDate: checkOutTimestamp,
        numberOfGuests: data.numberOfGuests as number,
        rate: data.rate as number,
        totalAmount: data.totalAmount as number,
        depositAmount: data.depositAmount,
        status: data.status as 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled',
        source: data.source as 'direct' | 'ota' | 'walk-in' | 'phone' | 'other' | undefined,
        specialRequests: data.specialRequests || undefined,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success("Reservation updated successfully!");
        console.log("Reservation updated with ID:", response);

        // Redirect to reservation page after submission
        setTimeout(() => {
          window.location.href = "/admin/room-management/reservation";
        }, 2000);
      }
    } catch (error: any) {
      console.error("Edit reservation failed:", error);
      toast.error("Failed to update reservation. Please try again.");
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

  const availableRooms = rooms.filter((room: any) => room.isActive);

  const roomOptions = availableRooms.map((room: any) => ({
    value: room._id,
    label: `${room.roomNumber} - ${room.roomType?.name || 'N/A'} (${room.status})`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='editReservationForm'>
      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <div className="w-full">
          <label htmlFor="roomId" className="block text-sm font-medium mb-1">Room *</label>
          <select
            id="roomId"
            {...register('roomId', { required: true })}
            className="w-full border rounded p-2"
          >
            {roomOptions.map((option) => (
              <option key={option.value} value={option.value} selected={option.value === roomId}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.roomId && <span className="text-red-500 text-sm">{errors.roomId.message}</span>}
        </div>
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='checkInDate'
          label='Check-in Date *'
          type='date'
          inputWidth='w-1/2'
          register={register('checkInDate', { required: true })}
          error={errors.checkInDate}
        />

        <InputComponent
          id='checkOutDate'
          label='Check-out Date *'
          type='date'
          inputWidth='w-1/2'
          register={register('checkOutDate', { required: true })}
          error={errors.checkOutDate}
        />
      </div>

      {nights > 0 && (
        <div className="w-full mb-4 p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-700">
            <strong>Nights:</strong> {nights} | <strong>Rate per night:</strong> ${watchRate.toFixed(2)} | <strong>Total:</strong> ${calculatedTotal.toFixed(2)}
          </p>
        </div>
      )}

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='numberOfGuests'
          label='Number of Guests *'
          type='number'
          inputWidth='w-1/2'
          register={register('numberOfGuests', { valueAsNumber: true, required: true })}
          error={errors.numberOfGuests}
        />

        <InputComponent
          id='rate'
          label='Rate per Night *'
          type='number'
          inputWidth='w-1/2'
          register={register('rate', { valueAsNumber: true, required: true })}
          error={errors.rate}
        />
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='totalAmount'
          label='Total Amount *'
          type='number'
          inputWidth='w-1/2'
          register={register('totalAmount', { valueAsNumber: true, required: true })}
          error={errors.totalAmount}
        />

        <InputComponent
          id='depositAmount'
          label='Deposit Amount'
          type='number'
          inputWidth='w-1/2'
          register={register('depositAmount', { valueAsNumber: true })}
          error={errors.depositAmount}
        />
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <div className="flex-1">
          <label htmlFor="status" className="block text-sm font-medium mb-1">Status *</label>
          <select
            id="status"
            {...register('status', { required: true })}
            className="w-full border rounded p-2"
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
          <label htmlFor="source" className="block text-sm font-medium mb-1">Booking Source</label>
          <select
            id="source"
            {...register('source')}
            className="w-full border rounded p-2"
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

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <div className="w-full">
          <label htmlFor="specialRequests" className="block text-sm font-medium mb-1">Special Requests</label>
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

      <Modal.Footer>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" variant='dark'>Submit</Button>
      </Modal.Footer>
    </form>
  );
}
