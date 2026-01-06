import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { TableColumn } from "../../../../shared/table";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import PaginationComponent from "../../../../shared/pagination";
import { Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

interface UserRoleProps {
  _id: string;
  userId: string;
  roleId: string;
  propertyId: string;
  assignedAt: number;
  assignedBy: string;
  // Populated fields
  userName?: string;
  userEmail?: string;
  roleName?: string;
  propertyName?: string;
  assignedByName?: string;
}

const UserRoles = () => {
  const userRoleData = useQuery(api.userRoles.getAllUserRoles) //data from userRoles
  const removeUserRole = useMutation(api.userRoles.deleteUserRole);

  const handleDelete = async (id: string, userName: string, roleName: string) => {
    if (!confirm(`Are you sure you want to remove role "${roleName}" from user "${userName}"?`)) return;
    try {
      const response = await removeUserRole({ userRole_id: id as Id<'userRoles'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/userRole";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete user role! ${error}`);
      toast.error("Failed to remove user role. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const tableColumns: TableColumn<UserRoleProps>[] = [
    { label: 'User', key: 'userName' },
    { label: 'Email', key: 'userEmail' },
    { label: 'Role', key: 'roleName' },
    { label: 'Property', key: 'propertyName' },
    {
      label: 'Assigned At',
      key: 'assignedAt',
      render: (value, row) => (
        <span>{formatDate(row.assignedAt)}</span>
      )
    },
    {
      label: 'Assigned By',
      key: 'assignedByName',
      render: (value, row) => (
        <span>{row.assignedByName || row.assignedBy}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/userRole/edit?userRole_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.userName || 'Unknown', row.roleName || 'Unknown')}
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
          collectionName='userRoles' 
          columns={tableColumns} 
          jointTableData={(userRoleData?.success === true) && userRoleData?.data}
        />
      </Suspense>
    </div>
  );
};

export default UserRoles;

