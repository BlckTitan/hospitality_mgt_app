'use client'

import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import { Id } from "../../../../../convex/_generated/dataModel";

interface SupplierProps {
  _id: string;
  propertyId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  taxId?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

const Suppliers = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const suppliersData = useQuery(api.suppliers.getAllSuppliers, { propertyId: currentPropertyId });
  const removeSupplier = useMutation(api.suppliers.deleteSupplier);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete supplier: ' + name + '?')) return;
    try {
      const response = await removeSupplier({ supplierId: id as Id<'suppliers'> });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/inventory-management/supplier";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete supplier! ${error}`);
      toast.error("Failed to delete supplier. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const tableColumns: TableColumn<SupplierProps>[] = [
    { label: 'Name', key: 'name' },
    {
      label: 'Contact Person',
      key: 'contactPerson',
      render: (value, row) => (
        <span>{row.contactPerson || 'N/A'}</span>
      )
    },
    {
      label: 'Email',
      key: 'email',
      render: (value, row) => (
        <span>{row.email || 'N/A'}</span>
      )
    },
    {
      label: 'Phone',
      key: 'phone',
      render: (value, row) => (
        <span>{row.phone || 'N/A'}</span>
      )
    },
    {
      label: 'Payment Terms',
      key: 'paymentTerms',
      render: (value, row) => (
        <span>{row.paymentTerms || 'N/A'}</span>
      )
    },
    {
      label: 'Active',
      key: 'isActive',
      render: (value, row) => (
        <p
          className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </p>
      )
    },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value, row) => (
        <span>{formatDate(row.createdAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/inventory-management/supplier/edit?supplier_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.name)}
            title='Delete supplier'
          >
            <i className='icon'>
              <FcEmptyTrash />
            </i>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent 
          collectionName='suppliers' 
          columns={tableColumns}
          jointTableData={(suppliersData?.success === true) && suppliersData?.data}  
        />
      </Suspense>
    </div>
  );
};

export default Suppliers;
