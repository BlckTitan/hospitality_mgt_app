import { useMutation } from "convex/react";
import { Button } from "react-bootstrap";
import { api } from "../../../../convex/_generated/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";

type FormData = {
  id: Id<'users'>;
  email: string;
  name: string;
  phone?: string;
  isActive: boolean | string;
  lastLoginAt?: number;
};

export function FormComponent({
  id,
  externalId,
  email,
  name,
  phone,
  isActive,
  lastLoginAt,
}: {
  id: Id<'users'>;
  externalId: string;
  email: string;
  name: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: number;
}) {
  const updateUser = useMutation(api.user.updateUser);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      email: email,
      name: name,
      phone: phone || '',
      isActive: isActive,
    },
  });

  const onSubmit: SubmitHandler<FormData | FieldValues> = async (data) => {
    try {
      const response = await updateUser({
        userId: id,
        email: data.email,
        name: data.name,
        phone: data.phone || undefined,
        isActive: data.isActive === true || data.isActive === 'true',
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success("User updated successfully!");
        console.log("User updated with ID:", response);

        // Redirect to user page after submission
        setTimeout(() => {
          window.location.href = "/admin/user";
        }, 2000);
      }
    } catch (error: any) {
      console.error("Edit user failed:", error);
      toast.error("Failed to update user. Please try again.");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className='mt-4'>
        {externalId && (
          <div className='mb-4 p-3 bg-gray-50 rounded border'>
            <label className='block text-sm font-medium text-gray-700 mb-1'>External ID (SSO)</label>
            <div className='text-sm text-gray-600'>{externalId}</div>
            <p className='text-xs text-gray-500 mt-1'>This is automatically set when the user signs in with SSO (e.g., Google). It cannot be manually edited.</p>
          </div>
        )}

        <div
          className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
        >
          <InputComponent
            id='name'
            label='Name'
            type='string'
            inputWidth='w-full'
            placeholder="Surname middlename firstname"
            register={register("name", { required: true })}
            error={errors.name}
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
            register={register("email", { required: true })}
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
          className='w-full h-fit flex flex-col items-start justify-center lg:flex-row lg:justify-start lg:items-center gap-1 
          [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-4'
        >
          <div className='w-full lg:w-1/2'>
            <label htmlFor="isActive">Active Status</label>
            <select className="border rounded p-2" defaultValue={isActive ? 'true' : 'false'} {...register("isActive", { required: true })}>
              <option value='true'>Active</option>
              <option value='false'>Inactive</option>
            </select>
            {errors.isActive && <span className='text-red-500 text-sm'>This field is required</span>}
          </div>
        </div>

        <Button type="submit" variant='dark'>Submit</Button>
      </form>
    </>
  );
}

