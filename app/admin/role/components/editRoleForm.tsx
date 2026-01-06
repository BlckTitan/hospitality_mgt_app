'use client'

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import { Button } from "react-bootstrap";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { PERMISSION_GROUPS } from "../../../../lib/data";

type FormData = {
  id: Id<'roles'>;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions: Record<string, boolean>;
};

export function FormComponent({
  id, name, description, permissions: initialPermissions, isSystemRole
}: {
  id: Id<'roles'>;
  name: string;
  description?: string;
  permissions: any;
  isSystemRole: boolean;
}) {
  const updateRole = useMutation(api.roles.updateRole);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    initialPermissions || {}
  );

  // Update permissions state when initialPermissions change
  useEffect(() => {
    setPermissions(initialPermissions || {});
  }, [initialPermissions]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: name,
      description: description || '',
      isSystemRole: isSystemRole,
      permissions: initialPermissions || {},
    },
  });

  const handlePermissionChange = (key: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      // Use the permissions state instead of form data
      const response = await updateRole({
        role_id: id,
        name: data.name,
        description: data.description,
        permissions: permissions,
        isSystemRole: data.isSystemRole,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Role updated successfully!');
        reset();
        setTimeout(() => {
          window.location.href = '/admin/role';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update role failed:', error);
      toast.error('Failed to update role. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editRoleForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <InputComponent
          id="name"
          label="Role Name *"
          type="string"
          inputWidth="w-full"
          register={register('name', { required: true })}
          error={errors.name}
        />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Enter role description (optional)"
          />
          {errors.description && <span className="text-red-500 text-sm">{errors.description.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isSystemRole')}
            defaultChecked={isSystemRole}
            disabled={isSystemRole}
            className="mr-2 !w-4 !h-3"
          />
          <span className='p-1 ml-2'>System Role</span>
        </label>
        {isSystemRole && (
          <span className="text-sm text-gray-500">System roles cannot be modified or deleted</span>
        )}
      </div>

      <div className="w-full mb-4">
        <label className="block mb-3 font-semibold">Permissions</label>
        <div className="border rounded p-4 max-h-96 overflow-y-auto">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.category} className="mb-4 last:mb-0">
              <h4 className="font-medium text-sm text-gray-700 mb-2 border-b pb-1">
                {group.category}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[permission.key] || false}
                      onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                      className="!w-4 !h-3 !mr-2"
                    />
                    <span className="text-sm">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Select the permissions this role should have</p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={() => window.location.href = '/admin/role'}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Update Role
        </Button>
      </div>
    </form>
  );
}

