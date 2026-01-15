import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";

interface GuestProps {
  _id: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: number;
  loyaltyNumber?: string;
  preferences?: any;
  createdAt: number;
  updatedAt: number;
}

const Guests = () => {
  const removeGuest = useMutation(api.guests.deleteGuest);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete guest: ' + name + '?')) return;
    try {
      const response = await removeGuest({ guestId: id as Id<'guests'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/room-management/reservation/guest";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete guest! ${error}`);
      toast.error("Failed to delete guest. Please try again.");
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const tableColumns: TableColumn<GuestProps>[] = [
    {
      label: 'Name',
      key: 'firstName',
      render: (value, row) => (
        <span>{`${row.firstName} ${row.lastName}`}</span>
      )
    },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    {
      label: 'Date of Birth',
      key: 'dateOfBirth',
      render: (value, row) => (
        <span>{formatDate(row.dateOfBirth)}</span>
      )
    },
    { label: 'Loyalty Number', key: 'loyaltyNumber' },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value, row) => (
        <span>{formatDateTime(row.createdAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/room-management/reservation/guest/edit?guest_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, `${row.firstName} ${row.lastName}`)}
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
        <PaginationComponent collectionName='guests' columns={tableColumns} />
      </Suspense>
    </div>
  );
};

export default Guests;
