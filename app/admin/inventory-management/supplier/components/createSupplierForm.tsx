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
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  taxId?: string;
  isActive: boolean;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess: () => void; onClose: () => void; propertyId: string }) {
  const createSupplier = useMutation(api.suppliers.createSupplier);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      paymentTerms: '',
      taxId: '',
      isActive: true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createSupplier({
        propertyId: propertyId as Id<'properties'>,
        name: data.name,
        contactPerson: data.contactPerson || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        paymentTerms: data.paymentTerms || undefined,
        taxId: data.taxId || undefined,
        isActive: data.isActive,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Supplier created successfully!');
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/inventory-management/supplier';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Add new supplier failed:', error);
      toast.error('Failed to add new supplier. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createSupplierForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="name"
            label="Supplier Name *"
            type="text"
            inputWidth="w-full"
            register={register('name', { required: true })}
            error={errors.name}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="contactPerson"
            label="Contact Person"
            type="text"
            inputWidth="w-full"
            register={register('contactPerson')}
            error={errors.contactPerson}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="email"
            label="Email"
            type="email"
            inputWidth="w-full"
            register={register('email')}
            error={errors.email}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="phone"
            label="Phone"
            type="text"
            inputWidth="w-full"
            register={register('phone')}
            error={errors.phone}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            {...register('address')}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Enter supplier address (optional)"
          />
          {errors.address && <span className="text-red-500 text-sm">{errors.address.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="paymentTerms"
            label="Payment Terms"
            type="text"
            inputWidth="w-full"
            register={register('paymentTerms')}
            error={errors.paymentTerms}
            placeholder="e.g., Net 30, Net 60"
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="taxId"
            label="Tax ID"
            type="text"
            inputWidth="w-full"
            register={register('taxId')}
            error={errors.taxId}
          />
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
        <span className="text-sm text-gray-500">Inactive suppliers will not appear in dropdowns</span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Create Supplier
        </Button>
      </div>
    </form>
  );
}
