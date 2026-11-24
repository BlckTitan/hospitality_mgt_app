'use client'

import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from '../../../../../shared/button';
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { usePermissions } from "../../../../../hooks/usePermissions";
import PaginationComponent from "../../../../../shared/pagination";
import { TableColumn } from "../../../../../shared/table";

type Board = "" | "unassigned" | "mine" | "overdue";

interface HousekeepingTaskRow {
  _id: string;
  taskType: string;
  status: string;
  priority: string;
  dueAt?: number;
  overdue?: boolean;
  room?: {
    roomNumber: string;
    roomType?: { name: string } | null;
  } | null;
  assignedToStaff?: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function HousekeepingTasks({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) {
  const [board, setBoard] = useState<Board>("");
  const { isAuthenticated } = useConvexAuth();
  const { hasGranularPermission } = usePermissions();
  const canUpdate = hasGranularPermission("housekeeping.task.update");
  const canAssign = hasGranularPermission("housekeeping.task.assign");
  const housekeepingData = useQuery(
    api.housekeepingTasks.getAllHousekeepingTasks,
    isAuthenticated
      ? { propertyId: currentPropertyId, board: board || undefined }
      : "skip",
  );
  const removeTask = useMutation(api.housekeepingTasks.deleteHousekeepingTask);

  const handleDelete = async (id: string, roomNumber: string) => {
    if (!confirm(`Are you sure you want to delete housekeeping task for room: ${roomNumber}?`)) return;
    try {
      const response = await removeTask({ taskId: id as Id<"housekeepingTasks"> });
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete housekeeping task! ${error}`);
      toast.error("Failed to delete housekeeping task. Please try again.");
    }
  };

  const tableColumns: TableColumn<HousekeepingTaskRow>[] = [
    {
      label: "Room",
      key: "room",
      render: (_value, row) => (
        <span>
          {row.room
            ? `${row.room.roomNumber}${row.room.roomType ? ` (${row.room.roomType.name})` : ""}`
            : "N/A"}
        </span>
      ),
    },
    { label: "Type", key: "taskType" },
    {
      label: "Lead",
      key: "assignedToStaff",
      render: (_value, row) => (
        <span>
          {row.assignedToStaff
            ? `${row.assignedToStaff.firstName} ${row.assignedToStaff.lastName}`
            : "Unassigned"}
        </span>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (_value, row) => (
        <span className={`px-2 py-1 rounded text-white ${statusClass(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    { label: "Priority", key: "priority" },
    {
      label: "Due",
      key: "dueAt",
      render: (_value, row) => (
        <span className={row.overdue ? "text-red-600 font-semibold" : ""}>
          {row.dueAt ? new Date(row.dueAt).toLocaleString() : "—"}
          {row.overdue ? " (overdue)" : ""}
        </span>
      ),
    },
    {
      label: "Action",
      key: "_id",
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          {canUpdate && (
            <a
              href={`/admin/room-management/housekeeping-task/edit?task_id=${row._id}`}
              className="!no-underline !text-amber-400"
            >
              <MdEditDocument />
            </a>
          )}
          {canAssign && row.status !== "in-progress" && row.status !== "completed" && (
            <Button
              variant="white"
              onClick={() => handleDelete(row._id, row.room?.roomNumber || "N/A")}
            >
              <FcEmptyTrash />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const boardFilter = (
    <label className="flex flex-col text-sm">
      Board
      <select
        className="border rounded px-2 mt-2"
        value={board}
        onChange={(event) => setBoard(event.target.value as Board)}
      >
        <option value="">All</option>
        <option value="unassigned">Unassigned</option>
        <option value="mine">Mine</option>
        <option value="overdue">Overdue</option>
      </select>
    </label>
  );

  if (housekeepingData === undefined) {
    return (
      <div className="w-full h-full">
        <div className="py-2">{boardFilter}</div>
        <p className="p-4">Loading</p>
      </div>
    );
  }

  const rows = housekeepingData.success === true ? housekeepingData.data : [];

  return (
    <div className="w-full h-full">
      <PaginationComponent
        collectionName="housekeepingTasks"
        columns={tableColumns}
        propertyId={currentPropertyId}
        jointTableData={rows}
        filterKey={board}
        emptyLabel="No housekeeping tasks found."
        searchLeading={boardFilter}
      />
    </div>
  );
}

function statusClass(status: string) {
  if (status === "completed") return "bg-green-600";
  if (status === "in-progress") return "bg-blue-600";
  if (status === "skipped") return "bg-gray-600";
  return "bg-yellow-600";
}
