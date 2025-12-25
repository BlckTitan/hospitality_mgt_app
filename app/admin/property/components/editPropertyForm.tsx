'use client'

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { propertyFormSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import { currencies, timezones } from "../../../../lib/data";
import { Button } from "react-bootstrap";
import { Id } from "../../../../convex/_generated/dataModel";


type FormData = {
    id: Id<'properties'>
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    timezone?: string;
    currency?: string;
    taxId?: string;
    isActive: boolean;
  };

  
export function FormComponent(/*{ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void },*/
  {
    id, name, address, phone, email, 
    timezone, currency, taxId, isActive
  }) {
    const updateProperty = useMutation(api.property.updateProperty);
  
    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
      resolver: yupResolver(propertyFormSchema) as any,
      defaultValues: {
        name: name,
        address: address,
        phone: phone,
        email: email,
        timezone: timezone,
        currency: currency,
        taxId: taxId,
        isActive: isActive,
      },
    });
  
    const onSubmit: SubmitHandler<FormData> = async (data) => {
      try {
        const response = await updateProperty({
          property_id: data.id,
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          timezone: data.timezone || 'UTC',
          currency: data.currency || 'USD',
          taxId: data.taxId,
          isActive: data.isActive,
        });
  
        if (response.success === false) {
          toast.error(response.message);
        } else {
          toast.success('Property created successfully!');
          reset();
          setTimeout(() => {
            window.location.href = '/admin/property';
          }, 1500);
        }
      } catch (error: any) {
        console.error('Add new property failed:', error);
        toast.error('Failed to add new property. Please try again.');
      }
    };
  
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="createPropertyForm">
        <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
          <InputComponent
            id="name"
            label="Property Name *"
            type="string"
            inputWidth="w-1/2"
            register={register('name', { required: true })}
            error={errors.name}
          />
  
          <InputComponent
            id="email"
            label="Email"
            type="email"
            inputWidth="w-1/2"
            register={register('email')}
            error={errors.email}
          />
        </div>
  
        <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
          <InputComponent
            id="phone"
            label="Phone"
            type="tel"
            inputWidth="w-1/3"
            register={register('phone')}
            error={errors.phone}
          />
  
          <InputComponent
            id="address"
            label="Address"
            type="string"
            inputWidth="w-2/3"
            register={register('address')}
            error={errors.address}
          />
        </div>
  
        <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
          <div className="w-full lg:w-1/3">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              {...register('timezone')}
              defaultValue="UTC"
              className="w-full"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            {errors.timezone && <span className="text-red-500 text-sm">{errors.timezone.message}</span>}
          </div>
  
          <div className="w-full lg:w-1/3">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              {...register('currency')}
              defaultValue="USD"
              className="w-full"
            >
              {currencies.map((curr) => (
                <option key={curr.value} value={curr.value}>
                  {curr.label}
                </option>
              ))}
            </select>
            {errors.currency && <span className="text-red-500 text-sm">{errors.currency.message}</span>}
          </div>
  
          <InputComponent
            id="taxId"
            label="Tax ID"
            type="string"
            inputWidth="w-1/3"
            register={register('taxId')}
            error={errors.taxId}
          />
        </div>
  
        <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('isActive')}
              defaultChecked={true}
              className="mr-2 !w-4 !h-4"
            />
            <span className='p-1 ml-2'>Active Property</span>
          </label>
        </div>
  
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" /*onClick={onClose}*/>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Create Property
          </Button>
        </div>
      </form>
    );
  }
  