import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { AuthContext, hasGranularPermission } from "./rbac";
import { isActiveStatus } from "./staffAccess";
import { normalizeDepartment, ShiftDepartment } from "./shiftHelpers";

type DbCtx = QueryCtx | MutationCtx;

export type TaskModule = "housekeeping" | "maintenance" | "inventory";

export const OPEN_STATUSES = ["pending", "in-progress"] as const;

export const SLA_SEEDS: Array<{
  module: TaskModule;
  typeKey: string;
  dueMinutes: number;
}> = [
  { module: "housekeeping", typeKey: "checkout", dueMinutes: 45 },
  { module: "housekeeping", typeKey: "stayover", dueMinutes: 180 },
  { module: "housekeeping", typeKey: "deep-clean", dueMinutes: 240 },
  { module: "housekeeping", typeKey: "inspection", dueMinutes: 120 },
  { module: "maintenance", typeKey: "preventive", dueMinutes: 1440 },
  { module: "maintenance", typeKey: "corrective", dueMinutes: 240 },
  { module: "maintenance", typeKey: "emergency", dueMinutes: 120 },
  { module: "maintenance", typeKey: "inspection", dueMinutes: 240 },
  { module: "inventory", typeKey: "restock", dueMinutes: 480 },
  { module: "inventory", typeKey: "putaway", dueMinutes: 120 },
];

export const MODULE_DEPARTMENT: Record<TaskModule, ShiftDepartment> = {
  housekeeping: "housekeeping",
  maintenance: "maintenance",
  inventory: "fnb",
};

export const MODULE_PERMS: Record<
  TaskModule,
  { read: string; assign: string; update: string; complete: string }
> = {
  housekeeping: {
    read: "housekeeping.task.read",
    assign: "housekeeping.task.assign",
    update: "housekeeping.task.update",
    complete: "housekeeping.task.complete",
  },
  maintenance: {
    read: "maintenance.order.read",
    assign: "maintenance.order.assign",
    update: "maintenance.order.update",
    complete: "maintenance.order.complete",
  },
  inventory: {
    read: "inventory.task.read",
    assign: "inventory.task.assign",
    update: "inventory.task.update",
    complete: "inventory.task.complete",
  },
};

export function isOpenStatus(status: string): boolean {
  return status === "pending" || status === "in-progress";
}

