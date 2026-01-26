import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import { Id } from "../../../../convex/_generated/dataModel";

type FormData = {
  userId: string;
  roleId: string;
  propertyId: string;
  assignedBy: string;
};

export function FormComponent({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const createUserRole = useMutation(api.userRoles.createUserRole);
  const usersResult = useQuery(api.user.getAllUsers);
  const rolesResult = useQuery(api.roles.getAllRoles);
  const propertiesResult = useQuery(api.property.getAllProperties);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      userId: '',
      roleId: '',
      propertyId: '',
      assignedBy: '', // TODO: Get current user ID from auth context
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await createUserRole({
        userId: data.userId as Id<'users'>,
        roleId: data.roleId as Id<'roles'>,
        propertyId: data.propertyId as Id<'properties'>,
        assignedBy: data.assignedBy, // User ID who assigned
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('User role assigned successfully!');
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/userRole';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Assign user role failed:', error);
      toast.error('Failed to assign user role. Please try again.');
    }
  };

  const users = usersResult?.data || [];
  const roles = rolesResult?.data || [];
  const properties = propertiesResult?.data || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createUserRoleForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full lg:w-1/2">
          <label htmlFor="userId" className="block mb-2">User *</label>
          <select
            id="userId"
            {...register('userId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a user</option>
            {users.map((user: any) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          {errors.userId && <span className="text-red-500 text-sm">{errors.userId.message}</span>}
        </div>

        <div className="w-full lg:w-1/2">
          <label htmlFor="roleId" className="block mb-2">Role *</label>
          <select
            id="roleId"
            {...register('roleId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a role</option>
            {roles.map((role: any) => (
              <option key={role._id} value={role._id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.roleId && <span className="text-red-500 text-sm">{errors.roleId.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full lg:w-1/2">
          <label htmlFor="propertyId" className="block mb-2">Property *</label>
          <select
            id="propertyId"
            {...register('propertyId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a property</option>
            {properties.map((property: any) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
          {errors.propertyId && <span className="text-red-500 text-sm">{errors.propertyId.message}</span>}
        </div>

        <div className="w-full lg:w-1/2">
          <label htmlFor="assignedBy" className="block mb-2">Assigned By *</label>
          <select
            id="assignedBy"
            {...register('assignedBy', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select who assigned this role</option>
            {users.map((user: any) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          {errors.assignedBy && <span className="text-red-500 text-sm">{errors.assignedBy.message}</span>}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" type="submit">
          Assign Role
        </Button>
      </div>
    </form>
  );
}

