'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { Spinner } from 'react-bootstrap';
import { api } from '../../../convex/_generated/api';
import { currencies, timezones } from '../../../lib/data';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { propertySetupSchema } from './validation';
import InputComponent from '../../../shared/input';
import SelectComponent from '../../../shared/select';

interface PropertyFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  timezone: string;
  currency: string;
  taxId?: string;
}

export default function PropertySetupPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const createProperty = useMutation(api.property.createProperty);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormData>({
    resolver: yupResolver(propertySetupSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      timezone: 'UTC',
      currency: 'USD',
      taxId: '',
    },
  });

  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Spinner size="sm" variant="dark" />
      </div>
    );
  }

  if (!userId) {
    return router.push('/sign-up');
  }

  const onSubmit: SubmitHandler<PropertyFormData> = async (data) => {
    setLoading(true);
    try {
      const response = await createProperty({
        name: data.name,
        address: data.address || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        timezone: data.timezone || 'UTC',
        currency: data.currency || 'USD',
        taxId: data.taxId || undefined,
        isActive: true,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Property created successfully!');
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Property creation failed:', error);
      toast.error('Failed to create property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full min-h-screen bg-white flex justify-center items-center p-2 lg:p-0 py-8">
      <div className="w-full lg:w-[700px] rounded-md flex flex-col items-center justify-center gap-4">
        {/* Header */}
        <header className="w-full h-fit flex flex-col items-center justify-center gap-1">
          <div className="flex flex-col items-center justify-center gap-1">
            <h1 className="site_main_title">Welcome</h1>
            <h1 className="site_main_title">Hospitality Manager</h1>
          </div>
          <p className="text-center text-gray-600 text-lg">
            Let's set up your first property to get started
          </p>
          <p className="text-center text-gray-500 text-sm max-w-md">
            Create your property profile with basic details like name, location, and preferred settings.
          </p>
        </header>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full h-fit flex flex-col gap-1 px-4 lg:px-0"
        >
          {/* Row 1: Property Name and Email */}
          <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
            <InputComponent
              id="name"
              label="Property Name *"
              type="text"
              inputWidth="w-1/2"
              register={register('name', { required: true })}
              error={errors.name}
            />

            <InputComponent
              id="email"
              label="Email Address"
              type="email"
              inputWidth="w-1/2"
              register={register('email')}
              error={errors.email}
            />
          </div>

          {/* Row 2: Contact Number and Address */}
          <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
            <InputComponent
              id="phone"
              label="Phone"
              type="tel"
              inputWidth="w-2/5"
              register={register('phone')}
              error={errors.phone}
            />

            <InputComponent
              id="address"
              label="Address"
              type="text"
              inputWidth="w-3/5"
              register={register('address')}
              error={errors.address}
            />
          </div>

          {/* Row 3: Timezone and Currency */}
          <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
            <SelectComponent
              id="timezone"
              label="Timezone"
              data={timezones.map(tz => ({
                state: tz.value,
                lgas: [tz.label],
              }))}
              register={register('timezone')}
              error={errors.timezone}
              selectWidth="w-1/2"
              defaultText="Select Timezone"
            />

            <SelectComponent
              id="currency"
              label="Currency"
              data={currencies.map(curr => ({
                state: curr.value,
                lgas: [curr.label],
              }))}
              register={register('currency')}
              error={errors.currency}
              selectWidth="w-1/2"
              defaultText="Select Currency"
            />
          </div>

          {/* Row 4: Tax ID */}
          <div className="w-full">
            <InputComponent
              id="taxId"
              label="Tax ID (Optional)"
              type="text"
              inputWidth="w-full"
              register={register('taxId')}
              error={errors.taxId}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-2 !rounded-sm !mt-6 transition duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" variant="light" />
                Creating Property...
              </>
            ) : (
              'Create Property & Continue'
            )}
          </button>

          {/* Divider */}
          <div className="w-full flex items-center gap-1 my-2">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Skip Option */}
          <button
            type="button"
            onClick={() => router.push('/admin/dashboard')}
            disabled={loading}
            className="w-full border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-medium py-2 !rounded-sm transition duration-200"
          >
            Skip for Now
          </button>
        </form>

        {/* Footer Info */}
        <div className="w-full mt-2 pt-2 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Hospitality Manager. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
}
