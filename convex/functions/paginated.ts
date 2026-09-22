// convex/staffs.ts

import { query } from "../_generated/server";
import { v } from "convex/values";
import { tryRequirePermission } from "../lib/rbac";

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

export const getPaginatedData = query({

  args: {
    //collection name
    searchTerm: v.optional(v.string()),
    table: v.union(
      v.literal('staffs'),
      v.literal('users'),
      v.literal('properties'),
      v.literal('roles'),
      v.literal('userRoles'),
      v.literal('roomTypes'),
      v.literal('rooms'),
      v.literal('reservations'),
      v.literal('guests'),
      v.literal('suppliers'),
      v.literal('inventoryItems'),
      v.literal('inventoryTransactions'),
      v.literal('purchaseOrders'),
      v.literal('purchaseOrderLines'),
      v.literal('bars'),
      v.literal('beverages'),
      v.literal('shifts'),
      v.literal('userStockLogs'),
      v.literal('storeInventories'),
      v.literal('storeTransactions'),
      v.literal('pendingInvites'),
      v.literal('hours'),
      v.literal('timeOff'),
      v.literal('timeOffTypes'),
      v.literal('payrolls'),
      v.literal('staffPay'),
      v.literal('payCycles'),
      v.literal('payItemTypes'),
      v.literal('holidays'),
      v.literal('extraPayRules'),
      v.literal('payslips'),
      v.literal('paymentFiles'),
      v.literal('housekeepingTasks'),
      v.literal('maintenanceOrders'),
      v.literal('inventoryTasks')
    ),
    limit: v.number(), //items per page
    cursor: v.optional(v.string()), //current page cursor
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))), // optional
    propertyId: v.optional(v.id('properties')),
  },

  handler: async (ctx, { table, limit, cursor, sortOrder, searchTerm, propertyId}) => {
    const PROPERTY_SCOPED_TABLES = new Set([
      'roomTypes',
      'rooms',
      'reservations',
      'guests',
      'housekeepingTasks',
    ]);

    if (PROPERTY_SCOPED_TABLES.has(table) && !propertyId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const auth = await tryRequirePermission(
      ctx,
      TABLE_READ_PERMISSIONS[table],
      propertyId,
    );
    if (!auth) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    try {
      const term = searchTerm?.trim();
      const paginationOpts = { numItems: limit, cursor: cursor ?? null };

      if (term && table === 'staffs') {
        return await ctx.db
          .query('staffs')
          .withSearchIndex('search_staff', (idx) => idx.search('searchName', term))
          .paginate(paginationOpts);
      }

      if (term && table === 'guests') {
        if (!propertyId) {
          return { page: [], isDone: true, continueCursor: "" };
        }
        return await ctx.db
          .query('guests')
          .withSearchIndex('search_guests', (idx) =>
            idx.search('searchName', term).eq('propertyId', propertyId),
          )
          .paginate(paginationOpts);
      }

      if (term && table === 'users') {
        return await ctx.db
          .query('users')
          .withSearchIndex('search_users', (idx) => idx.search('searchName', term))
          .paginate(paginationOpts);
      }

      if (table === 'pendingInvites') {
        // Include pending, expired, and revoked so the admin UI can re-invite.
        // Accepted rows stay visible as history ("User accepted").
        const items = await ctx.db
          .query('pendingInvites')
          .order('desc')
          .paginate({ numItems: limit, cursor: cursor  ?? null});

        const enrichedPage = await Promise.all(
          items.page.map(async (invite) => {
            const role = await ctx.db.get(invite.roleId);
            const inviter = await ctx.db.get(invite.invitedBy);
            return {
              ...invite,
              roleName: role?.name || "Unknown",
              inviterName: inviter?.name || "Unknown",
            };
          })
        );

        return {
          ...items,
          page: enrichedPage,
        };

      } else if (propertyId && table === 'reservations') {
        const items = await ctx.db
          .query('reservations')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
          .order(sortOrder ?? 'desc')
          .paginate(paginationOpts);
        const enrichedPage = await Promise.all(
          items.page.map(async (reservation) => {
            const guest = await ctx.db.get(reservation.guestId);
            const room = await ctx.db.get(reservation.roomId);
            const roomType = room ? await ctx.db.get(room.roomTypeId) : null;
            return {
              ...reservation,
              guest,
              room: room ? { ...room, roomType } : null,
            };
          }),
        );
        return { ...items, page: enrichedPage };
      } else if (propertyId && table === 'rooms') {
        return await ctx.db
          .query('rooms')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
          .order(sortOrder ?? 'desc')
          .paginate(paginationOpts);
      } else if (propertyId && table === 'roomTypes') {
        return await ctx.db
          .query('roomTypes')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
          .order(sortOrder ?? 'desc')
          .paginate(paginationOpts);
      } else if (propertyId && table === 'guests') {
        return await ctx.db
          .query('guests')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
          .order(sortOrder ?? 'desc')
          .paginate(paginationOpts);
      } else if (propertyId && table === 'housekeepingTasks') {
        return await ctx.db
          .query('housekeepingTasks')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', propertyId))
          .order(sortOrder ?? 'desc')
          .paginate(paginationOpts);
      } else {
        return await ctx.db
          .query(table)
          .order(sortOrder ?? 'desc')
          .paginate(paginationOpts);
      }
    } catch (error) {

      console.log(`Fetch failed ${error}`)
      return { success: false, message: "Failed to fetch paginated data", page: null, isDone: null, continueCursor: null};

    }

  },
    
});
