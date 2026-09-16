'use client'

import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { usePermissions } from "../../../../../hooks/usePermissions";

type Board = "" | "unassigned" | "mine" | "overdue";

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

  const rows = housekeepingData?.data ?? [];

  if (housekeepingData === undefined) {
    return <p className="p-4">Loading</p>;
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-wrap gap-3 mb-4 items-end py-2">
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Room</th>
              <th className="p-2">Type</th>
              <th className="p-2">Lead</th>
              <th className="p-2">Status</th>
              <th className="p-2">Priority</th>
              <th className="p-2">Due</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={7}>
                  No housekeeping tasks found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">
                  {row.room
                    ? `${row.room.roomNumber}${row.room.roomType ? ` (${row.room.roomType.name})` : ""}`
                    : "N/A"}
                </td>
                <td className="p-2">{row.taskType}</td>
                <td className="p-2">
                  {row.assignedToStaff
                    ? `${row.assignedToStaff.firstName} ${row.assignedToStaff.lastName}`
                    : "Unassigned"}
                </td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-white ${statusClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="p-2">{row.priority}</td>
                <td className="p-2">
                  <span className={row.overdue ? "text-red-600 font-semibold" : ""}>
                    {row.dueAt ? new Date(row.dueAt).toLocaleString() : "—"}
                    {row.overdue ? " (overdue)" : ""}
                  </span>
                </td>
                <td className="p-2">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "completed") return "bg-green-600";
  if (status === "in-progress") return "bg-blue-600";
  if (status === "skipped") return "bg-gray-600";
  return "bg-yellow-600";
}
