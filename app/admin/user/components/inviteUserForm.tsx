import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import { Button } from "react-bootstrap";
import { useState } from "react";

type FormData = {
  email: string;
  roleId: string;
  propertyId: string;
};

interface InviteUserFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function InviteUserForm({ onSuccess, onClose }: InviteUserFormProps) {
  const inviteUser = async (data: FormData) => {
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to send invitation');
        return false;
      }

      toast.success('Invitation sent successfully!');
      return true;
    } catch (error) {
      console.error('Invite user failed:', error);
      toast.error('Failed to send invitation. Please try again.');
      return false;
    }
  };

  // Fetch roles and properties for dropdowns
  const roles = useQuery(api.roles.getAllRoles) || { success: true, data: [] };
  const properties = useQuery(api.property.getAllProperties) || { success: true, data: [] };

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      email: '',
      roleId: '',
      propertyId: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const success = await inviteUser(data);
    if (success) {
      reset();
      setTimeout(() => {
        onSuccess();
        window.location.href = '/admin/user';
      }, 1500);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="inviteUserForm">
      <div className="w-full h-fit flex flex-col gap-4 mb-4">
        <InputComponent
          id="email"
          label="Email Address *"
          type="email"
          inputWidth="w-full"
          register={register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          error={errors.email}
        />

        <div className="w-full">
          <label htmlFor="roleId" className="block mb-2">Role *</label>
          <select
            id="roleId"
            {...register('roleId', { required: 'Role is required' })}
            className="w-full border rounded p-2"
          >
            <option value="">Select a role</option>
            {roles.data?.map((role) => (
              <option key={role._id} value={role._id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.roleId && <span className="text-red-500 text-sm">{errors.roleId.message}</span>}
        </div>

        <div className="w-full">
          <label htmlFor="propertyId" className="block mb-2">Property *</label>
          <select
            id="propertyId"
            {...register('propertyId', { required: 'Property is required' })}
            className="w-full border rounded p-2"
          >
            <option value="">Select a property</option>
            {properties.data?.map((property) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
          {errors.propertyId && <span className="text-red-500 text-sm">{errors.propertyId.message}</span>}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> The invited user will receive an email to sign up. Once they accept the invitation,
          they will be automatically assigned the selected role for the chosen property.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Send Invitation
        </Button>
      </div>
    </form>
  );
}