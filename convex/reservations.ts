import { mutation, query, MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requirePermission } from './lib/rbac';
import { maybeCreateCheckoutOnCheckOut, maybeCreateStayoverOnCheckIn } from './lib/taskAssignment';

function generateConfirmationNumber(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RES-${year}${month}${day}-${random}`;
}

function isBlockingStatus(status: string): boolean {
  return status === 'pending' || status === 'confirmed' || status === 'checked-in';
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function findOverlappingReservation(
  ctx: MutationCtx,
  args: {
    roomId: Id<'rooms'>;
    checkInDate: number;
    checkOutDate: number;
    excludeId?: Id<'reservations'>;
  },
) {
  const existing = await ctx.db
    .query('reservations')
    .withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
    .collect();

  return existing.find((row) => {
    if (args.excludeId && row._id === args.excludeId) return false;
    if (!isBlockingStatus(row.status)) return false;
    return rangesOverlap(row.checkInDate, row.checkOutDate, args.checkInDate, args.checkOutDate);
  });
}

async function syncRoomOccupancy(ctx: MutationCtx, roomId: Id<'rooms'>) {
  const room = await ctx.db.get(roomId);
  if (!room) return;
  if (room.status === 'out-of-order' || room.status === 'maintenance') return;

  const stays = await ctx.db
    .query('reservations')
    .withIndex('by_roomId', (q) => q.eq('roomId', roomId))
    .collect();
  const occupied = stays.some((row) => row.status === 'checked-in');
  const next = occupied ? 'occupied' : 'available';
  if (room.status !== next) {
    await ctx.db.patch(roomId, { status: next, updatedAt: Date.now() });
  }
}

async function allocateConfirmationNumber(ctx: MutationCtx, timestamp: number): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const confirmationNumber = generateConfirmationNumber(timestamp + attempt);
    const clash = await ctx.db
      .query('reservations')
      .withIndex('by_confirmationNumber', (q) => q.eq('confirmationNumber', confirmationNumber))
      .first();
    if (!clash) return confirmationNumber;
  }
  return `RES-${timestamp}`;
}

export const getAllReservations = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reservations.read', args.propertyId);
    try {
      const reservations = await ctx.db
        .query('reservations')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();

      const reservationsWithDetails = await Promise.all(
        reservations.map(async (reservation) => {
          const guest = await ctx.db.get(reservation.guestId);
          const room = await ctx.db.get(reservation.roomId);
          const roomType = room ? await ctx.db.get(room.roomTypeId) : null;

          return {
            ...reservation,
            guest,
            room: room ? { ...room, roomType } : null,
          };
        })
      );

      return { success: true, data: reservationsWithDetails };
    } catch (error) {
      console.log(`Failed to fetch reservations: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch reservations' };
    }
  },
});

