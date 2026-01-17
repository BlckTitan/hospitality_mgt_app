import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { TableColumn } from "../../../../shared/table";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import PaginationComponent from "../../../../shared/pagination";
import { Suspense } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

interface RoleProps {
  _id: string;
  name: string;
  description?: string;
  permissions: any; // JSON object
  isSystemRole: boolean;
  createdAt: number;
  updatedAt: number;
}

const Roles = () => {
  const removeRole = useMutation(api.roles.deleteRole);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete role: ' + name + '?')) return;
    try {
      const response = await removeRole({ role_id: id as Id<'roles'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/role";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete role! ${error}`);
      toast.error("Failed to delete role. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const tableColumns: TableColumn<RoleProps>[] = [
    { label: 'Role Name', key: 'name' },
    // { label: 'Description', key: 'description' },
    {
      label: 'System Role',
      key: 'isSystemRole',
      render: (value, row) => (
        <p
          className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${row.isSystemRole ? 'bg-blue-600' : 'bg-gray-400'}`}
        >
          {row.isSystemRole ? 'System' : 'Custom'}
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
            href={`/admin/role/edit?role_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.name)}
            disabled={row.isSystemRole}
            title={row.isSystemRole ? 'System roles cannot be deleted' : 'Delete role'}
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
        <PaginationComponent collectionName='roles' columns={tableColumns} />
      </Suspense>
    </div>
  );
};

export default Roles;

