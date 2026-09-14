'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { toast } from 'sonner';
import { usePermissions } from '../../../../hooks/usePermissions';

export function UserAccessAssignments({ userId }: { userId: Id<'users'> }) {
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('users.create');
  const canUpdate = hasGranularPermission('users.update');

  const assignments = useQuery(api.userRoles.getUserRolesByUserId, { userId });
  const rolesResult = useQuery(api.roles.getAllRoles);
  const propertiesResult = useQuery(api.property.getAllProperties);
  const createUserRole = useMutation(api.userRoles.createUserRole);
  const updateUserRole = useMutation(api.userRoles.updateUserRole);
  const deleteUserRole = useMutation(api.userRoles.deleteUserRole);

  const [roleId, setRoleId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roles = rolesResult?.data || [];
  const properties = propertiesResult?.data || [];
  const rows = assignments?.data || [];

  const handleAdd = async () => {
    if (!roleId || !propertyId) {
      toast.error('Select a role and a property.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await createUserRole({
        userId,
        roleId: roleId as Id<'roles'>,
        propertyId: propertyId as Id<'properties'>,
      });
      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Access assigned.');
        setRoleId('');
        setPropertyId('');
      }
    } catch (error) {
      console.error('Assign role failed:', error);
      toast.error('Failed to assign access. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (
    assignmentId: Id<'userRoles'>,
    currentPropertyId: Id<'properties'>,
    nextRoleId: string,
  ) => {
    if (!nextRoleId) return;
    try {
      const response = await updateUserRole({
        userRole_id: assignmentId,
        roleId: nextRoleId as Id<'roles'>,
        propertyId: currentPropertyId,
      });
      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Role updated.');
      }
    } catch (error) {
      console.error('Update role failed:', error);
      toast.error('Failed to update role. Please try again.');
    }
  };

  const handleRemove = async (
    assignmentId: Id<'userRoles'>,
    roleName: string,
    propertyName: string,
    isAdministrator: boolean,
  ) => {
    const warning = isAdministrator
      ? `Remove Administrator access at "${propertyName}"? This person will lose full access at that property.`
      : `Remove role "${roleName}" at "${propertyName}"?`;
    if (!confirm(warning)) return;

    try {
      const response = await deleteUserRole({ userRole_id: assignmentId });
      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Access removed.');
      }
    } catch (error) {
      console.error('Remove role failed:', error);
      toast.error('Failed to remove access. Please try again.');
    }
  };

  if (assignments === undefined) {
    return (
      <div className="py-6 flex justify-center">
        <Spinner animation="border" size="sm" variant="dark" />
      </div>
    );
  }

  return (
    <section className="mt-8 pt-6 border-t">
      <h4 className="mb-2">Property access</h4>
      <p className="text-sm text-gray-600 mb-4">
        This person already has an account. Invite cannot be used again for the same email.
        Add, change, or remove roles here.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No property access assigned yet.</p>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border">Property</th>
                <th className="text-left p-2 border">Role</th>
                <th className="text-left p-2 border">Assigned at</th>
                <th className="text-left p-2 border">Assigned by</th>
                {canUpdate && <th className="text-left p-2 border">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td className="p-2 border">{row.propertyName}</td>
                  <td className="p-2 border">
                    {canUpdate ? (
                      <select
                        className="w-full border rounded p-1"
                        value={row.roleId}
                        onChange={(event) =>
                          handleRoleChange(row._id, row.propertyId, event.target.value)
                        }
                      >
                        {roles.map((role: { _id: string; name: string }) => (
                          <option key={role._id} value={role._id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.roleName
                    )}
                  </td>
                  <td className="p-2 border">{new Date(row.assignedAt).toLocaleString()}</td>
                  <td className="p-2 border">{row.assignedByName}</td>
                  {canUpdate && (
                    <td className="p-2 border">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() =>
                          handleRemove(
                            row._id,
                            row.roleName,
                            row.propertyName,
                            row.isAdministrator,
                          )
                        }
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canCreate && (
        <div className="border rounded p-3 bg-gray-50">
          <p className="font-medium mb-3">Add access</p>
          <div className="flex flex-col lg:flex-row gap-3 items-start">
            <div className="w-full lg:w-1/3">
              <label htmlFor="assignPropertyId" className="block mb-1">Property *</label>
              <select
                id="assignPropertyId"
                className="w-full border rounded p-2"
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
              >
                <option value="">Select a property</option>
                {properties.map((property: { _id: string; name: string }) => (
                  <option key={property._id} value={property._id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full lg:w-1/3">
              <label htmlFor="assignRoleId" className="block mb-1">Role *</label>
              <select
                id="assignRoleId"
                className="w-full border rounded p-2"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
              >
                <option value="">Select a role</option>
                {roles.map((role: { _id: string; name: string }) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-6">
              <Button variant="dark" onClick={handleAdd} disabled={submitting}>
                {submitting ? 'Assigning…' : 'Assign role'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
