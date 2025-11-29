'use client';

import { FcEmptyTrash } from 'react-icons/fc';
import { MdEditDocument } from 'react-icons/md';
import { Button } from 'react-bootstrap';
import PaginationComponent from '../../../../shared/pagination';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { useState } from 'react';
import { TableColumn } from '../../../../shared/table';

interface PropertyProps {
  _id: string;
  name: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  taxId?: string;
  isActive: boolean;
}

interface PropertiesListProps {
  onEdit?: (property: PropertyProps) => void;
  refreshTrigger?: number;
}

const Properties = ({ onEdit, refreshTrigger }: PropertiesListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const propertiesResult = useQuery(api.property.listProperties);
  const deletePropertyMutation = useMutation(api.property.deleteProperty);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete property: ${name}?`)) return;

    try {
      const response = await deletePropertyMutation({
        id: id as Id<'properties'>,
      });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = '/admin/properties';
        }, 1500);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete property! ${error}`);
      toast.error('Failed to delete property. Please try again.');
    }
  };

  const properties = propertiesResult?.data || [];

  const tableColumns: TableColumn<PropertyProps>[] = [
    { label: 'Property Name', key: 'name' },
    { label: 'Address', key: 'address' },
    { label: 'Contact Number', key: 'contactNumber' },
    { label: 'Email', key: 'email' },
    { label: 'Timezone', key: 'timezone' },
    { label: 'Currency', key: 'currency' },
    {
      label: 'Actions',
      key: 'actions',
      render: (item: PropertyProps) => (
        <div className="flex gap-2">
          <Button
            variant="light"
            size="sm"
            onClick={() => onEdit?.(item)}
            className="cursor-pointer"
            title="Edit"
          >
            <MdEditDocument className="text-blue-500" />
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={() => handleDelete(item._id, item.name)}
            className="cursor-pointer"
            title="Delete"
          >
            <FcEmptyTrash />
          </Button>
        </div>
      ),
    },
  ];

  // Pagination logic
  const totalPages = Math.ceil(properties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProperties = properties.slice(startIndex, startIndex + itemsPerPage);

  if (!propertiesResult) {
    return <div className="p-4 text-center">Loading properties...</div>;
  }

  return (
    <div className="w-full">
      {properties.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No properties found. Create one to get started!</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {tableColumns.map((column, index) => (
                    <th key={index} className="text-left p-3 font-semibold">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedProperties.map((property, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {tableColumns.map((column, colIndex) => (
                      <td key={colIndex} className="p-3">
                        {column.render ? (
                          column.render(property)
                        ) : (
                          <span>{(property as any)[column.key as keyof PropertyProps] || '-'}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <PaginationComponent
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Properties;
