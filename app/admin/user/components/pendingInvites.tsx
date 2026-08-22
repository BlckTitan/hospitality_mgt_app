import { FcDocument } from "react-icons/fc";
import { TableColumn } from "../../../../shared/table";
import { MdCancel } from "react-icons/md";
import { Button } from "react-bootstrap";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import PaginationComponent from "../../../../shared/pagination";
import { Suspense } from "react";

interface PendingInviteProps {
  _id: string;
  email: string;
  roleId: string;
  roleName: string;
  propertyId: string;
  invitedBy: string;
  inviterName: string;
  clerkInvitationId?: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: number;
}

const PendingInvites = () => {
  console.log('PendingInvites component rendering');
  const updateInviteStatus = useMutation(api.users.updateInviteStatus);

  const handleRevoke = async (id: string, email: string, clerkInvitationId?: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) return;
    try {
      // First revoke the Clerk invitation if there is one
      if (clerkInvitationId) {
        try {
          const response = await fetch('/api/admin/revoke-invite', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clerkInvitationId }),
          });

          if (!response.ok) {
            console.warn('Failed to revoke Clerk invitation, proceeding with local update');
          }
        } catch (error) {
          console.warn('Failed to revoke Clerk invitation, proceeding with local update:', error);
        }
      }

      // Then update the local status
      const response = await updateInviteStatus({
        inviteId: id as Id<'pendingInvites'>,
        status: "revoked",
      });

      if (response.success === true) {
        toast.success(response.message);
        setTimeout(() => {
          window.location.href = "/admin/user";
        }, 2000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to revoke invite! ${error}`);
      toast.error("Failed to revoke invite. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      revoked: "bg-red-100 text-red-800",
    };
    const statusLabels = {
      pending: "Pending",
      accepted: "Accepted",
      revoked: "Revoked",
    };

    return (
      <p
        className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}
      >
        {statusLabels[status as keyof typeof statusLabels] || status}
      </p>
    );
  };

  const tableColumns: TableColumn<PendingInviteProps>[] = [
    { label: 'Email', key: 'email' },
    { label: 'Role', key: 'roleName' },
    { label: 'Invited By', key: 'inviterName' },
    {
      label: 'Status',
      key: 'status',
      render: (value, row) => getStatusBadge(row.status)
    },
    {
      label: 'Created',
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
          {row.status === 'pending' && (
            <Button
              variant='white'
              onClick={() => handleRevoke(row._id, row.email, row.clerkInvitationId)}
              title="Revoke invitation"
            >
              <i className='icon'>
                <MdCancel />
              </i>
            </Button>
          )}
          {row.status !== 'pending' && (
            <span className="text-gray-400 text-sm">No actions available</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <div className="mb-4">
        <h4 className="text-lg font-semibold mb-2">Pending Invitations</h4>
        <p className="text-sm text-gray-600">
          Track and manage user invitations. Pending invitations can be revoked.
        </p>
      </div>
      <Suspense fallback={<div className="text-center py-8">Loading pending invitations...</div>}>
        <PaginationComponent collectionName='pendingInvites' columns={tableColumns} />
      </Suspense>
    </div>
  );
};

export default PendingInvites;