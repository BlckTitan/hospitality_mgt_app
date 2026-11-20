import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requirePermission } from './lib/rbac';
import { peopleSearchName } from './lib/searchNames';

const spouseValidator = v.object({
  firstName: v.string(),
  lastName: v.string(),
  phone: v.optional(v.string()),
  occupation: v.optional(v.string()),
});

const NAME_PATTERN = /^[A-Za-z\s'-]+$/;
const PHONE_PATTERN = /^\+?\d{10,15}$/;

function storedText(value: string | null | undefined, label: string, max: number): { value?: string; error?: string } {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return {};
  if (trimmed.length > max) return { error: `${label} is too long` };
  return { value: trimmed };
}

function storedSpouse(
  spouse: {
    firstName: string;
    lastName: string;
    phone?: string;
    occupation?: string;
  } | null | undefined,
): { value?: { firstName: string; lastName: string; phone?: string; occupation?: string }; error?: string } {
  if (!spouse) return {};
  const firstName = spouse.firstName.trim();
  const lastName = spouse.lastName.trim();
  if (firstName.length < 2 || lastName.length < 2) {
    return { error: 'Spouse first and last name are required' };
  }
  if (!NAME_PATTERN.test(firstName) || !NAME_PATTERN.test(lastName)) {
    return { error: 'Spouse name can use only letters, spaces, hyphens, and apostrophes' };
  }
  const phone = spouse.phone?.trim() ?? '';
  if (phone && !PHONE_PATTERN.test(phone)) {
    return { error: 'Enter a valid spouse phone number' };
  }
  const occupation = storedText(spouse.occupation, 'Spouse occupation', 80);
  if (occupation.error) return { error: occupation.error };
  return {
    value: {
      firstName,
      lastName,
      ...(phone ? { phone } : {}),
      ...(occupation.value ? { occupation: occupation.value } : {}),
    },
  };
}

export const getAllGuests = query({
  args: { propertyId: v.id('properties') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reservations.read', args.propertyId);
    try {
      const guests = await ctx.db
        .query('guests')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      
      return { success: true, data: guests };
    } catch (error) {
      console.log(`Failed to fetch guests: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch guests' };
    }
  },
});

/** Typeahead for reservation find-or-create: name search + phone/email match. */
export const searchGuests = query({
  args: {
    propertyId: v.id('properties'),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reservations.read', args.propertyId);
    const term = args.searchTerm.trim();
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 25);
    if (term.length < 1) {
      return { success: true, data: [] };
    }

    try {
      const byName = await ctx.db
        .query('guests')
        .withSearchIndex('search_guests', (idx) =>
          idx.search('searchName', term).eq('propertyId', args.propertyId),
        )
        .take(limit);

      const digits = term.replace(/\D/g, '');
      const looksLikeEmail = term.includes('@');
      const needsContactMatch = looksLikeEmail || digits.length >= 4;

      if (!needsContactMatch) {
        return { success: true, data: byName };
      }

      const propertyGuests = await ctx.db
        .query('guests')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .collect();
      const lower = term.toLowerCase();
      const byContact = propertyGuests.filter((guest) => {
        if (looksLikeEmail && guest.email?.toLowerCase().includes(lower)) return true;
        if (digits.length >= 4 && guest.phone?.replace(/\D/g, '').includes(digits)) return true;
        return false;
      });

      const seen = new Set(byName.map((g) => g._id));
      const merged = [...byName];
      for (const guest of byContact) {
        if (seen.has(guest._id)) continue;
        merged.push(guest);
        seen.add(guest._id);
        if (merged.length >= limit) break;
      }
      return { success: true, data: merged.slice(0, limit) };
    } catch (error) {
      console.log(`Failed to search guests: ${error}`);
      return { success: false, data: [], message: 'Failed to search guests' };
    }
  },
});

export const getGuest = query({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) {
      return { success: false, data: null, message: 'Guest not found' };
    }
    await requirePermission(ctx, 'reservations.read', guest.propertyId);
    try {
      return { success: true, data: guest };
    } catch (error) {
      console.log(`Failed to fetch guest: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch guest' };
    }
  },
});

export const createGuest = mutation({
  args: {
    propertyId: v.id('properties'),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    occupation: v.optional(v.string()),
    stateOfOrigin: v.optional(v.string()),
    spouse: v.optional(spouseValidator),
    dateOfBirth: v.optional(v.number()),
    loyaltyNumber: v.optional(v.string()),
    preferences: v.optional(v.any()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'reservations.create', args.propertyId);
    const occupation = storedText(args.occupation, 'Occupation', 80);
    if (occupation.error) return { success: false, message: occupation.error };
    const stateOfOrigin = storedText(args.stateOfOrigin, 'State of origin', 40);
    if (stateOfOrigin.error) return { success: false, message: stateOfOrigin.error };
    const spouse = storedSpouse(args.spouse);
    if (spouse.error) return { success: false, message: spouse.error };
    try {
      const now = Date.now();
      const trimmedImage = args.imageUrl?.trim();
      const guestId = await ctx.db.insert('guests', {
        propertyId: args.propertyId,
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        address: args.address,
        ...(occupation.value ? { occupation: occupation.value } : {}),
        ...(stateOfOrigin.value ? { stateOfOrigin: stateOfOrigin.value } : {}),
        ...(spouse.value ? { spouse: spouse.value } : {}),
        dateOfBirth: args.dateOfBirth,
        loyaltyNumber: args.loyaltyNumber,
        preferences: args.preferences,
        ...(trimmedImage ? { imageUrl: trimmedImage } : {}),
        searchName: peopleSearchName(args.firstName, args.lastName),
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Guest created successfully', id: guestId };
    } catch (error) {
      console.log(`Failed to create guest: ${error}`);
      return { success: false, message: 'Failed to create guest' };
    }
  },
});

export const updateGuest = mutation({
  args: {
    guestId: v.id('guests'),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    occupation: v.optional(v.union(v.string(), v.null())),
    stateOfOrigin: v.optional(v.union(v.string(), v.null())),
    spouse: v.optional(v.union(spouseValidator, v.null())),
    dateOfBirth: v.optional(v.number()),
    loyaltyNumber: v.optional(v.string()),
    preferences: v.optional(v.any()),
    imageUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const existingGuest = await ctx.db.get(args.guestId);
    if (!existingGuest) {
      return { success: false, message: 'Guest not found' };
    }
    await requirePermission(ctx, 'reservations.update', existingGuest.propertyId);
    const occupation = storedText(args.occupation, 'Occupation', 80);
    if (occupation.error) return { success: false, message: occupation.error };
    const stateOfOrigin = storedText(args.stateOfOrigin, 'State of origin', 40);
    if (stateOfOrigin.error) return { success: false, message: stateOfOrigin.error };
    const spouse = storedSpouse(args.spouse);
    if (spouse.error) return { success: false, message: spouse.error };

    try {
      const now = Date.now();
      const imagePatch =
        args.imageUrl === null || args.imageUrl === ''
          ? { imageUrl: undefined }
          : args.imageUrl !== undefined
            ? { imageUrl: args.imageUrl.trim() }
            : {};
      await ctx.db.patch(args.guestId, {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        address: args.address,
        ...(args.occupation !== undefined ? { occupation: occupation.value } : {}),
        ...(args.stateOfOrigin !== undefined ? { stateOfOrigin: stateOfOrigin.value } : {}),
        ...(args.spouse !== undefined ? { spouse: args.spouse === null ? undefined : spouse.value } : {}),
        dateOfBirth: args.dateOfBirth,
        loyaltyNumber: args.loyaltyNumber,
        preferences: args.preferences,
        ...imagePatch,
        searchName: peopleSearchName(args.firstName, args.lastName),
        updatedAt: now,
      });

      return { success: true, message: 'Guest updated successfully' };
    } catch (error) {
      console.log(`Failed to update guest: ${error}`);
      return { success: false, message: 'Failed to update guest' };
    }
  },
});

export const deleteGuest = mutation({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    const existingGuest = await ctx.db.get(args.guestId);
    if (!existingGuest) {
      return { success: false, message: 'Guest not found' };
    }
    await requirePermission(ctx, 'reservations.delete', existingGuest.propertyId);

    try {
      // Check if guest has any reservations
      const reservations = await ctx.db
        .query('reservations')
        .withIndex('by_guestId', (q) => q.eq('guestId', args.guestId))
        .collect();

      if (reservations.length > 0) {
        return { success: false, message: 'Cannot delete guest with existing reservations' };
      }

      await ctx.db.delete(args.guestId);
      return { success: true, message: 'Guest deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete guest: ${error}`);
      return { success: false, message: 'Failed to delete guest' };
    }
  },
});
