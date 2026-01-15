import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { toast } from "sonner";
import InputComponent from "../../../../../shared/input";
import { Button, Modal } from "react-bootstrap";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState, useEffect } from "react";

type FormData = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  loyaltyNumber?: string;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess?: () => void; onClose?: () => void; propertyId: string }) {
  const createGuest = useMutation(api.guests.createGuest);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      loyaltyNumber: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const dateOfBirthTimestamp = data.dateOfBirth ? new Date(data.dateOfBirth).getTime() : undefined;

      const response = await createGuest({
        propertyId: propertyId as Id<'properties'>,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        dateOfBirth: dateOfBirthTimestamp,
        loyaltyNumber: data.loyaltyNumber || undefined,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success("New guest created successfully!");
        console.log("Guest created with ID:", response.id);

        if (onSuccess) onSuccess();
        if (onClose) onClose();

        // Reload page after submission
        setTimeout(() => {
          window.location.href = "/admin/room-management/reservation/guest";
        }, 2000);
      }
    } catch (error: any) {
      console.error("Add new guest failed:", error);
      toast.error("Failed to add new guest. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createGuestForm'>
      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='firstName'
          label='First Name *'
          type='string'
          inputWidth='w-full'
          placeholder="First name"
          register={register("firstName", { required: true })}
          error={errors.firstName}
        />
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='lastName'
          label='Last Name *'
          type='string'
          inputWidth='w-full'
          placeholder="Last name"
          register={register("lastName", { required: true })}
          error={errors.lastName}
        />
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='email'
          label='Email'
          inputWidth='w-1/2'
          type='email'
          register={register("email")}
          error={errors.email}
        />

        <InputComponent
          id='phone'
          label='Phone'
          inputWidth='w-1/2'
          type='tel'
          register={register("phone")}
          error={errors.phone}
        />
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='address'
          label='Address'
          type='string'
          inputWidth='w-full'
          placeholder="Street address"
          register={register("address")}
          error={errors.address}
        />
      </div>

      <div
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >
        <InputComponent
          id='dateOfBirth'
          label='Date of Birth'
          inputWidth='w-1/2'
          type='date'
          register={register("dateOfBirth")}
          error={errors.dateOfBirth}
        />

        <InputComponent
          id='loyaltyNumber'
          label='Loyalty Number'
          inputWidth='w-1/2'
          type='string'
          placeholder="Loyalty program number"
          register={register("loyaltyNumber")}
          error={errors.loyaltyNumber}
        />
      </div>

      <Modal.Footer>
        <Button type="submit" variant='dark'>Submit</Button>
      </Modal.Footer>
    </form>
  );
}
