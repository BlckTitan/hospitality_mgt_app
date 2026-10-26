import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { requirePermission, tryRequirePermission } from './lib/rbac';
import { peopleSearchName } from './lib/searchNames';
import { maybeCreateCheckoutOnCheckOut, maybeCreateStayoverOnCheckIn } from './lib/taskAssignment';
import { requireFrontOfficeDuty } from './lib/dutyContext';
import { propertyTimeZone, localDayBounds } from './lib/billingPeriods';
import {
  DAY_MS,
  HOUR_MS,
  MAY_EXTEND_LEAD_DAYS,
  addDateKey,
  isShortStay,
  overnightBlocksShortStay,
  rangesOverlap,
  reminderDaysOf,
  shortStayRateFor,
  stayKindOf,
  utcDateKey,
  roomHasOpenCheckoutClean,
} from './lib/stays';

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

async function resolveDeskActor(
  ctx: MutationCtx | QueryCtx,
  userId?: Id<'users'>,
  employeeId?: Id<'staffs'>,
) {
  if (!userId && !employeeId) return null;
  const [user, staff] = await Promise.all([
    userId ? ctx.db.get(userId) : null,
    employeeId ? ctx.db.get(employeeId) : null,
  ]);
  if (!user && !staff) return null;
  return {
    _id: user?._id,
    name: staff
      ? `${staff.firstName} ${staff.lastName}`.trim()
      : (user?.name || user?.email || 'Staff'),
    email: user?.email,
  };
}

async function guardFrontOffice(
  ctx: MutationCtx,
  propertyId: Id<'properties'>,
  userId: Id<'users'>,
) {
  return await requireFrontOfficeDuty(ctx, { userId, propertyId });
}

async function bookingConflict(
  ctx: MutationCtx,
  args: {
    roomId: Id<'rooms'>;
    stayKind: 'overnight' | 'short';
    checkInDate: number;
    checkOutDate: number;
    excludeId?: Id<'reservations'>;
    checkingIn?: boolean;
  },
): Promise<string | null> {
  const existing = await ctx.db
    .query('reservations')
    .withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
    .collect();
  const others = existing.filter((row) => row._id !== args.excludeId && isBlockingStatus(row.status));

  if (args.stayKind === 'short') {
    if (await roomHasOpenCheckoutClean(ctx, args.roomId)) {
      return 'Room is not ready. Finish the checkout clean before a short stay.';
    }
    if (args.checkingIn && others.some((row) => row.status === 'checked-in')) {
      return 'Room is occupied until the current guest checks out';
    }
    for (const row of others) {
      if (isShortStay(row) && rangesOverlap(row.checkInDate, row.checkOutDate, args.checkInDate, args.checkOutDate)) {
        return 'Room already has a short stay at this time';
      }
      if (overnightBlocksShortStay(row, args.checkInDate, args.checkOutDate)) {
        return 'This room is reserved for an overnight stay and cannot be used for a short stay';
      }
    }
    return null;
  }

  const overlap = others.find((row) =>
    rangesOverlap(row.checkInDate, row.checkOutDate, args.checkInDate, args.checkOutDate),
  );
  if (overlap) return 'Room is already reserved for these dates';
  return null;
}

