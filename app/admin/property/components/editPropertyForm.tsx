'use client'

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { propertyFormSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import ImageUpload from "../../../../shared/imageUpload";
import { currencies, timezones } from "../../../../lib/data";
import { Button } from '../../../../shared/button';
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
    country?: string;
    isActive: boolean;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
  };

  
export function FormComponent(
  {
    id, name, address, phone, email, 
    timezone, currency, taxId, country, isActive,
    logoUrl: initialLogoUrl,
    coverImageUrl: initialCoverImageUrl,
  }: {
    id: Id<'properties'>;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    timezone?: string;
    currency?: string;
    taxId?: string;
    country?: string;
    isActive: boolean;
    logoUrl?: string;
    coverImageUrl?: string;
  }) {
    const updateProperty = useMutation(api.property.updateProperty);
  
    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
      resolver: yupResolver(propertyFormSchema) as any,
      defaultValues: {
        name: name,
        address: address,
        phone: phone,
        email: email,
        timezone: timezone,
        currency: currency,
        taxId: taxId,
        country: country || 'NG',
        isActive: isActive,
        logoUrl: initialLogoUrl || null,
        coverImageUrl: initialCoverImageUrl || null,
      },
    });

    const logoUrl = watch('logoUrl');
    const coverImageUrl = watch('coverImageUrl');
  
    const onSubmit: SubmitHandler<FormData> = async (data) => {
      try {
        const response = await updateProperty({
          property_id: id,
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          timezone: data.timezone || 'UTC',
          currency: data.currency || 'USD',
          taxId: data.taxId,
          country: data.country,
          isActive: data.isActive,
          logoUrl: data.logoUrl ? data.logoUrl : null,
          coverImageUrl: data.coverImageUrl ? data.coverImageUrl : null,
        });
  
        if (response.success === false) {
          toast.error(response.message);
        } else {
          toast.success('Property edited successfully!');
          reset();
          setTimeout(() => {
            window.location.href = '/admin/property';
          }, 1500);
        }
      } catch (error: any) {
        console.error('Edit property failed:', error);
        toast.error('Failed to edit property. Please try again.');
      }
    };
  
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="createPropertyForm w-full max-w-full min-w-0 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 w-full min-w-0">
          <ImageUpload
            id="logoUrl"
            label="Property logo"
            folder="properties/logos"
            inputWidth="w-full"
            value={logoUrl || null}
            onChange={(url) => setValue('logoUrl', url, { shouldValidate: true, shouldDirty: true })}
            error={errors.logoUrl}
          />
          <ImageUpload
            id="coverImageUrl"
            label="Cover image"
            folder="properties/covers"
            inputWidth="w-full"
            value={coverImageUrl || null}
            onChange={(url) => setValue('coverImageUrl', url, { shouldValidate: true, shouldDirty: true })}
            error={errors.coverImageUrl}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4 w-full min-w-0">
          <InputComponent
            id="name"
            label="Property Name *"
            type="string"
            inputWidth="w-full"
            register={register('name', { required: true })}
            error={errors.name}
          />

          <InputComponent
            id="email"
            label="Email"
            type="email"
            inputWidth="w-full"
            register={register('email')}
            error={errors.email}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-4 w-full min-w-0">
          <InputComponent
            id="phone"
            label="Phone"
            type="tel"
            inputWidth="w-full"
            register={register('phone')}
            error={errors.phone}
          />

          <div className="min-w-0 lg:col-span-2">
            <InputComponent
              id="address"
              label="Address"
              type="string"
              inputWidth="w-full"
              register={register('address')}
              error={errors.address}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4 w-full min-w-0">
          <div className="min-w-0 w-full">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              {...register('timezone')}
              defaultValue="UTC"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            {errors.timezone && <span className="text-red-500 text-sm">{errors.timezone.message}</span>}
          </div>

          <div className="min-w-0 w-full">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              {...register('currency')}
              defaultValue="USD"
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
            inputWidth="w-full"
            register={register('taxId')}
            error={errors.taxId}
          />
          <div className="min-w-0 w-full">
            <label htmlFor="country">Country</label>
            <select id="country" {...register('country')}>
              <option value="NG">Nigeria (NG)</option>
              <option value="GH">Ghana (GH)</option>
              <option value="KE">Kenya (KE)</option>
              <option value="ZA">South Africa (ZA)</option>
              <option value="GB">United Kingdom (GB)</option>
              <option value="US">United States (US)</option>
              <option value="generic">Other / generic</option>
            </select>
          </div>
        </div>

        <div className="w-full min-w-0 flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
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
          <Button variant="secondary">
            Cancel
          </Button>
          <Button variant="dark" type="submit">
            Edit Property
          </Button>
        </div>
      </form>
    );
  }
