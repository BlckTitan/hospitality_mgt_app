import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Generate unique confirmation number
function generateConfirmationNumber(propertyId: string, timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RES-${year}${month}${day}-${random}`;
}

export const getAllReservations = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    try {
      const reservations = await ctx.db
        .query('reservations')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      // Fetch related data for each reservation
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
    try {
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation) {
        return { success: false, data: null, message: 'Reservation not found' };
      }
      
      // Fetch related data
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
    try {
      // Validate dates
      if (args.checkOutDate <= args.checkInDate) {
        return { success: false, message: 'Check-out date must be after check-in date' };
      }

      // Verify room exists and is available
      const room = await ctx.db.get(args.roomId);
      if (!room) {
        return { success: false, message: 'Room does not exist' };
      }

      if (room.propertyId !== args.propertyId) {
        return { success: false, message: 'Room does not belong to this property' };
      }

      // Check for overlapping reservations
      const overlappingReservation = await ctx.db
        .query('reservations')
        .withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
        .filter((q) =>
          q.and(
            q.or(
              q.eq(q.field('status'), 'confirmed'),
              q.eq(q.field('status'), 'checked-in')
            ),
            q.or(
              q.and(
                q.gte(q.field('checkInDate'), args.checkInDate),
                q.lt(q.field('checkInDate'), args.checkOutDate)
              ),
              q.and(
                q.gt(q.field('checkOutDate'), args.checkInDate),
                q.lte(q.field('checkOutDate'), args.checkOutDate)
              ),
              q.and(
                q.lte(q.field('checkInDate'), args.checkInDate),
                q.gte(q.field('checkOutDate'), args.checkOutDate)
              )
            )
          )
        )
        .first();

      if (overlappingReservation) {
        return { success: false, message: 'Room is already reserved for these dates' };
      }

      // Verify guest exists
      const guest = await ctx.db.get(args.guestId);
      if (!guest) {
        return { success: false, message: 'Guest does not exist' };
      }

      const now = Date.now();
      const confirmationNumber = generateConfirmationNumber(args.propertyId, now);

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
        createdAt: now,
        updatedAt: now,
      });

      // Update room status if reservation is confirmed or checked-in
      if (args.status === 'confirmed' || args.status === 'checked-in') {
        await ctx.db.patch(args.roomId, {
          status: 'occupied',
          updatedAt: now,
        });
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
    try {
      const existingReservation = await ctx.db.get(args.reservationId);

      if (!existingReservation) {
        return { success: false, message: 'Reservation does not exist' };
      }

      // Validate dates
      if (args.checkOutDate <= args.checkInDate) {
        return { success: false, message: 'Check-out date must be after check-in date' };
      }

      // Check for overlapping reservations if room or dates changed
      if (args.roomId !== existingReservation.roomId || 
          args.checkInDate !== existingReservation.checkInDate || 
          args.checkOutDate !== existingReservation.checkOutDate) {
        const overlappingReservation = await ctx.db
          .query('reservations')
          .withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
          .filter((q) =>
            q.and(
              q.neq(q.field('_id'), args.reservationId),
              q.or(
                q.eq(q.field('status'), 'confirmed'),
                q.eq(q.field('status'), 'checked-in')
              ),
              q.or(
                q.and(
                  q.gte(q.field('checkInDate'), args.checkInDate),
                  q.lt(q.field('checkInDate'), args.checkOutDate)
                ),
                q.and(
                  q.gt(q.field('checkOutDate'), args.checkInDate),
                  q.lte(q.field('checkOutDate'), args.checkOutDate)
                ),
                q.and(
                  q.lte(q.field('checkInDate'), args.checkInDate),
                  q.gte(q.field('checkOutDate'), args.checkOutDate)
                )
              )
            )
          )
          .first();

        if (overlappingReservation) {
          return { success: false, message: 'Room is already reserved for these dates' };
        }
      }

      const now = Date.now();
      const updateData: any = {
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

      // Handle status changes
      if (args.status === 'checked-in' && existingReservation.status !== 'checked-in') {
        updateData.checkedInAt = now;
      }

      if (args.status === 'checked-out' && existingReservation.status !== 'checked-out') {
        updateData.checkedOutAt = now;
      }

      await ctx.db.patch(args.reservationId, updateData);

      // Update room status based on reservation status
      const room = await ctx.db.get(args.roomId);
      if (room) {
        if (args.status === 'checked-out' || args.status === 'cancelled') {
          await ctx.db.patch(args.roomId, {
            status: 'available',
            updatedAt: now,
          });
        } else if (args.status === 'confirmed' || args.status === 'checked-in') {
          await ctx.db.patch(args.roomId, {
            status: 'occupied',
            updatedAt: now,
          });
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
    try {
      const existingReservation = await ctx.db.get(args.reservationId);

      if (!existingReservation) {
        return { success: false, message: 'Reservation does not exist' };
      }

      // Prevent deletion of checked-in or checked-out reservations
      if (existingReservation.status === 'checked-in' || existingReservation.status === 'checked-out') {
        return { success: false, message: 'Cannot delete checked-in or checked-out reservations' };
      }

      const now = Date.now();
      
      // Update room status back to available
      const room = await ctx.db.get(existingReservation.roomId);
      if (room && room.status === 'occupied') {
        await ctx.db.patch(existingReservation.roomId, {
          status: 'available',
          updatedAt: now,
        });
      }

      await ctx.db.delete(args.reservationId);
      return { success: true, message: 'Reservation deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete reservation: ${error}`);
      return { success: false, message: 'Failed to delete reservation' };
    }
  },
});
