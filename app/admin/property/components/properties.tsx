'use client';

import { FcEmptyTrash } from 'react-icons/fc';
import { MdEditDocument } from 'react-icons/md';
import { Button } from 'react-bootstrap';
import PaginationComponent from '../../../../shared/pagination';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { Suspense } from 'react';
import { TableColumn } from '../../../../shared/table';

interface PropertyProps {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  taxId?: string;
  isActive: boolean;
  actions: React.ReactNode;
}

interface PropertiesListProps {
  onEdit?: (property: PropertyProps) => void;
  refreshTrigger?: number;
}

const Property = () => {

  const propertiesResult = useQuery(api.property.getAllProperties);
  const deletePropertyMutation = useMutation(api.property.deleteProperty);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete property: ${name}?`)) return;

    try {
      const response = await deletePropertyMutation({
        property_id: id as Id<'properties'>,
      });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = '/admin/property';
        }, 1500);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete property! ${error}`);
      toast.error('Failed to delete property. Please try again.');
    }
  };

  const tableColumns: TableColumn<PropertyProps>[] = [
    { label: 'Property Name', key: 'name' },
    { label: 'Address', key: 'address' },
    { label: 'Phone', key: 'phone' },
    { label: 'Email', key: 'email' },
    { label: 'Timezone', key: 'timezone' },
    { label: 'Currency', key: 'currency' },
    {
      label: 'Actions',
      key: 'actions',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a 
              href={`/admin/property/edit?property_id=${row._id}`} 
              className='!mr-2 !no-underline' 
            >
            <MdEditDocument className="text-blue-500" />
            </a>
          <Button
            variant="light"
            size="sm"
            onClick={() => handleDelete(row._id, row.name)}
            className="cursor-pointer"
            title="Delete"
          >
            <FcEmptyTrash />
          </Button>
        </div>
      ),
    },
  ];

  if (!propertiesResult) {
    return <div className="p-4 text-center">Loading properties...</div>;
  }

  return (

    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
        <Suspense>
          <PaginationComponent collectionName='properties' columns={tableColumns}/>
        </Suspense>
      </div>
  )
};

export default Property;


// <div className="w-full">
    //   {properties.length === 0 ? (
    //     <div className="p-4 text-center text-gray-500">No properties found. Create one to get started!</div>
    //   ) : (
    //     <>
    //       <div className="overflow-x-auto">
    //         <table className="w-full">
    //           <thead>
    //             <tr className="border-b">
    //               {tableColumns.map((column, index) => (
    //                 <th key={index} className="text-left p-3 font-semibold">
    //                   {column.label}
    //                 </th>
    //               ))}
    //             </tr>
    //           </thead>
    //           <tbody>
    //             {paginatedProperties.map((property, index) => (
    //               <tr key={index} className="border-b hover:bg-gray-50">
    //                 {tableColumns.map((column, colIndex) => (
    //                   <td key={colIndex} className="p-3">
    //                     {column.render ? (
    //                       column.render(null, property)
    //                     ) : (
    //                       <span>{(property as any)[column.key as keyof PropertyProps] || '-'}</span>
    //                     )}
    //                   </td>
    //                 ))}
    //               </tr>
    //             ))}
    //           </tbody>
    //         </table>
    //       </div>