export const getReservation = query({
  args: { reservationId: v.id('reservations') },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      return { success: false, data: null, message: 'Reservation not found' };
    }
    await requirePermission(ctx, 'reservations.read', reservation.propertyId);
    try {
      const guest = await ctx.db.get(reservation.guestId);
      const room = await ctx.db.get(reservation.roomId);
      const roomType = room ? await ctx.db.get(room.roomTypeId) : null;
      const property = await ctx.db.get(reservation.propertyId);

      return {
        success: true,
        data: {
          ...reservation,
          guest,
          room: room ? { ...room, roomType } : null,
          property,
        },
      };
    } catch (error) {
      console.log(`Failed to fetch reservation: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch reservation' };
    }
  },
});

export const createReservation = mutation({
  args: {
    propertyId: v.id('properties'),
    roomId: v.id('rooms'),
    guestId: v.id('guests'),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    numberOfGuests: v.number(),
    rate: v.number(),
    totalAmount: v.number(),
    depositAmount: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("checked-in"), v.literal("checked-out"), v.literal("cancelled")),
    source: v.optional(v.union(v.literal("direct"), v.literal("ota"), v.literal("walk-in"), v.literal("phone"), v.literal("other"))),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'reservations.create', args.propertyId);
    try {
      if (args.checkOutDate <= args.checkInDate) {
        return { success: false, message: 'Check-out date must be after check-in date' };
      }

      const room = await ctx.db.get(args.roomId);
      if (!room) {
        return { success: false, message: 'Room does not exist' };
      }
      if (room.propertyId !== args.propertyId) {
        return { success: false, message: 'Room does not belong to this property' };
      }
      if (!room.isActive) {
        return { success: false, message: 'Room is inactive' };
      }
      if (room.status === 'out-of-order' || room.status === 'maintenance') {
        return { success: false, message: 'Room is not available for booking' };
      }

      const roomType = await ctx.db.get(room.roomTypeId);
      if (roomType && args.numberOfGuests > roomType.maxOccupancy) {
        return { success: false, message: `Guest count exceeds max occupancy (${roomType.maxOccupancy})` };
      }

      const guest = await ctx.db.get(args.guestId);
      if (!guest) {
        return { success: false, message: 'Guest does not exist' };
      }
      if (guest.propertyId !== args.propertyId) {
        return { success: false, message: 'Guest does not belong to this property' };
      }

      if (isBlockingStatus(args.status)) {
        const overlappingReservation = await findOverlappingReservation(ctx, {
          roomId: args.roomId,
          checkInDate: args.checkInDate,
          checkOutDate: args.checkOutDate,
        });
        if (overlappingReservation) {
          return { success: false, message: 'Room is already reserved for these dates' };
        }
      }

      const now = Date.now();
      const confirmationNumber = await allocateConfirmationNumber(ctx, now);

      const reservationId = await ctx.db.insert('reservations', {
        propertyId: args.propertyId,
        roomId: args.roomId,
        guestId: args.guestId,
        confirmationNumber,
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        numberOfGuests: args.numberOfGuests,
        rate: args.rate,
        totalAmount: args.totalAmount,
        depositAmount: args.depositAmount,
        status: args.status,
        source: args.source,
        specialRequests: args.specialRequests,
        checkedInAt: args.status === 'checked-in' ? now : undefined,
        checkedOutAt: args.status === 'checked-out' ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });

      await syncRoomOccupancy(ctx, args.roomId);

      const created = await ctx.db.get(reservationId);
      if (created && args.status === 'checked-in') {
        await maybeCreateStayoverOnCheckIn(ctx, created, auth.user._id);
      }
      if (created && args.status === 'checked-out') {
        await maybeCreateCheckoutOnCheckOut(ctx, created, auth.user._id);
      }

      return { success: true, message: 'Reservation created successfully', id: reservationId, confirmationNumber };
    } catch (error) {
      console.log(`Failed to create reservation: ${error}`);
      return { success: false, message: 'Failed to create reservation' };
    }
  },
});

export const updateReservation = mutation({
  args: {
    reservationId: v.id('reservations'),
    roomId: v.id('rooms'),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    numberOfGuests: v.number(),
    rate: v.number(),
    totalAmount: v.number(),
    depositAmount: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("checked-in"), v.literal("checked-out"), v.literal("cancelled")),
    source: v.optional(v.union(v.literal("direct"), v.literal("ota"), v.literal("walk-in"), v.literal("phone"), v.literal("other"))),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingReservation = await ctx.db.get(args.reservationId);

    if (!existingReservation) {
      return { success: false, message: 'Reservation does not exist' };
    }

    const auth = await requirePermission(ctx, 'reservations.update', existingReservation.propertyId);

    try {
      if (args.checkOutDate <= args.checkInDate) {
        return { success: false, message: 'Check-out date must be after check-in date' };
      }

      const room = await ctx.db.get(args.roomId);
      if (!room) {
        return { success: false, message: 'Room does not exist' };
      }
      if (room.propertyId !== existingReservation.propertyId) {
        return { success: false, message: 'Room does not belong to this property' };
      }
      if (!room.isActive) {
        return { success: false, message: 'Room is inactive' };
      }
      const stayingInSameRoom =
        existingReservation.roomId === args.roomId &&
        existingReservation.status === 'checked-in' &&
        args.status === 'checked-in';
      if (
        (room.status === 'out-of-order' || room.status === 'maintenance') &&
        args.status !== 'cancelled' &&
        args.status !== 'checked-out' &&
        !stayingInSameRoom
      ) {
        return { success: false, message: 'Room is not available for booking' };
      }

      const roomType = await ctx.db.get(room.roomTypeId);
      if (roomType && args.numberOfGuests > roomType.maxOccupancy) {
        return { success: false, message: `Guest count exceeds max occupancy (${roomType.maxOccupancy})` };
      }

      if (isBlockingStatus(args.status)) {
        const overlappingReservation = await findOverlappingReservation(ctx, {
          roomId: args.roomId,
          checkInDate: args.checkInDate,
          checkOutDate: args.checkOutDate,
          excludeId: args.reservationId,
        });
        if (overlappingReservation) {
          return { success: false, message: 'Room is already reserved for these dates' };
        }
      }

      const now = Date.now();
      const updateData: Record<string, unknown> = {
        roomId: args.roomId,
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        numberOfGuests: args.numberOfGuests,
        rate: args.rate,
        totalAmount: args.totalAmount,
        depositAmount: args.depositAmount,
        status: args.status,
        source: args.source,
        specialRequests: args.specialRequests,
        updatedAt: now,
      };

      if (args.status === 'checked-in' && existingReservation.status !== 'checked-in') {
        updateData.checkedInAt = now;
      }

      if (args.status === 'checked-out' && existingReservation.status !== 'checked-out') {
        updateData.checkedOutAt = now;
      }

      await ctx.db.patch(args.reservationId, updateData);

      await syncRoomOccupancy(ctx, args.roomId);
      if (args.roomId !== existingReservation.roomId) {
        await syncRoomOccupancy(ctx, existingReservation.roomId);
      }

      const updated = await ctx.db.get(args.reservationId);
      if (updated) {
        if (args.status === 'checked-in' && existingReservation.status !== 'checked-in') {
          await maybeCreateStayoverOnCheckIn(ctx, updated, auth.user._id);
        }
        if (args.status === 'checked-out' && existingReservation.status !== 'checked-out') {
          await maybeCreateCheckoutOnCheckOut(ctx, updated, auth.user._id);
        }
      }

      return { success: true, message: 'Reservation updated successfully' };
    } catch (error) {
      console.log(`Failed to update reservation: ${error}`);
      return { success: false, message: 'Failed to update reservation' };
    }
  },
});

export const deleteReservation = mutation({
  args: { reservationId: v.id('reservations') },
  handler: async (ctx, args) => {
    const existingReservation = await ctx.db.get(args.reservationId);

    if (!existingReservation) {
      return { success: false, message: 'Reservation does not exist' };
    }

    await requirePermission(ctx, 'reservations.delete', existingReservation.propertyId);

    try {
      if (existingReservation.status === 'checked-in' || existingReservation.status === 'checked-out') {
        return { success: false, message: 'Cannot delete checked-in or checked-out reservations' };
      }

      const roomId = existingReservation.roomId;
      await ctx.db.delete(args.reservationId);
      await syncRoomOccupancy(ctx, roomId);
      return { success: true, message: 'Reservation deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete reservation: ${error}`);
      return { success: false, message: 'Failed to delete reservation' };
    }
  },
});
