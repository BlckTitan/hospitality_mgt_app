import { TableColumn } from "../../../../shared/table";
import { MdCancel, MdRefresh } from "react-icons/md";
import { Button } from "react-bootstrap";
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
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: number;
  expiresAt?: number;
}

const PendingInvites = () => {
  const handleRevoke = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) return;
    try {
      const response = await fetch('/api/admin/revoke-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteId: id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to revoke invitation');
        return;
      }

      toast.success(result.message || 'Invitation revoked');
      setTimeout(() => {
        window.location.href = "/admin/user";
      }, 2000);
    } catch (error) {
      console.log(`Failed to revoke invite! ${error}`);
      toast.error("Failed to revoke invite. Please try again.");
    }
  };

  const handleReinvite = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to re-send the invitation to ${email}?`)) return;
    try {
      const response = await fetch('/api/admin/reinvite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteId: id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to re-send invitation');
        return;
      }

      toast.success('Invitation re-sent successfully!');
      setTimeout(() => {
        window.location.href = "/admin/user";
      }, 2000);
    } catch (error) {
      console.error('Re-invite failed:', error);
      toast.error('Failed to re-send invitation. Please try again.');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getExpirationStatus = (expiresAt?: number) => {
    if (!expiresAt) return { text: 'No expiration', color: 'text-gray-500' };

    const now = Date.now();
    const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 0) {
      return { text: 'Expired', color: 'text-red-600' };
    } else if (hoursUntilExpiry < 24) {
      return { text: `Expires in ${Math.round(hoursUntilExpiry)}h`, color: 'text-orange-600' };
    } else if (hoursUntilExpiry < 48) {
      return { text: `Expires in ${Math.round(hoursUntilExpiry / 24)}d`, color: 'text-yellow-600' };
    } else {
      return { text: `Expires ${new Date(expiresAt).toLocaleDateString()}`, color: 'text-green-600' };
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-500 text-yellow-800",
      accepted: "bg-green-500 text-green-800",
      revoked: "bg-red-500 text-red-800",
      expired: "bg-gray-500 text-gray-700",
    };
    const statusLabels = {
      pending: "Pending",
      accepted: "Accepted",
      revoked: "Revoked",
      expired: "Expired",
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
      label: 'Expiration',
      key: 'expiresAt',
      render: (value, row) => {
        const expirationStatus = getExpirationStatus(row.expiresAt);
        return <span className={expirationStatus.color}>{expirationStatus.text}</span>;
      }
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          {row.status === 'pending' && (
            <Button
              variant='white'
              onClick={() => handleRevoke(row._id, row.email)}
              title="Revoke invitation"
            >
              <i className='icon'>
                <MdCancel />
              </i>
            </Button>
          )}
          {(row.status === 'expired' || row.status === 'revoked') && (
            <Button
              variant='primary'
              onClick={() => handleReinvite(row._id, row.email)}
              title="Re-send invitation"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1"
            >
              Re-invite
            </Button>
          )}
          {row.status === 'accepted' && (
            <span className="text-gray-400 text-sm">User accepted</span>
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