async function pricedShortStay(
  ctx: MutationCtx,
  roomTypeId: Id<'roomTypes'>,
  durationHours: number | undefined,
  checkInDate: number,
): Promise<{ hours: number; checkOutDate: number; amount: number } | { error: string }> {
  if (durationHours === undefined || !Number.isInteger(durationHours) || durationHours < 1 || durationHours > 7) {
    return { error: 'Choose a short stay of 1 to 7 hours' };
  }
  const rate = await shortStayRateFor(ctx, roomTypeId, durationHours);
  if (!rate || rate.amount <= 0) {
    return { error: `No price is set for a ${durationHours}-hour stay on this room type` };
  }
  return {
    hours: durationHours,
    checkOutDate: checkInDate + durationHours * HOUR_MS,
    amount: rate.amount,
  };
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
          const bookedBy = await resolveDeskActor(
            ctx,
            reservation.bookedByUserId,
            reservation.bookedByEmployeeId,
          );

          return {
            ...reservation,
            guest,
            room: room ? { ...room, roomType } : null,
            bookedBy,
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
      const [bookedBy, checkedInBy, checkedOutBy, retainerFollowedUpBy] = await Promise.all([
        resolveDeskActor(ctx, reservation.bookedByUserId, reservation.bookedByEmployeeId),
        resolveDeskActor(ctx, reservation.checkedInByUserId, reservation.checkedInByEmployeeId),
        resolveDeskActor(ctx, reservation.checkedOutByUserId, reservation.checkedOutByEmployeeId),
        resolveDeskActor(ctx, reservation.retainerFollowedUpByUserId, reservation.retainerFollowedUpByEmployeeId),
      ]);
      const payments = await ctx.db
        .query('payments')
        .withIndex('by_reference', (q) =>
          q.eq('referenceType', 'Reservation').eq('referenceId', args.reservationId),
        )
        .collect();
      const evidenceRows = await ctx.db
        .query('reservationPaymentDocuments')
        .withIndex('by_reservationId', (q) => q.eq('reservationId', args.reservationId))
        .collect();
      const paymentsWithEvidence = await Promise.all(
        payments.map(async (payment) => {
          const evidence = evidenceRows.find((row) => row.paymentId === payment._id) ?? null;
          const fileUrl =
            evidence?.storageId ? await ctx.storage.getUrl(evidence.storageId) : null;
          return { ...payment, evidence: evidence ? { ...evidence, fileUrl } : null };
        }),
      );
      const paidTotal = payments.reduce((sum, row) => sum + row.amount, 0);

      return {
        success: true,
        data: {
          ...reservation,
          guest,
          room: room ? { ...room, roomType } : null,
          property,
          bookedBy,
          checkedInBy,
          checkedOutBy,
          retainerFollowedUpBy,
          payments: paymentsWithEvidence,
          paidTotal,
        },
      };
    } catch (error) {
      console.log(`Failed to fetch reservation: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch reservation' };
    }
  },
});

const newGuestValidator = v.object({
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
});

export const createReservation = mutation({
  args: {
    propertyId: v.id('properties'),
    roomId: v.id('rooms'),
    /** Existing guest, or omit when creating with `newGuest`. */
    guestId: v.optional(v.id('guests')),
    /** Inline guest profile for find-or-create booking. */
    newGuest: v.optional(newGuestValidator),
    checkInDate: v.number(),
    checkOutDate: v.optional(v.number()),
    numberOfGuests: v.number(),
    rate: v.number(),
    totalAmount: v.number(),
    depositAmount: v.optional(v.number()),
    status: v.union(v.literal('pending'), v.literal('confirmed')),
    source: v.optional(v.union(v.literal("direct"), v.literal("ota"), v.literal("walk-in"), v.literal("phone"), v.literal("other"))),
    specialRequests: v.optional(v.string()),
    stayKind: v.optional(v.union(v.literal('overnight'), v.literal('short'))),
    durationHours: v.optional(v.number()),
    mayExtend: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, 'reservations.create', args.propertyId);
    const duty = await guardFrontOffice(ctx, args.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };
    try {
      const hasExisting = Boolean(args.guestId);
      const hasNew = Boolean(args.newGuest);
      if (hasExisting === hasNew) {
        return {
          success: false,
          message: 'Provide either an existing guest or new guest details',
        };
      }

      const stayKind = args.stayKind ?? 'overnight';
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

      let checkOutDate = args.checkOutDate ?? 0;
      let rate = args.rate;
      let totalAmount = args.totalAmount;
      let durationHours: number | undefined;
      if (stayKind === 'short') {
        const priced = await pricedShortStay(ctx, room.roomTypeId, args.durationHours, args.checkInDate);
        if ('error' in priced) return { success: false, message: priced.error };
        checkOutDate = priced.checkOutDate;
        rate = priced.amount;
        totalAmount = priced.amount;
        durationHours = priced.hours;
      } else if (checkOutDate <= args.checkInDate) {
        return { success: false, message: 'Check-out date must be after check-in date' };
      }

      const now = Date.now();
      let guestId: Id<'guests'>;

      if (args.newGuest) {
        const firstName = args.newGuest.firstName.trim();
        const lastName = args.newGuest.lastName.trim();
        if (firstName.length < 2 || lastName.length < 2) {
          return { success: false, message: 'Guest first and last name are required' };
        }
        const email = args.newGuest.email?.trim() || undefined;
        const phone = args.newGuest.phone?.trim() || undefined;
        guestId = await ctx.db.insert('guests', {
          propertyId: args.propertyId,
          firstName,
          lastName,
          email,
          phone,
          searchName: peopleSearchName(firstName, lastName),
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const guest = await ctx.db.get(args.guestId!);
        if (!guest) {
          return { success: false, message: 'Guest does not exist' };
        }
        if (guest.propertyId !== args.propertyId) {
          return { success: false, message: 'Guest does not belong to this property' };
        }
        guestId = args.guestId!;
      }

      if (isBlockingStatus(args.status)) {
        const conflict = await bookingConflict(ctx, {
          roomId: args.roomId,
          stayKind,
          checkInDate: args.checkInDate,
          checkOutDate,
        });
        if (conflict) return { success: false, message: conflict };
      }

      const confirmationNumber = await allocateConfirmationNumber(ctx, now);

      const reservationId = await ctx.db.insert('reservations', {
        propertyId: args.propertyId,
        roomId: args.roomId,
        guestId,
        confirmationNumber,
        checkInDate: args.checkInDate,
        checkOutDate,
        numberOfGuests: args.numberOfGuests,
        rate,
        totalAmount,
        depositAmount: args.depositAmount,
        status: args.status,
        source: args.source,
        specialRequests: args.specialRequests,
        stayKind,
        ...(durationHours ? { durationHours } : {}),
        ...(stayKind === 'overnight' && args.mayExtend ? { mayExtend: true } : {}),
        bookedByUserId: auth.user._id,
        ...(duty.stamp
          ? {
              ...(duty.stamp.employeeId
                ? { bookedByEmployeeId: duty.stamp.employeeId }
                : {}),
              bookedShiftId: duty.stamp.shiftId,
            }
          : {}),
        createdAt: now,
        updatedAt: now,
      });

      await syncRoomOccupancy(ctx, args.roomId);

      return { success: true, message: 'Reservation created successfully', id: reservationId, confirmationNumber, guestId };
    } catch (error) {
      console.log(`Failed to create reservation: ${error}`);
      return { success: false, message: 'Failed to create reservation' };
    }
  },
});

const paymentMethodValidator = v.union(
  v.literal('cash'),
  v.literal('card'),
  v.literal('bank_transfer'),
  v.literal('other'),
);

const paymentEvidenceArgs = {
  cashAttested: v.optional(v.boolean()),
  evidenceStorageId: v.optional(v.id('_storage')),
  evidenceFileName: v.optional(v.string()),
  evidenceMimeType: v.optional(v.string()),
  evidenceFileSize: v.optional(v.number()),
  evidenceNote: v.optional(v.string()),
};

type PaymentEvidenceInput = {
  cashAttested?: boolean;
  evidenceStorageId?: Id<'_storage'>;
  evidenceFileName?: string;
  evidenceMimeType?: string;
  evidenceFileSize?: number;
  evidenceNote?: string;
};

function validatePaymentEvidence(
  amount: number,
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other',
  evidence: PaymentEvidenceInput,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (paymentMethod === 'cash') {
    if (!evidence.cashAttested) {
      return 'Confirm cash was received and counted before recording payment';
    }
    return null;
  }
  if (!evidence.evidenceStorageId) {
    return 'Attach a receipt or transfer confirmation before recording payment';
  }
  return null;
}

async function recordReservationPayment(
  ctx: MutationCtx,
  args: {
    propertyId: Id<'properties'>;
    reservationId: Id<'reservations'>;
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
    createdBy: Id<'users'>;
  } & PaymentEvidenceInput,
): Promise<{ paymentId: Id<'payments'> } | { error: string } | null> {
  if (!Number.isFinite(args.amount) || args.amount <= 0) return null;

  const evidenceError = validatePaymentEvidence(args.amount, args.paymentMethod, args);
  if (evidenceError) return { error: evidenceError };

  const now = Date.now();
  const paymentId = await ctx.db.insert('payments', {
    propertyId: args.propertyId,
    paymentType: 'reservation',
    referenceType: 'Reservation',
    referenceId: args.reservationId,
    amount: args.amount,
    paymentMethod: args.paymentMethod,
    status: 'completed',
    paidAt: now,
    createdBy: args.createdBy,
    createdAt: now,
  });

  if (args.paymentMethod === 'cash') {
    await ctx.db.insert('reservationPaymentDocuments', {
      reservationId: args.reservationId,
      paymentId,
      kind: 'cash_attestation',
      note: args.evidenceNote?.trim() || 'Cash received and counted at front desk',
      uploadedBy: args.createdBy,
      createdAt: now,
    });
  } else if (args.evidenceStorageId) {
    await ctx.db.insert('reservationPaymentDocuments', {
      reservationId: args.reservationId,
      paymentId,
      kind: 'receipt',
      storageId: args.evidenceStorageId,
      fileName: args.evidenceFileName || 'receipt',
      mimeType: args.evidenceMimeType,
      fileSize: args.evidenceFileSize,
      note: args.evidenceNote,
      uploadedBy: args.createdBy,
      createdAt: now,
    });
  }

  return { paymentId };
}

export const generateReservationPaymentUploadUrl = mutation({
  args: { reservationId: v.id('reservations') },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    const auth = await requirePermission(ctx, 'reservations.update', reservation.propertyId);
    const duty = await guardFrontOffice(ctx, reservation.propertyId, auth.user._id);
    if (duty.ok === false) {
      throw new Error(duty.message);
    }
    return await ctx.storage.generateUploadUrl();
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
    source: v.optional(v.union(v.literal("direct"), v.literal("ota"), v.literal("walk-in"), v.literal("phone"), v.literal("other"))),
    specialRequests: v.optional(v.string()),
    durationHours: v.optional(v.number()),
    mayExtend: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existingReservation = await ctx.db.get(args.reservationId);

    if (!existingReservation) {
      return { success: false, message: 'Reservation does not exist' };
    }

    const auth = await requirePermission(ctx, 'reservations.update', existingReservation.propertyId);
    const duty = await guardFrontOffice(ctx, existingReservation.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };

    try {
      if (existingReservation.status === 'checked-out' || existingReservation.status === 'cancelled') {
        return { success: false, message: 'Checked-out or cancelled reservations cannot be edited' };
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
        existingReservation.roomId === args.roomId && existingReservation.status === 'checked-in';
      if (
        (room.status === 'out-of-order' || room.status === 'maintenance') &&
        !stayingInSameRoom
      ) {
        return { success: false, message: 'Room is not available for booking' };
      }

      const roomType = await ctx.db.get(room.roomTypeId);
      if (roomType && args.numberOfGuests > roomType.maxOccupancy) {
        return { success: false, message: `Guest count exceeds max occupancy (${roomType.maxOccupancy})` };
      }

      const stayKind = stayKindOf(existingReservation);
      let checkOutDate = args.checkOutDate;
      let rate = args.rate;
      let totalAmount = args.totalAmount;
      let durationHours = existingReservation.durationHours;
      if (stayKind === 'short') {
        const hours = args.durationHours ?? existingReservation.durationHours;
        const priced = await pricedShortStay(ctx, room.roomTypeId, hours, args.checkInDate);
        if ('error' in priced) return { success: false, message: priced.error };
        checkOutDate = priced.checkOutDate;
        rate = priced.amount;
        totalAmount = priced.amount;
        durationHours = priced.hours;
      } else if (checkOutDate <= args.checkInDate) {
        return { success: false, message: 'Check-out date must be after check-in date' };
      }

      if (isBlockingStatus(existingReservation.status)) {
        const conflict = await bookingConflict(ctx, {
          roomId: args.roomId,
          stayKind,
          checkInDate: args.checkInDate,
          checkOutDate,
          excludeId: args.reservationId,
        });
        if (conflict) return { success: false, message: conflict };
      }

      const now = Date.now();
      await ctx.db.patch(args.reservationId, {
        roomId: args.roomId,
        checkInDate: args.checkInDate,
        checkOutDate,
        numberOfGuests: args.numberOfGuests,
        rate,
        totalAmount,
        depositAmount: args.depositAmount,
        source: args.source,
        specialRequests: args.specialRequests,
        stayKind,
        ...(stayKind === 'short' && durationHours ? { durationHours } : {}),
        ...(stayKind === 'overnight' ? { mayExtend: Boolean(args.mayExtend) } : { mayExtend: undefined }),
        updatedAt: now,
      });

      await syncRoomOccupancy(ctx, args.roomId);
      if (args.roomId !== existingReservation.roomId) {
        await syncRoomOccupancy(ctx, existingReservation.roomId);
      }

      return { success: true, message: 'Reservation updated successfully' };
    } catch (error) {
      console.log(`Failed to update reservation: ${error}`);
      return { success: false, message: 'Failed to update reservation' };
    }
  },
});

export const confirmReservation = mutation({
  args: { reservationId: v.id('reservations') },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      return { success: false, message: 'Reservation does not exist' };
    }
    const auth = await requirePermission(ctx, 'reservations.update', reservation.propertyId);
    const duty = await guardFrontOffice(ctx, reservation.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };
    if (reservation.status !== 'pending') {
      return { success: false, message: 'Only pending reservations can be confirmed' };
    }
    const conflict = await bookingConflict(ctx, {
      roomId: reservation.roomId,
      stayKind: stayKindOf(reservation),
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      excludeId: reservation._id,
    });
    if (conflict) return { success: false, message: conflict };
    await ctx.db.patch(args.reservationId, { status: 'confirmed', updatedAt: Date.now() });
    return { success: true, message: 'Reservation confirmed' };
  },
});

export const checkInReservation = mutation({
  args: {
    reservationId: v.id('reservations'),
    amountCollected: v.optional(v.number()),
    paymentMethod: v.optional(paymentMethodValidator),
    ...paymentEvidenceArgs,
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      return { success: false, message: 'Reservation does not exist' };
    }
    const auth = await requirePermission(ctx, 'reservations.update', reservation.propertyId);
    const duty = await guardFrontOffice(ctx, reservation.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };
    if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
      return { success: false, message: 'Only pending or confirmed reservations can be checked in' };
    }

    const room = await ctx.db.get(reservation.roomId);
    if (!room) {
      return { success: false, message: 'Room does not exist' };
    }
    if (!room.isActive) {
      return { success: false, message: 'Room is inactive' };
    }
    if (room.status === 'out-of-order' || room.status === 'maintenance') {
      return { success: false, message: 'Room is not available for check-in' };
    }

    const conflict = await bookingConflict(ctx, {
      roomId: reservation.roomId,
      stayKind: stayKindOf(reservation),
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      excludeId: reservation._id,
      checkingIn: true,
    });
    if (conflict) return { success: false, message: conflict };

    const now = Date.now();
    const amount = args.amountCollected ?? 0;
    const paymentMethod = args.paymentMethod ?? 'cash';
    const posted = await recordReservationPayment(ctx, {
      propertyId: reservation.propertyId,
      reservationId: reservation._id,
      amount,
      paymentMethod,
      createdBy: auth.user._id,
      cashAttested: args.cashAttested,
      evidenceStorageId: args.evidenceStorageId,
      evidenceFileName: args.evidenceFileName,
      evidenceMimeType: args.evidenceMimeType,
      evidenceFileSize: args.evidenceFileSize,
      evidenceNote: args.evidenceNote,
    });
    if (posted && 'error' in posted) {
      return { success: false, message: posted.error };
    }
    const nextDeposit = (reservation.depositAmount ?? 0) + (amount > 0 ? amount : 0);

    await ctx.db.patch(args.reservationId, {
      status: 'checked-in',
      checkedInAt: now,
      checkedInByUserId: auth.user._id,
      ...(duty.stamp
        ? {
            ...(duty.stamp.employeeId
              ? { checkedInByEmployeeId: duty.stamp.employeeId }
              : {}),
            checkedInShiftId: duty.stamp.shiftId,
          }
        : {}),
      depositAmount: nextDeposit,
      updatedAt: now,
    });
    await syncRoomOccupancy(ctx, reservation.roomId);
    const updated = await ctx.db.get(args.reservationId);
    if (updated) {
      await maybeCreateStayoverOnCheckIn(ctx, updated, auth.user._id);
    }
    return { success: true, message: 'Guest checked in' };
  },
});

export const checkOutReservation = mutation({
  args: {
    reservationId: v.id('reservations'),
    amountCollected: v.optional(v.number()),
    paymentMethod: v.optional(paymentMethodValidator),
    ...paymentEvidenceArgs,
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      return { success: false, message: 'Reservation does not exist' };
    }
    const auth = await requirePermission(ctx, 'reservations.update', reservation.propertyId);
    const duty = await guardFrontOffice(ctx, reservation.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };
    if (reservation.status !== 'checked-in') {
      return { success: false, message: 'Only checked-in reservations can be checked out' };
    }

    const now = Date.now();
    const amount = args.amountCollected ?? 0;
    const paymentMethod = args.paymentMethod ?? 'cash';
    const posted = await recordReservationPayment(ctx, {
      propertyId: reservation.propertyId,
      reservationId: reservation._id,
      amount,
      paymentMethod,
      createdBy: auth.user._id,
      cashAttested: args.cashAttested,
      evidenceStorageId: args.evidenceStorageId,
      evidenceFileName: args.evidenceFileName,
      evidenceMimeType: args.evidenceMimeType,
      evidenceFileSize: args.evidenceFileSize,
      evidenceNote: args.evidenceNote,
    });
    if (posted && 'error' in posted) {
      return { success: false, message: posted.error };
    }

    await ctx.db.patch(args.reservationId, {
      status: 'checked-out',
      checkedOutAt: now,
      checkedOutByUserId: auth.user._id,
      ...(duty.stamp
        ? {
            ...(duty.stamp.employeeId
              ? { checkedOutByEmployeeId: duty.stamp.employeeId }
              : {}),
            checkedOutShiftId: duty.stamp.shiftId,
          }
        : {}),
      updatedAt: now,
    });
    await syncRoomOccupancy(ctx, reservation.roomId);
    const updated = await ctx.db.get(args.reservationId);
    if (updated) {
      await maybeCreateCheckoutOnCheckOut(ctx, updated, auth.user._id);
    }
    return { success: true, message: 'Guest checked out' };
  },
});

export const cancelReservation = mutation({
  args: { reservationId: v.id('reservations') },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      return { success: false, message: 'Reservation does not exist' };
    }
    const auth = await requirePermission(ctx, 'reservations.update', reservation.propertyId);
    const duty = await guardFrontOffice(ctx, reservation.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };
    if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
      return { success: false, message: 'Only pending or confirmed reservations can be cancelled' };
    }
    await ctx.db.patch(args.reservationId, { status: 'cancelled', updatedAt: Date.now() });
    await syncRoomOccupancy(ctx, reservation.roomId);
    return { success: true, message: 'Reservation cancelled' };
  },
});

export const deleteReservation = mutation({
  args: { reservationId: v.id('reservations') },
  handler: async (ctx, args) => {
    const existingReservation = await ctx.db.get(args.reservationId);

    if (!existingReservation) {
      return { success: false, message: 'Reservation does not exist' };
    }

    const auth = await requirePermission(ctx, 'reservations.delete', existingReservation.propertyId);
    const duty = await guardFrontOffice(ctx, existingReservation.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };

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

const retainerFollowUpValidator = v.union(
  v.literal('not-contacted'),
  v.literal('contacted'),
  v.literal('extending'),
  v.literal('departing'),
);

export const extendOvernightStay = mutation({
  args: {
    reservationId: v.id('reservations'),
    extraNights: v.union(v.literal(1), v.literal(2)),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) return { success: false, message: 'Reservation does not exist' };
    const auth = await requirePermission(ctx, 'reservations.update', reservation.propertyId);
    const duty = await guardFrontOffice(ctx, reservation.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };
    if (reservation.status !== 'checked-in' || isShortStay(reservation)) {
      return { success: false, message: 'Only a checked-in overnight guest can extend' };
    }

    const nights = Math.max(1, Math.round((reservation.checkOutDate - reservation.checkInDate) / DAY_MS));
    const nightly = reservation.rate > 0 ? reservation.rate : reservation.totalAmount / nights;
    const checkOutDate = reservation.checkOutDate + args.extraNights * DAY_MS;
    const conflict = await bookingConflict(ctx, {
      roomId: reservation.roomId,
      stayKind: 'overnight',
      checkInDate: reservation.checkInDate,
      checkOutDate,
      excludeId: reservation._id,
    });
    if (conflict) return { success: false, message: conflict };

    const now = Date.now();
    await ctx.db.patch(args.reservationId, {
      checkOutDate,
      totalAmount: nightly * (nights + args.extraNights),
      retainerFollowUp: 'extending',
      retainerFollowedUpAt: now,
      retainerFollowedUpByUserId: auth.user._id,
      ...(duty.stamp.employeeId ? { retainerFollowedUpByEmployeeId: duty.stamp.employeeId } : {}),
      updatedAt: now,
    });
    return {
      success: true,
      message: `Stay extended by ${args.extraNights} night${args.extraNights === 1 ? '' : 's'}`,
    };
  },
});

export const recordRetainerFollowUp = mutation({
  args: {
    reservationId: v.id('reservations'),
    followUp: retainerFollowUpValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) return { success: false, message: 'Reservation does not exist' };
    const auth = await requirePermission(ctx, 'reservations.update', reservation.propertyId);
    const duty = await guardFrontOffice(ctx, reservation.propertyId, auth.user._id);
    if (duty.ok === false) return { success: false, message: duty.message };
    if (reservation.status !== 'checked-in' || isShortStay(reservation)) {
      return { success: false, message: 'Follow-up is for a checked-in overnight guest' };
    }
    const note = args.note?.trim();
    const now = Date.now();
    await ctx.db.patch(args.reservationId, {
      retainerFollowUp: args.followUp,
      retainerFollowedUpAt: now,
      retainerFollowedUpByUserId: auth.user._id,
      ...(duty.stamp.employeeId ? { retainerFollowedUpByEmployeeId: duty.stamp.employeeId } : {}),
      ...(note ? { retainerNote: note } : {}),
      updatedAt: now,
    });
    return { success: true, message: 'Follow-up saved' };
  },
});

export const getDeskReminders = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    const allowed = await tryRequirePermission(ctx, 'reservations.read', args.propertyId);
    if (!allowed) {
      return { success: false, data: null, message: 'Unauthorized' };
    }
    const property = await ctx.db.get(args.propertyId);
    const timeZone = propertyTimeZone(property);
    const now = Date.now();
    const today = localDayBounds(now, timeZone);
    const reminderDays = reminderDaysOf(property);
    const windowEnd = addDateKey(today.dateKey, reminderDays);
    const extendEnd = addDateKey(today.dateKey, MAY_EXTEND_LEAD_DAYS);
    const horizon = now + HOUR_MS;

    const checkedIn = await ctx.db
      .query('reservations')
      .withIndex('by_propertyId_status', (q) =>
        q.eq('propertyId', args.propertyId).eq('status', 'checked-in'),
      )
      .collect();

    const shortStays = [];
    const retainers = [];

    for (const reservation of checkedIn) {
      const guest = await ctx.db.get(reservation.guestId);
      const room = await ctx.db.get(reservation.roomId);
      const guestName = guest ? `${guest.firstName} ${guest.lastName}`.trim() : 'Guest';
      const roomNumber = room?.roomNumber ?? '—';
      const followedUpBy = await resolveDeskActor(
        ctx,
        reservation.retainerFollowedUpByUserId,
        reservation.retainerFollowedUpByEmployeeId,
      );

      if (isShortStay(reservation)) {
        if (reservation.checkOutDate <= horizon) {
          shortStays.push({
            _id: reservation._id,
            confirmationNumber: reservation.confirmationNumber,
            guestName,
            roomNumber,
            checkInDate: reservation.checkInDate,
            checkOutDate: reservation.checkOutDate,
            durationHours: reservation.durationHours ?? null,
            overdue: reservation.checkOutDate < now,
          });
        }
        continue;
      }

      const checkoutKey = utcDateKey(reservation.checkOutDate);
      const inWindow = checkoutKey <= windowEnd;
      const early = Boolean(reservation.mayExtend) && checkoutKey <= extendEnd;
      if (!inWindow && !early) continue;

      const payments = await ctx.db
        .query('payments')
        .withIndex('by_reference', (q) =>
          q.eq('referenceType', 'Reservation').eq('referenceId', reservation._id),
        )
        .collect();
      const paidTotal = payments.reduce((sum, row) => sum + row.amount, 0);
      const bookedNights = Math.max(1, Math.round((reservation.checkOutDate - reservation.checkInDate) / DAY_MS));
      const elapsed = Math.max(0, Math.round((today.start - reservation.checkInDate) / DAY_MS));

      retainers.push({
        _id: reservation._id,
        confirmationNumber: reservation.confirmationNumber,
        guestName,
        roomNumber,
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        bookedNights,
        nightsSoFar: Math.min(bookedNights, elapsed),
        totalAmount: reservation.totalAmount,
        balance: reservation.totalAmount - paidTotal,
        mayExtend: Boolean(reservation.mayExtend),
        overdue: checkoutKey < today.dateKey,
        followUp: reservation.retainerFollowUp ?? 'not-contacted',
        followedUpAt: reservation.retainerFollowedUpAt ?? null,
        followedUpBy: followedUpBy?.name ?? null,
        note: reservation.retainerNote ?? null,
      });
    }

    shortStays.sort((a, b) => a.checkOutDate - b.checkOutDate);
    retainers.sort((a, b) => a.checkOutDate - b.checkOutDate);

    return {
      success: true,
      data: {
        timeZone,
        reminderDays,
        shortStays,
        retainers,
      },
    };
  },
});
