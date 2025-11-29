'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import BootstrapModal from '../../../shared/modal';
import Properties from './components/properties';
import { SubmitHandler, useForm } from 'react-hook-form';
import { propertyFormSchema } from './components/validation';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import InputComponent from '../../../shared/input';
import SelectComponent from '../../../shared/select';
import { currencies, timezones } from '../../../lib/data';

type FormData = {
  name: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  taxId?: string;
  isActive: boolean;
};

export default function PropertyPage() {
  const [modalShow, setModalShow] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Properties</h3>
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      </header>

      <Properties refreshTrigger={refreshTrigger} />

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1);
          setModalShow(false);
        }}
      />
    </div>
  );
}

function ModalComponent(props: { modalShow: boolean; setModalShow: (show: boolean) => void; onSuccess: () => void }) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Add New Property"
      body={<FormComponent onSuccess={props.onSuccess} onClose={() => props.setModalShow(false)} />}
    />
  );
}

function FormComponent({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const createProperty = useMutation(api.property.createProperty);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(propertyFormSchema) as any,
    defaultValues: {
      name: '',
      address: '',
      contactNumber: '',
      email: '',
      timezone: 'UTC',
      currency: 'USD',
      taxId: '',
      isActive: true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createProperty({
        name: data.name,
        address: data.address,
        contactNumber: data.contactNumber,
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
          onSuccess();
          window.location.href = '/admin/properties';
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
          id="contactNumber"
          label="Contact Number"
          type="tel"
          inputWidth="w-1/3"
          register={register('contactNumber')}
          error={errors.contactNumber}
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
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            {...register('isActive')}
            defaultChecked={true}
            className="mr-2"
          />
          <span>Active Property</span>
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Create Property
        </Button>
      </div>
    </form>
  );
}
