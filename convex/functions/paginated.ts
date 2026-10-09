import { query, QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { getAuthContext, hasGranularPermission, scopeAuthContextToProperty } from "../lib/rbac";
import { canReadCompensation, stripCompensation } from "../lib/staffAccess";

const TABLE_READ_PERMISSIONS = {
  staffs: "staff.read",
  users: "users.read",
  properties: "properties.read",
  roles: "roles.read",
  userRoles: "users.read",
  roomTypes: "rooms.read",
  rooms: "rooms.read",
  reservations: "reservations.read",
  guests: "reservations.read",
  suppliers: "inventory.read",
  inventoryItems: "inventory.read",
  inventoryTransactions: "inventory.read",
  purchaseOrders: "inventory.read",
  purchaseOrderLines: "inventory.read",
  bars: "fnb.read",
  beverages: "fnb.read",
  shifts: "staff.read",
  userStockLogs: "fnb.read",
  storeInventories: "inventory.read",
  storeTransactions: "inventory.read",
  pendingInvites: "users.read",
  hours: "payroll.timesheet.read",
  timeOff: "payroll.leave.read",
  timeOffTypes: "payroll.leave.read",
  payrolls: "payroll.run.read",
  staffPay: "payroll.run.read",
  payCycles: "payroll.run.read",
  payItemTypes: "payroll.settings.update",
  holidays: "payroll.settings.update",
  extraPayRules: "payroll.settings.update",
  payslips: "payroll.payslip.read",
  paymentFiles: "payroll.run.export",
  housekeepingTasks: "housekeeping.task.read",
  maintenanceOrders: "maintenance.order.read",
  inventoryTasks: "inventory.task.read",
} as const;

type TableName = keyof typeof TABLE_READ_PERMISSIONS;

const PROPERTY_REQUIRED = new Set<TableName>([
  "roomTypes",
  "rooms",
  "reservations",
  "guests",
  "housekeepingTasks",
]);

const PROPERTY_INDEXED = new Set<TableName>([
  "staffs",
  "userRoles",
  "roomTypes",
  "rooms",
  "reservations",
  "guests",
  "suppliers",
  "inventoryItems",
  "inventoryTransactions",
  "purchaseOrders",
  "purchaseOrderLines",
  "bars",
  "beverages",
  "shifts",
  "userStockLogs",
  "storeInventories",
  "storeTransactions",
  "pendingInvites",
  "hours",
  "timeOff",
  "timeOffTypes",
  "payrolls",
  "payCycles",
  "payItemTypes",
  "extraPayRules",
  "payslips",
  "housekeepingTasks",
  "maintenanceOrders",
  "inventoryTasks",
]);

function emptyPage() {
  return { page: [], isDone: true, continueCursor: "" };
}

function manualPage<T>(rows: T[], cursor: string | undefined, limit: number) {
  const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
  const page = rows.slice(offset, offset + limit);
  const next = offset + page.length;
  const isDone = next >= rows.length;
  return { page, isDone, continueCursor: isDone ? "" : String(next) };
}

function allowedProperties(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
  table: TableName,
  propertyId: Id<"properties"> | undefined,
) {
  if (propertyId && !auth.propertyIds.includes(propertyId)) return [];
  const candidates = propertyId ? [propertyId] : auth.propertyIds;
  const permission = TABLE_READ_PERMISSIONS[table];
  return candidates.filter((id) =>
    hasGranularPermission(scopeAuthContextToProperty(auth, id), permission),
  );
}

function presentStaff(auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>, row: Doc<"staffs">) {
  if (!row.propertyId) return null;
  const scoped = scopeAuthContextToProperty(auth, row.propertyId);
  return stripCompensation({ ...row }, canReadCompensation(scoped));
}

async function paginateIndexed(
  ctx: QueryCtx,
  table: TableName,
  propertyIds: Id<"properties">[],
  paginationOpts: { numItems: number; cursor: string | null },
  sortOrder: "asc" | "desc",
) {
  if (propertyIds.length === 1) {
    const propertyId = propertyIds[0];
    return await ctx.db
      .query(table as "staffs")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
      .order(sortOrder)
      .paginate(paginationOpts);
  }

  const rows: Array<Doc<"staffs"> & { propertyId?: Id<"properties"> }> = [];
  for (const propertyId of propertyIds) {
    const page = await ctx.db
      .query(table as "staffs")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
      .collect();
    rows.push(...page);
  }
  rows.sort((a, b) =>
    sortOrder === "asc" ? a._creationTime - b._creationTime : b._creationTime - a._creationTime,
  );
  return manualPage(rows, paginationOpts.cursor ?? undefined, paginationOpts.numItems);
}

export const getPaginatedData = query({
  args: {
    searchTerm: v.optional(v.string()),
    table: v.union(
      v.literal("staffs"),
      v.literal("users"),
      v.literal("properties"),
      v.literal("roles"),
      v.literal("userRoles"),
      v.literal("roomTypes"),
      v.literal("rooms"),
      v.literal("reservations"),
      v.literal("guests"),
      v.literal("suppliers"),
      v.literal("inventoryItems"),
      v.literal("inventoryTransactions"),
      v.literal("purchaseOrders"),
      v.literal("purchaseOrderLines"),
      v.literal("bars"),
      v.literal("beverages"),
      v.literal("shifts"),
      v.literal("userStockLogs"),
      v.literal("storeInventories"),
      v.literal("storeTransactions"),
      v.literal("pendingInvites"),
      v.literal("hours"),
      v.literal("timeOff"),
      v.literal("timeOffTypes"),
      v.literal("payrolls"),
      v.literal("staffPay"),
      v.literal("payCycles"),
      v.literal("payItemTypes"),
      v.literal("holidays"),
      v.literal("extraPayRules"),
      v.literal("payslips"),
      v.literal("paymentFiles"),
      v.literal("housekeepingTasks"),
      v.literal("maintenanceOrders"),
      v.literal("inventoryTasks"),
    ),
    limit: v.number(),
    cursor: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    propertyId: v.optional(v.id("properties")),
  },

  handler: async (ctx, { table, limit, cursor, sortOrder, searchTerm, propertyId }) => {
    const pageSize = Math.min(Math.max(Math.floor(limit), 1), 50);
    const auth = await getAuthContext(ctx);
    if (!auth) return emptyPage();

    if (PROPERTY_REQUIRED.has(table) && !propertyId) return emptyPage();

    if (table === "roles") {
      if (!hasGranularPermission(auth, TABLE_READ_PERMISSIONS.roles)) return emptyPage();
      return await ctx.db
        .query("roles")
        .order(sortOrder ?? "desc")
        .paginate({ numItems: pageSize, cursor: cursor ?? null });
    }

    const allowed = allowedProperties(auth, table, propertyId);
    if (allowed.length === 0) return emptyPage();

    const term = searchTerm?.trim();
    const paginationOpts = { numItems: pageSize, cursor: cursor ?? null };
    const order = sortOrder ?? "desc";

    try {
      if (table === "users") {
        const userIds = new Set<Id<"users">>();
        for (const id of allowed) {
          const roles = await ctx.db
            .query("userRoles")
            .withIndex("by_propertyId", (q) => q.eq("propertyId", id))
            .collect();
          for (const role of roles) userIds.add(role.userId);
        }
        let users: Doc<"users">[] = [];
        for (const userId of userIds) {
          const user = await ctx.db.get(userId);
          if (user) users.push(user);
        }
        if (term) {
          const lower = term.toLowerCase();
          users = users.filter(
            (user) =>
              user.name.toLowerCase().includes(lower) ||
              user.email.toLowerCase().includes(lower) ||
              user.searchName?.toLowerCase().includes(lower),
          );
        }
        users.sort((a, b) => b._creationTime - a._creationTime);
        return manualPage(users, cursor, pageSize);
      }

      if (table === "properties") {
        const properties: Doc<"properties">[] = [];
        for (const id of allowed) {
          const property = await ctx.db.get(id);
          if (property) properties.push(property);
        }
        properties.sort((a, b) => b._creationTime - a._creationTime);
        return manualPage(properties, cursor, pageSize);
      }

      if (table === "staffPay" || table === "paymentFiles") {
        const rows: Array<Record<string, unknown>> = [];
        for (const id of allowed) {
          const payrolls = await ctx.db
            .query("payrolls")
            .withIndex("by_propertyId", (q) => q.eq("propertyId", id))
            .collect();
          for (const payroll of payrolls) {
            if (table === "staffPay") {
              const lines = await ctx.db
                .query("staffPay")
                .withIndex("by_payrollId", (q) => q.eq("payrollId", payroll._id))
                .collect();
              rows.push(...lines);
            } else {
              const files = await ctx.db
                .query("paymentFiles")
                .withIndex("by_payrollId", (q) => q.eq("payrollId", payroll._id))
                .collect();
              for (const file of files) {
                const { content: _content, ...safe } = file;
                rows.push(safe);
              }
            }
          }
        }
        rows.sort((a, b) => Number(b._creationTime) - Number(a._creationTime));
        return manualPage(rows, cursor, pageSize);
      }

      if (table === "holidays") {
        const rows: Doc<"holidays">[] = [];
        for (const id of allowed) {
          const calendars = await ctx.db
            .query("holidayCalendars")
            .withIndex("by_propertyId", (q) => q.eq("propertyId", id))
            .collect();
          for (const calendar of calendars) {
            const holidays = await ctx.db
              .query("holidays")
              .withIndex("by_holidayCalendarId", (q) => q.eq("holidayCalendarId", calendar._id))
              .collect();
            rows.push(...holidays);
          }
        }
        rows.sort((a, b) => b._creationTime - a._creationTime);
        return manualPage(rows, cursor, pageSize);
      }

      if (term && table === "staffs") {
        const lower = term.toLowerCase();
        const matches: Doc<"staffs">[] = [];
        for (const id of allowed) {
          const staffs = await ctx.db
            .query("staffs")
            .withIndex("by_propertyId", (q) => q.eq("propertyId", id))
            .collect();
          for (const row of staffs) {
            const haystack = `${row.firstName} ${row.lastName} ${row.searchName ?? ""}`.toLowerCase();
            if (haystack.includes(lower)) matches.push(row);
          }
        }
        matches.sort((a, b) => b._creationTime - a._creationTime);
        const sliced = manualPage(matches, cursor, pageSize);
        return {
          ...sliced,
          page: sliced.page
            .map((row) => presentStaff(auth, row))
            .filter((row) => row !== null),
        };
      }

      if (term && table === "guests") {
        if (!propertyId) return emptyPage();
        return await ctx.db
          .query("guests")
          .withSearchIndex("search_guests", (idx) =>
            idx.search("searchName", term).eq("propertyId", propertyId),
          )
          .paginate(paginationOpts);
      }

      if (table === "pendingInvites") {
        const invites: Doc<"pendingInvites">[] = [];
        for (const id of allowed) {
          const page = await ctx.db
            .query("pendingInvites")
            .withIndex("by_propertyId", (q) => q.eq("propertyId", id))
            .collect();
          invites.push(...page);
        }
        invites.sort((a, b) => b._creationTime - a._creationTime);
        const sliced = manualPage(invites, cursor, pageSize);
        const enrichedPage = await Promise.all(
          sliced.page.map(async (invite) => {
            const role = await ctx.db.get(invite.roleId);
            const inviter = await ctx.db.get(invite.invitedBy);
            return {
              ...invite,
              roleName: role?.name || "Unknown",
              inviterName: inviter?.name || "Unknown",
            };
          }),
        );
        return { ...sliced, page: enrichedPage };
      }

      if (propertyId && table === "reservations") {
        const items = await ctx.db
          .query("reservations")
          .withIndex("by_propertyId", (q) => q.eq("propertyId", propertyId))
          .order(order)
          .paginate(paginationOpts);
        const enrichedPage = await Promise.all(
          items.page.map(async (reservation) => {
            const guest = await ctx.db.get(reservation.guestId);
            const room = await ctx.db.get(reservation.roomId);
            const roomType = room ? await ctx.db.get(room.roomTypeId) : null;
            const bookedByUser = reservation.bookedByUserId
              ? await ctx.db.get(reservation.bookedByUserId)
              : null;
            const bookedBy = bookedByUser
              ? { _id: bookedByUser._id, name: bookedByUser.name, email: bookedByUser.email }
              : null;
            return {
              ...reservation,
              guest,
              room: room ? { ...room, roomType } : null,
              bookedBy,
            };
          }),
        );
        return { ...items, page: enrichedPage };
      }

      if (!PROPERTY_INDEXED.has(table)) return emptyPage();

      const page = await paginateIndexed(ctx, table, allowed, paginationOpts, order);
      if (table === "staffs") {
        return {
          ...page,
          page: page.page
            .map((row) => presentStaff(auth, row as Doc<"staffs">))
            .filter((row) => row !== null),
        };
      }
      return page;
    } catch (error) {
      console.log(`Fetch failed ${error}`);
      return {
        success: false,
        message: "Failed to fetch paginated data",
        page: null,
        isDone: null,
        continueCursor: null,
      };
    }
  },
});
