import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { Suspense } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";

interface RoomTypeProps {
  _id: string;
  name: string;
  description?: string;
  maxOccupancy: number;
  baseRate: number;
  amenities: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  propertyId?: string;
}

const RoomTypes = () => {
  const removeRoomType = useMutation(api.roomTypes.deleteRoomType);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete room type: ' + name + '?')) return;
    try {
      const response = await removeRoomType({ roomTypeId: id as Id<'roomTypes'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/roomType";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete room type! ${error}`);
      toast.error("Failed to delete room type. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatAmenities = (amenities: string[]) => {
    return amenities.slice(0, 2).join(', ') + (amenities.length > 2 ? ` +${amenities.length - 2}` : '');
  };

  const tableColumns: TableColumn<RoomTypeProps>[] = [
    { label: 'Room Type', key: 'name' },
    { label: 'Description', key: 'description' },
    {
      label: 'Max Occupancy',
      key: 'maxOccupancy',
      render: (value, row) => <span>{row.maxOccupancy} guests</span>
    },
    {
      label: 'Base Rate',
      key: 'baseRate',
      render: (value, row) => <span>${row.baseRate.toFixed(2)}</span>
    },
    {
      label: 'Amenities',
      key: 'amenities',
      render: (value, row) => (
        <span title={row.amenities.join(', ')}>
          {row.amenities.length > 0 ? formatAmenities(row.amenities) : 'None'}
        </span>
      )
    },
    {
      label: 'Status',
      key: 'isActive',
      render: (value, row) => (
        <p
          className={`w-fit h-fit px-2 py-1 text-white rounded-sm text-sm ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </p>
      )
    },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value, row) => (
        <span className="text-sm">{formatDate(row.createdAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/roomType/edit?roomTypeId=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.name)}
            title='Delete room type'
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
        <PaginationComponent collectionName='roomTypes' columns={tableColumns} />
      </Suspense>
    </div>
  );
};

export default RoomTypes;
