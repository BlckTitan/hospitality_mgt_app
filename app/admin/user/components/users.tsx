import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { TableColumn } from "../../../../shared/table";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import PaginationComponent from "../../../../shared/pagination";
import { Suspense, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import BootstrapModal from "../../../../shared/modal";
import { InviteUserForm } from "./inviteUserForm";

interface UserProps {
  _id: string;
  externalId: string;
  email: string;
  name: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: number;
}

const Users = () => {
  const removeUser = useMutation(api.users.deleteUser);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete user: ' + name)) return;
    try {
      const response = await removeUser({ userId: id as Id<'users'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        setTimeout(() => {
          window.location.href = "/admin/user";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete user! ${error}`);
      toast.error("Failed to delete user. Please try again.");
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const tableColumns: TableColumn<UserProps>[] = [
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    {
      label: 'Active Status',
      key: 'isActive',
      render: (value, row) => (
        <p
          className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-red-400'}`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </p>
      )
    },
    {
      label: 'Last Login',
      key: 'lastLoginAt',
      render: (value, row) => (
        <span>{formatDate(row.lastLoginAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/user/edit?user_id=${row._id}`}
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
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Invite User
        </Button>
      </div>

      <Suspense fallback={<div className="text-center py-8">Loading users...</div>}>
        <PaginationComponent collectionName='users' columns={tableColumns} />
      </Suspense>

      <BootstrapModal
        show={showInviteModal}
        onHide={() => setShowInviteModal(false)}
        heading="Invite New User"
        body={<InviteUserForm
          onSuccess={() => setShowInviteModal(false)}
          onClose={() => setShowInviteModal(false)}
        />}
      />
    </div>
  );
};

export default Users;