export function calendarDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export async function linkedStaffForUser(
  ctx: DbCtx,
  userId: Id<"users">,
): Promise<Doc<"staffs"> | null> {
  return await ctx.db
    .query("staffs")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export async function ensureSlaDefaults(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
): Promise<void> {
  const existing = await ctx.db
    .query("taskSlaDefaults")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();
  if (existing.length > 0) return;
  const now = Date.now();
  for (const seed of SLA_SEEDS) {
    await ctx.db.insert("taskSlaDefaults", {
      propertyId,
      module: seed.module,
      typeKey: seed.typeKey,
      dueMinutes: seed.dueMinutes,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function dueAtFor(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  module: TaskModule,
  typeKey: string,
  triggerTime: number,
): Promise<number> {
  await ensureSlaDefaults(ctx, propertyId);
  const rows = await ctx.db
    .query("taskSlaDefaults")
    .withIndex("by_propertyId_module_typeKey", (q) =>
      q.eq("propertyId", propertyId).eq("module", module).eq("typeKey", typeKey),
    )
    .collect();
  const minutes = rows[0]?.dueMinutes
    ?? SLA_SEEDS.find((s) => s.module === module && s.typeKey === typeKey)?.dueMinutes
    ?? 240;
  return triggerTime + minutes * 60 * 1000;
}

export async function snapshotChecklist(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  module: TaskModule,
  typeKey: string,
  roomTypeId?: Id<"roomTypes">,
): Promise<{
  templateId?: Id<"taskTemplates">;
  checklist: Array<{ id: string; label: string; isComplete: boolean }>;
}> {
  const templates = await ctx.db
    .query("taskTemplates")
    .withIndex("by_propertyId_module_typeKey", (q) =>
      q.eq("propertyId", propertyId).eq("module", module).eq("typeKey", typeKey),
    )
    .collect();
  const active = templates.filter((t) => t.isActive);
  const match =
    (roomTypeId ? active.find((t) => t.roomTypeId === roomTypeId) : undefined)
    ?? active.find((t) => !t.roomTypeId)
    ?? active[0];
  if (!match) return { checklist: [] };
  return {
    templateId: match._id,
    checklist: match.steps.map((step) => ({
      id: step.id,
      label: step.label,
      isComplete: false,
    })),
  };
}

export async function resolveDepartmentSupervisor(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  module: TaskModule,
): Promise<Id<"staffs"> | null> {
  const department = MODULE_DEPARTMENT[module];
  const staff = await ctx.db
    .query("staffs")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
    .collect();
  const active = staff.filter(
    (row) =>
      isActiveStatus(row.employmentStatus) &&
      normalizeDepartment(row.department) === department,
  );
  if (active.length === 0) return null;
  const withReports = active.filter((row) =>
    active.some((other) => other.managerId === row._id),
  );
  const pool = withReports.length > 0 ? withReports : active;
  const top = pool.find((row) => !row.managerId) ?? pool[0];
  return top._id;
}

export async function defaultLeadStaffId(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  module: TaskModule,
  actorUserId?: Id<"users">,
): Promise<Id<"staffs"> | null> {
  if (actorUserId) {
    const linked = await linkedStaffForUser(ctx, actorUserId);
    if (
      linked &&
      linked.propertyId === propertyId &&
      isActiveStatus(linked.employmentStatus) &&
      normalizeDepartment(linked.department) === MODULE_DEPARTMENT[module]
    ) {
      return linked._id;
    }
  }
  return await resolveDepartmentSupervisor(ctx, propertyId, module);
}

type ParentRef =
  | { housekeepingTaskId: Id<"housekeepingTasks"> }
  | { maintenanceOrderId: Id<"maintenanceOrders"> }
  | { inventoryTaskId: Id<"inventoryTasks"> };

export function parentIndex(parent: ParentRef) {
  if ("housekeepingTaskId" in parent) {
    return {
      name: "by_housekeepingTaskId" as const,
      field: "housekeepingTaskId" as const,
      id: parent.housekeepingTaskId,
    };
  }
  if ("maintenanceOrderId" in parent) {
    return {
      name: "by_maintenanceOrderId" as const,
      field: "maintenanceOrderId" as const,
      id: parent.maintenanceOrderId,
    };
  }
  return {
    name: "by_inventoryTaskId" as const,
    field: "inventoryTaskId" as const,
    id: parent.inventoryTaskId,
  };
}

export async function listAssignments(ctx: DbCtx, parent: ParentRef) {
  const idx = parentIndex(parent);
  if (idx.name === "by_housekeepingTaskId") {
    return await ctx.db
      .query("taskAssignments")
      .withIndex("by_housekeepingTaskId", (q) =>
        q.eq("housekeepingTaskId", idx.id as Id<"housekeepingTasks">),
      )
      .collect();
  }
  if (idx.name === "by_maintenanceOrderId") {
    return await ctx.db
      .query("taskAssignments")
      .withIndex("by_maintenanceOrderId", (q) =>
        q.eq("maintenanceOrderId", idx.id as Id<"maintenanceOrders">),
      )
      .collect();
  }
  return await ctx.db
    .query("taskAssignments")
    .withIndex("by_inventoryTaskId", (q) =>
      q.eq("inventoryTaskId", idx.id as Id<"inventoryTasks">),
    )
    .collect();
}

export async function enrichAssignments(ctx: DbCtx, parent: ParentRef) {
  const rows = await listAssignments(ctx, parent);
  const withStaff = await Promise.all(
    rows.map(async (row) => {
      const staff = await ctx.db.get(row.staffId);
      return {
        ...row,
        staff: staff
          ? { _id: staff._id, firstName: staff.firstName, lastName: staff.lastName }
          : null,
      };
    }),
  );
  const lead = withStaff.find((row) => row.role === "lead") ?? null;
  const helpers = withStaff.filter((row) => row.role === "helper");
  return { assignments: withStaff, lead, helpers };
}

async function assertAssignableStaff(
  ctx: DbCtx,
  propertyId: Id<"properties">,
  staffId: Id<"staffs">,
) {
  const staff = await ctx.db.get(staffId);
  if (!staff) throw new Error("Assigned staff does not exist");
  if (staff.propertyId !== propertyId) {
    throw new Error("Assigned staff must belong to this property");
  }
  if (!isActiveStatus(staff.employmentStatus)) {
    throw new Error("Cannot assign terminated staff");
  }
  return staff;
}

export async function setLead(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    parent: ParentRef;
    staffId: Id<"staffs">;
    assignedBy?: Id<"users">;
  },
) {
  await assertAssignableStaff(ctx, args.propertyId, args.staffId);
  const existing = await listAssignments(ctx, args.parent);
  const now = Date.now();
  const currentLead = existing.find((row) => row.role === "lead");
  const alreadyOnTask = existing.find((row) => row.staffId === args.staffId);

  if (currentLead && currentLead.staffId !== args.staffId) {
    await ctx.db.delete(currentLead._id);
  }
  if (alreadyOnTask) {
    await ctx.db.patch(alreadyOnTask._id, { role: "lead", assignedAt: now, assignedBy: args.assignedBy });
    return;
  }
  await ctx.db.insert("taskAssignments", {
    propertyId: args.propertyId,
    housekeepingTaskId: "housekeepingTaskId" in args.parent ? args.parent.housekeepingTaskId : undefined,
    maintenanceOrderId: "maintenanceOrderId" in args.parent ? args.parent.maintenanceOrderId : undefined,
    inventoryTaskId: "inventoryTaskId" in args.parent ? args.parent.inventoryTaskId : undefined,
    staffId: args.staffId,
    role: "lead",
    assignedAt: now,
    assignedBy: args.assignedBy,
    createdAt: now,
  });
}

export async function addHelper(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    parent: ParentRef;
    staffId: Id<"staffs">;
    assignedBy?: Id<"users">;
  },
) {
  await assertAssignableStaff(ctx, args.propertyId, args.staffId);
  const existing = await listAssignments(ctx, args.parent);
  if (existing.some((row) => row.staffId === args.staffId)) {
    return;
  }
  const now = Date.now();
  await ctx.db.insert("taskAssignments", {
    propertyId: args.propertyId,
    housekeepingTaskId: "housekeepingTaskId" in args.parent ? args.parent.housekeepingTaskId : undefined,
    maintenanceOrderId: "maintenanceOrderId" in args.parent ? args.parent.maintenanceOrderId : undefined,
    inventoryTaskId: "inventoryTaskId" in args.parent ? args.parent.inventoryTaskId : undefined,
    staffId: args.staffId,
    role: "helper",
    assignedAt: now,
    assignedBy: args.assignedBy,
    createdAt: now,
  });
}

export async function assignLeadAndHelpers(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    parent: ParentRef;
    leadId?: Id<"staffs"> | null;
    helperIds?: Id<"staffs">[];
    assignedBy?: Id<"users">;
  },
) {
  if (args.leadId) {
    await setLead(ctx, {
      propertyId: args.propertyId,
      parent: args.parent,
      staffId: args.leadId,
      assignedBy: args.assignedBy,
    });
  }
  for (const helperId of args.helperIds ?? []) {
    if (helperId === args.leadId) continue;
    await addHelper(ctx, {
      propertyId: args.propertyId,
      parent: args.parent,
      staffId: helperId,
      assignedBy: args.assignedBy,
    });
  }
}

export async function unassignStaffFromOpenWork(
  ctx: MutationCtx,
  staffId: Id<"staffs">,
) {
  const rows = await ctx.db
    .query("taskAssignments")
    .withIndex("by_staffId", (q) => q.eq("staffId", staffId))
    .collect();
  const now = Date.now();
  for (const row of rows) {
    const parent = await parentOpenStatus(ctx, row);
    if (parent && row.role === "lead") {
      await ctx.db.patch(parent._id, { status: "pending", updatedAt: now });
    }
    await ctx.db.delete(row._id);
  }
}

async function parentOpenStatus(ctx: DbCtx, row: Doc<"taskAssignments">) {
  if (row.housekeepingTaskId) {
    const task = await ctx.db.get(row.housekeepingTaskId);
    return task && isOpenStatus(task.status) ? task : null;
  }
  if (row.maintenanceOrderId) {
    const task = await ctx.db.get(row.maintenanceOrderId);
    return task && isOpenStatus(task.status) ? task : null;
  }
  if (row.inventoryTaskId) {
    const task = await ctx.db.get(row.inventoryTaskId);
    return task && isOpenStatus(task.status) ? task : null;
  }
  return null;
}

export function actorIsLead(
  assignments: Doc<"taskAssignments">[],
  staffId: Id<"staffs"> | null,
): boolean {
  if (!staffId) return false;
  return assignments.some((row) => row.role === "lead" && row.staffId === staffId);
}

export function actorIsAssignee(
  assignments: Doc<"taskAssignments">[],
  staffId: Id<"staffs"> | null,
): boolean {
  if (!staffId) return false;
  return assignments.some((row) => row.staffId === staffId);
}

export function canAssign(auth: AuthContext, module: TaskModule): boolean {
  return hasGranularPermission(auth, MODULE_PERMS[module].assign);
}

export function canCompleteAsSupervisor(auth: AuthContext, module: TaskModule): boolean {
  return hasGranularPermission(auth, MODULE_PERMS[module].assign)
    || hasGranularPermission(auth, MODULE_PERMS[module].complete);
}

export function assertCanStart(args: {
  auth: AuthContext;
  module: TaskModule;
  assignments: Doc<"taskAssignments">[];
  staffId: Id<"staffs"> | null;
}) {
  if (canAssign(args.auth, args.module)) return;
  if (!actorIsAssignee(args.assignments, args.staffId)) {
    throw new Error("Only an assignee or supervisor can start this work");
  }
}

export function assertCanComplete(args: {
  auth: AuthContext;
  module: TaskModule;
  assignments: Doc<"taskAssignments">[];
  staffId: Id<"staffs"> | null;
}) {
  if (canAssign(args.auth, args.module)) return;
  if (!actorIsLead(args.assignments, args.staffId)) {
    throw new Error("Only the lead or a supervisor can complete this work");
  }
}

export async function hasOpenHousekeepingOnRoom(
  ctx: DbCtx,
  roomId: Id<"rooms">,
  taskType: string,
) {
  const rows = await ctx.db
    .query("housekeepingTasks")
    .withIndex("by_roomId_taskType_status", (q) =>
      q.eq("roomId", roomId).eq("taskType", taskType).eq("status", "pending"),
    )
    .collect();
  const inProgress = await ctx.db
    .query("housekeepingTasks")
    .withIndex("by_roomId_taskType_status", (q) =>
      q.eq("roomId", roomId).eq("taskType", taskType).eq("status", "in-progress"),
    )
    .collect();
  return [...rows, ...inProgress];
}

export async function createHousekeepingWork(
  ctx: MutationCtx,
  args: {
    propertyId: Id<"properties">;
    roomId: Id<"rooms">;
    taskType: "checkout" | "stayover" | "deep-clean" | "inspection";
    source: "manual" | "reservation_checkout" | "reservation_stayover";
    reservationId?: Id<"reservations">;
    priority?: "low" | "medium" | "high" | "urgent";
    scheduledAt?: number;
    estimatedDuration?: number;
    notes?: string;
    createdBy?: Id<"users">;
    leadId?: Id<"staffs"> | null;
    helperIds?: Id<"staffs">[];
  },
) {
  const now = Date.now();
  if (args.taskType === "checkout" || args.taskType === "stayover") {
    const open = await hasOpenHousekeepingOnRoom(ctx, args.roomId, args.taskType);
    if (args.taskType === "checkout" && open.length > 0) {
      return { success: false as const, message: "An open checkout task already exists for this room", id: open[0]._id };
    }
    if (args.taskType === "stayover") {
      const day = calendarDayKey(args.scheduledAt ?? now);
      const sameDay = open.filter((row) => calendarDayKey(row.scheduledAt ?? row.createdAt) === day);
      if (sameDay.length > 0) {
        return { success: false as const, message: "An open stayover task already exists for this room today", id: sameDay[0]._id };
      }
    }
  }

  const room = await ctx.db.get(args.roomId);
  if (!room || room.propertyId !== args.propertyId) {
    return { success: false as const, message: "Room does not belong to this property" };
  }

  const dueAt = await dueAtFor(ctx, args.propertyId, "housekeeping", args.taskType, now);
  const snap = await snapshotChecklist(
    ctx,
    args.propertyId,
    "housekeeping",
    args.taskType,
    room.roomTypeId,
  );
  const leadId =
    args.leadId === undefined
      ? await defaultLeadStaffId(ctx, args.propertyId, "housekeeping", args.createdBy)
      : args.leadId;

  const id = await ctx.db.insert("housekeepingTasks", {
    propertyId: args.propertyId,
    roomId: args.roomId,
    taskType: args.taskType,
    status: "pending",
    priority: args.priority ?? (args.taskType === "checkout" ? "high" : "medium"),
    source: args.source,
    reservationId: args.reservationId,
    templateId: snap.templateId,
    createdBy: args.createdBy,
    dueAt,
    scheduledAt: args.scheduledAt,
    estimatedDuration: args.estimatedDuration,
    notes: args.notes,
    checklist: snap.checklist,
    createdAt: now,
    updatedAt: now,
  });

  await assignLeadAndHelpers(ctx, {
    propertyId: args.propertyId,
    parent: { housekeepingTaskId: id },
    leadId,
    helperIds: args.helperIds,
    assignedBy: args.createdBy,
  });

  return { success: true as const, id, message: "Housekeeping task created successfully" };
}

export async function maybeCreateStayoverOnCheckIn(
  ctx: MutationCtx,
  reservation: Doc<"reservations">,
  actorUserId?: Id<"users">,
) {
  await createHousekeepingWork(ctx, {
    propertyId: reservation.propertyId,
    roomId: reservation.roomId,
    taskType: "stayover",
    source: "reservation_stayover",
    reservationId: reservation._id,
    createdBy: actorUserId,
  });
}

export async function maybeCreateCheckoutOnCheckOut(
  ctx: MutationCtx,
  reservation: Doc<"reservations">,
  actorUserId?: Id<"users">,
) {
  await createHousekeepingWork(ctx, {
    propertyId: reservation.propertyId,
    roomId: reservation.roomId,
    taskType: "checkout",
    source: "reservation_checkout",
    reservationId: reservation._id,
    priority: "high",
    createdBy: actorUserId,
  });
}

export async function maybeCreateRestockTask(
  ctx: MutationCtx,
  item: Doc<"inventoryItems">,
  actorUserId?: Id<"users">,
) {
  if (item.reorderPoint === undefined) return;
  if (item.currentQuantity > item.reorderPoint) return;

  const pending = await ctx.db
    .query("inventoryTasks")
    .withIndex("by_inventoryItemId_taskType_status", (q) =>
      q.eq("inventoryItemId", item._id).eq("taskType", "restock").eq("status", "pending"),
    )
    .first();
  const inProgress = await ctx.db
    .query("inventoryTasks")
    .withIndex("by_inventoryItemId_taskType_status", (q) =>
      q.eq("inventoryItemId", item._id).eq("taskType", "restock").eq("status", "in-progress"),
    )
    .first();
  if (pending || inProgress) return;

  const now = Date.now();
  const dueAt = await dueAtFor(ctx, item.propertyId, "inventory", "restock", now);
  const snap = await snapshotChecklist(ctx, item.propertyId, "inventory", "restock");
  const leadId = await defaultLeadStaffId(ctx, item.propertyId, "inventory", actorUserId);
  const id = await ctx.db.insert("inventoryTasks", {
    propertyId: item.propertyId,
    taskType: "restock",
    inventoryItemId: item._id,
    suggestedQuantity: item.reorderQuantity,
    source: "reorder_point",
    templateId: snap.templateId,
    createdBy: actorUserId,
    status: "pending",
    priority: "medium",
    dueAt,
    checklist: snap.checklist.length
      ? snap.checklist
      : [{ id: "qty", label: `Restock ${item.name} (suggested ${item.reorderQuantity ?? 0} ${item.unit})`, isComplete: false }],
    createdAt: now,
    updatedAt: now,
  });
  await assignLeadAndHelpers(ctx, {
    propertyId: item.propertyId,
    parent: { inventoryTaskId: id },
    leadId,
    assignedBy: actorUserId,
  });
}

export async function maybeCreatePutawayTask(
  ctx: MutationCtx,
  order: Doc<"purchaseOrders">,
  actorUserId?: Id<"users">,
) {
  const existingPending = await ctx.db
    .query("inventoryTasks")
    .withIndex("by_purchaseOrderId", (q) => q.eq("purchaseOrderId", order._id))
    .collect();
  if (existingPending.some((row) => isOpenStatus(row.status))) return;

  const lines = await ctx.db
    .query("purchaseOrderLines")
    .withIndex("by_purchaseOrderId", (q) => q.eq("purchaseOrderId", order._id))
    .collect();
  const firstItemId = lines[0]?.inventoryItemId;
  if (!firstItemId) return;

  const now = Date.now();
  const dueAt = await dueAtFor(ctx, order.propertyId, "inventory", "putaway", now);
  const snap = await snapshotChecklist(ctx, order.propertyId, "inventory", "putaway");
  const checklist =
    lines.length > 0
      ? await Promise.all(
          lines.map(async (line, index) => {
            const item = await ctx.db.get(line.inventoryItemId);
            return {
              id: line._id,
              label: `Put away ${item?.name ?? "item"} × ${line.receivedQuantity ?? line.quantity}`,
              isComplete: false,
            };
          }),
        )
      : snap.checklist;

  const leadId = await defaultLeadStaffId(ctx, order.propertyId, "inventory", actorUserId);
  const id = await ctx.db.insert("inventoryTasks", {
    propertyId: order.propertyId,
    taskType: "putaway",
    inventoryItemId: firstItemId,
    source: "purchase_order_received",
    purchaseOrderId: order._id,
    templateId: snap.templateId,
    createdBy: actorUserId,
    status: "pending",
    priority: "medium",
    dueAt,
    checklist,
    createdAt: now,
    updatedAt: now,
  });
  await assignLeadAndHelpers(ctx, {
    propertyId: order.propertyId,
    parent: { inventoryTaskId: id },
    leadId,
    assignedBy: actorUserId,
  });
}

export async function maybeCreatePreventiveOrder(
  ctx: MutationCtx,
  asset: Doc<"assets">,
  actorUserId?: Id<"users">,
) {
  if (!asset.nextMaintenanceDate || asset.nextMaintenanceDate > Date.now()) return;
  if (asset.status === "retired") return;

  const pending = await ctx.db
    .query("maintenanceOrders")
    .withIndex("by_assetId_orderType_status", (q) =>
      q.eq("assetId", asset._id).eq("orderType", "preventive").eq("status", "pending"),
    )
    .first();
  const inProgress = await ctx.db
    .query("maintenanceOrders")
    .withIndex("by_assetId_orderType_status", (q) =>
      q.eq("assetId", asset._id).eq("orderType", "preventive").eq("status", "in-progress"),
    )
    .first();
  if (pending || inProgress) return;

  const now = Date.now();
  const dueAt = await dueAtFor(ctx, asset.propertyId, "maintenance", "preventive", now);
  const snap = await snapshotChecklist(ctx, asset.propertyId, "maintenance", "preventive");
  const leadId = await defaultLeadStaffId(ctx, asset.propertyId, "maintenance", actorUserId);
  const id = await ctx.db.insert("maintenanceOrders", {
    propertyId: asset.propertyId,
    assetId: asset._id,
    roomId: asset.roomId,
    orderType: "preventive",
    source: "preventive_schedule",
    priority: "medium",
    title: `Preventive maintenance: ${asset.name}`,
    status: "pending",
    scheduledDate: asset.nextMaintenanceDate,
    dueAt,
    templateId: snap.templateId,
    createdBy: actorUserId,
    checklist: snap.checklist,
    createdAt: now,
    updatedAt: now,
  });
  await assignLeadAndHelpers(ctx, {
    propertyId: asset.propertyId,
    parent: { maintenanceOrderId: id },
    leadId,
    assignedBy: actorUserId,
  });
}
