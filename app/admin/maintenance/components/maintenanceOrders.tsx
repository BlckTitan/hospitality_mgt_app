'use client'

import { MdEditDocument } from "react-icons/md";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import { usePermissions } from "../../../../hooks/usePermissions";

type Board = "" | "unassigned" | "mine" | "overdue";

export default function MaintenanceOrders({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) {
  const [board, setBoard] = useState<Board>("");
  const { isAuthenticated } = useConvexAuth();
  const { hasGranularPermission } = usePermissions();
  const canUpdate = hasGranularPermission("maintenance.order.update");
  const orders = useQuery(
    api.maintenanceOrders.getAllMaintenanceOrders,
    isAuthenticated
      ? { propertyId: currentPropertyId, board: board || undefined }
      : "skip",
  );

  const rows = orders?.data ?? [];

  if (orders === undefined) {
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
              <th className="p-2">Title</th>
              <th className="p-2">Type</th>
              <th className="p-2">Lead</th>
              <th className="p-2">Status</th>
              <th className="p-2">Priority</th>
              <th className="p-2">Cost</th>
              <th className="p-2">Due</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={8}>
                  No maintenance orders found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{row.title}</td>
                <td className="p-2">{row.orderType}</td>
                <td className="p-2">
                  {row.lead?.staff
                    ? `${row.lead.staff.firstName} ${row.lead.staff.lastName}`
                    : "Unassigned"}
                </td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-white ${statusClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="p-2">{row.priority}</td>
                <td className="p-2">
                  {formatCost(row)}
                </td>
                <td className="p-2">
                  <span className={row.overdue ? "text-red-600 font-semibold" : ""}>
                    {new Date(row.dueAt).toLocaleString()}
                    {row.overdue ? " (overdue)" : ""}
                  </span>
                </td>
                <td className="p-2">
                  {canUpdate && (
                    <a
                      href={`/admin/maintenance/edit?order_id=${row._id}`}
                      className="!no-underline !text-amber-400"
                    >
                      <MdEditDocument />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCost(row: {
  actualCost?: number;
  estimatedCost?: number;
  partsCost?: number;
}) {
  const formatted = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  if (row.actualCost != null) return formatted(row.actualCost);
  if (row.estimatedCost != null) return `Est. ${formatted(row.estimatedCost)}`;
  if (row.partsCost && row.partsCost > 0) return formatted(row.partsCost);
  return "—";
}

function statusClass(status: string) {
  if (status === "completed") return "bg-green-600";
  if (status === "in-progress") return "bg-blue-600";
  if (status === "cancelled") return "bg-gray-600";
  return "bg-yellow-600";
}
