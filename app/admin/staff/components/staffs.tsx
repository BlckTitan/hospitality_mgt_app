import { FcDocument } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { usePermissions } from "../../../../hooks/usePermissions";

export default function Staff() {
  const [includeTerminated, setIncludeTerminated] = useState(false);
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const { isAuthenticated } = useConvexAuth();
  const { hasGranularPermission } = usePermissions();
  const canUpdate = hasGranularPermission("staff.update");
  const canTerminate = hasGranularPermission("staff.delete");
  const needsBackfill = useQuery(
    api.staffMigrations.needsStaffHrBackfill,
    isAuthenticated ? {} : "skip",
  );
  const backfill = useMutation(api.staffMigrations.backfillStaffHr);
  const terminateStaff = useMutation(api.staff.terminateStaff);
  const rows = useQuery(
    api.staff.listStaff,
    isAuthenticated
      ? {
          includeTerminated,
          department: department || undefined,
          employmentType: employmentType
            ? (employmentType as "full-time" | "part-time" | "casual" | "contractor")
            : undefined,
        }
      : "skip",
  );

  useEffect(() => {
    if (needsBackfill) {
      void backfill({});
    }
  }, [needsBackfill, backfill]);

  const handleTerminate = async (id: string, name: string) => {
    if (!confirm(`Terminate ${name}? Hours and payroll history will be kept.`)) return;
    try {
      const response = await terminateStaff({ id: id as Id<"staffs"> });
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to terminate staff! ${error}`);
      toast.error("Failed to terminate staff");
    }
  };

  if (rows === undefined) {
    return <p className="p-4">Loading</p>;
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-wrap gap-3 mb-4 items-end py-2">
        <label className="flex flex-col text-sm">
          Department
          <select
            className="border rounded px-2 mt-2"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="">All</option>
            <option value="front-office">Front office</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="fnb">Food & beverage</option>
            <option value="maintenance">Maintenance</option>
            <option value="finance">Finance</option>
            <option value="admin">Admin</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Type
          <select
            className="border rounded px-2 mt-2"
            value={employmentType}
            onChange={(event) => setEmploymentType(event.target.value)}
          >
            <option value="">All</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="casual">Casual</option>
            <option value="contractor">Contractor</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input
            type="checkbox"
            checked={includeTerminated}
            onChange={(event) => setIncludeTerminated(event.target.checked)}
          />
          <span className="text-sm ml-2">Include terminated</span>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">No.</th>
              <th className="p-2">Job title</th>
              <th className="p-2">Dept</th>
              <th className="p-2">Type</th>
              <th className="p-2">Status</th>
              <th className="p-2">Login</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={8}>
                  No staff found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">
                  {row.lastName} {row.firstName}
                  {row.onLeave ? (
                    <span className="ml-2 text-xs bg-amber-100 px-1 rounded">On leave</span>
                  ) : null}
                  {row.pendingChangeRequests > 0 ? (
                    <span className="ml-2 text-xs bg-blue-100 px-1 rounded">
                      {row.pendingChangeRequests} request
                    </span>
                  ) : null}
                </td>
                <td className="p-2">{row.employeeNumber || "—"}</td>
                <td className="p-2">{row.role}</td>
                <td className="p-2">{row.department || "—"}</td>
                <td className="p-2">{row.employmentType || "—"}</td>
                <td className="p-2">
                  <span
                    className={`px-2 py-1 rounded text-white ${
                      row.employmentStatus === "terminated" ? "bg-red-400" : "bg-green-600"
                    }`}
                  >
                    {row.employmentStatus}
                  </span>
                </td>
                <td className="p-2">{row.linkedLogin ? row.linkedLogin.email : "Not linked"}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <a href={`/admin/staff/view?staff_id=${row._id}`} className="!no-underline">
                      <FcDocument />
                    </a>
                    {canUpdate && (
                      <a
                        href={`/admin/staff/edit?staff_id=${row._id}`}
                        className="!no-underline !text-amber-400"
                      >
                        <MdEditDocument />
                      </a>
                    )}
                    {canTerminate && row.employmentStatus !== "terminated" && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleTerminate(row._id, row.firstName)}
                      >
                        Terminate
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
