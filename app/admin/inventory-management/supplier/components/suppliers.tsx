'use client'

import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { usePermissions } from "../../../../../hooks/usePermissions";

export default function Suppliers({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) {
  const suppliersData = useQuery(api.suppliers.getAllSuppliers, { propertyId: currentPropertyId });
  const removeSupplier = useMutation(api.suppliers.deleteSupplier);
  const { hasGranularPermission } = usePermissions();
  const canUpdate = hasGranularPermission('inventory.update');
  const canDelete = hasGranularPermission('inventory.delete');

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete supplier: ' + name + '?')) return;
    try {
      const response = await removeSupplier({ supplierId: id as Id<'suppliers'> });
      if (response.success === true) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete supplier! ${error}`);
      toast.error("Failed to delete supplier. Please try again.");
    }
  };

  if (suppliersData === undefined) {
    return <p className="p-4">Loading</p>;
  }

  const rows = suppliersData.success ? suppliersData.data : [];

  return (
    <div className="w-full h-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Contact</th>
              <th className="p-2">Email</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={6}>No suppliers found.</td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.contactPerson || '—'}</td>
                <td className="p-2">{row.email || '—'}</td>
                <td className="p-2">{row.phone || '—'}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-white ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <a
                        href={`/admin/inventory-management/supplier/edit?supplier_id=${row._id}`}
                        className="!no-underline !text-amber-400"
                      >
                        <MdEditDocument />
                      </a>
                    )}
                    {canDelete && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(row._id, row.name)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
