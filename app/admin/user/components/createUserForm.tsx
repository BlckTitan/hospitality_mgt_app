import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import { Button, Modal } from "react-bootstrap";

type FormData = {
  email: string;
  name: string;
  phone?: string;
  isActive: boolean | string;
};

export function FormComponent({ onSuccess, onClose }: { onSuccess?: () => void; onClose?: () => void }) {
  const createUser = useMutation(api.user.createUser);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      isActive: true,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createUser({
        email: data.email,
        name: data.name,
        phone: data.phone || undefined,
        isActive: typeof data.isActive === 'string' ? data.isActive === 'true' : data.isActive,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success("New user created successfully!");
        console.log("User created with ID:", response.id);

        if (onSuccess) onSuccess();
        if (onClose) onClose();

        // Reload page after submission
        setTimeout(() => {
          window.location.href = "/admin/user";
        }, 2000);
      }
    } catch (error: any) {
      console.error("Add new user failed:", error);
      toast.error("Failed to add new user. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createUserForm'>
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
          <select className="border rounded p-2" defaultValue='true' {...register("isActive", { required: true })}>
            <option value='true'>Active</option>
            <option value='false'>Inactive</option>
          </select>
          {errors.isActive && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>
      </div>

      <Modal.Footer>
        <Button type="submit" variant='dark'>Submit</Button>
      </Modal.Footer>
    </form>
  );
}

