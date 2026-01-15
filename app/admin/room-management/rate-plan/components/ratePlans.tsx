import { FcEmptyTrash } from "react-icons/fc";
import { TableColumn } from "../../../../shared/table";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import PaginationComponent from "../../../../shared/pagination";
import { Suspense } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

interface RatePlanProps {
  _id: string;
  propertyId: string;
  roomTypeId: string;
  name: string;
  description?: string;
  baseRate: number;
  discountPercent?: number;
  validFrom: number;
  validTo: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  roomType?: {
    _id: string;
    name: string;
  };
}

const RatePlans = () => {
  const removeRatePlan = useMutation(api.ratePlans.deleteRatePlan);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete rate plan: ' + name + '?')) return;
    try {
      const response = await removeRatePlan({ ratePlanId: id as Id<'ratePlans'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/room-management/rate-plan";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete rate plan! ${error}`);
      toast.error("Failed to delete rate plan. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateFinalRate = (baseRate: number, discountPercent?: number) => {
    if (!discountPercent) return baseRate;
    return baseRate * (1 - discountPercent / 100);
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${isActive ? 'bg-green-600' : 'bg-red-400'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </p>
    );
  };

  const tableColumns: TableColumn<RatePlanProps>[] = [
    { label: 'Name', key: 'name' },
    {
      label: 'Room Type',
      key: 'roomType',
      render: (value, row) => (
        <span>{row.roomType ? row.roomType.name : 'N/A'}</span>
      )
    },
    {
      label: 'Base Rate',
      key: 'baseRate',
      render: (value, row) => (
        <span>${row.baseRate.toFixed(2)}</span>
      )
    },
    {
      label: 'Discount',
      key: 'discountPercent',
      render: (value, row) => (
        <span>{row.discountPercent ? `${row.discountPercent}%` : '-'}</span>
      )
    },
    {
      label: 'Final Rate',
      key: 'baseRate',
      render: (value, row) => (
        <span className="font-semibold">${calculateFinalRate(row.baseRate, row.discountPercent).toFixed(2)}</span>
      )
    },
    {
      label: 'Valid From',
      key: 'validFrom',
      render: (value, row) => (
        <span>{formatDate(row.validFrom)}</span>
      )
    },
    {
      label: 'Valid To',
      key: 'validTo',
      render: (value, row) => (
        <span>{formatDate(row.validTo)}</span>
      )
    },
    {
      label: 'Status',
      key: 'isActive',
      render: (value, row) => getStatusBadge(row.isActive)
    },
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
            href={`/admin/room-management/rate-plan/edit?rate_plan_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.name)}
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
        <PaginationComponent collectionName='ratePlans' columns={tableColumns} />
      </Suspense>
    </div>
  );
};

export default RatePlans;
