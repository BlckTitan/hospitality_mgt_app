import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAllSuppliers = query({
  args: { 
    propertyId: v.id('properties'),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      let query = ctx.db
        .query('suppliers')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId));
      
      // Filter by active status if requested
      if (args.activeOnly === true) {
        query = query.filter((q) => q.eq(q.field('isActive'), true));
      }
      
      const suppliers = await query.collect();
      
      return { success: true, data: suppliers };
    } catch (error) {
      console.log(`Failed to fetch suppliers: ${error}`);
      return { success: false, data: [], message: 'Failed to fetch suppliers' };
    }
  },
});

export const getSupplier = query({
  args: { supplierId: v.id('suppliers') },
  handler: async (ctx, args) => {
    try {
      const supplier = await ctx.db.get(args.supplierId);
      if (!supplier) {
        return { success: false, data: null, message: 'Supplier not found' };
      }
      
      return { success: true, data: supplier };
    } catch (error) {
      console.log(`Failed to fetch supplier: ${error}`);
      return { success: false, data: null, message: 'Failed to fetch supplier' };
    }
  },
});

export const createSupplier = mutation({
  args: {
    propertyId: v.id('properties'),
    name: v.string(),
    contactPerson: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    taxId: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if supplier name already exists for this property
      const existingSupplier = await ctx.db
        .query('suppliers')
        .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
        .filter((q) => q.eq(q.field('name'), args.name))
        .first();

      if (existingSupplier) {
        return { success: false, message: 'Supplier name already exists for this property' };
      }

      // Check if email is provided and already exists for this property
      if (args.email) {
        const existingEmail = await ctx.db
          .query('suppliers')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', args.propertyId))
          .filter((q) => q.eq(q.field('email'), args.email))
          .first();

        if (existingEmail) {
          return { success: false, message: 'Supplier email already exists for this property' };
        }
      }

      const now = Date.now();
      const supplierId = await ctx.db.insert('suppliers', {
        propertyId: args.propertyId,
        name: args.name,
        contactPerson: args.contactPerson,
        email: args.email,
        phone: args.phone,
        address: args.address,
        paymentTerms: args.paymentTerms,
        taxId: args.taxId,
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, message: 'Supplier created successfully', id: supplierId };
    } catch (error) {
      console.log(`Failed to create supplier: ${error}`);
      return { success: false, message: 'Failed to create supplier' };
    }
  },
});

export const updateSupplier = mutation({
  args: {
    supplierId: v.id('suppliers'),
    name: v.string(),
    contactPerson: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    taxId: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const existingSupplier = await ctx.db.get(args.supplierId);

      if (!existingSupplier) {
        return { success: false, message: 'Supplier does not exist' };
      }

      // Check if name is being changed and if new name already exists
      if (args.name !== existingSupplier.name) {
        const duplicateSupplier = await ctx.db
          .query('suppliers')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', existingSupplier.propertyId))
          .filter((q) => q.eq(q.field('name'), args.name))
          .first();

        if (duplicateSupplier) {
          return { success: false, message: 'Supplier name already exists for this property' };
        }
      }

      // Check if email is being changed and if new email already exists
      if (args.email && args.email !== existingSupplier.email) {
        const duplicateEmail = await ctx.db
          .query('suppliers')
          .withIndex('by_propertyId', (q) => q.eq('propertyId', existingSupplier.propertyId))
          .filter((q) => q.eq(q.field('email'), args.email))
          .first();

        if (duplicateEmail) {
          return { success: false, message: 'Supplier email already exists for this property' };
        }
      }

      const now = Date.now();
      await ctx.db.patch(args.supplierId, {
        name: args.name,
        contactPerson: args.contactPerson,
        email: args.email,
        phone: args.phone,
        address: args.address,
        paymentTerms: args.paymentTerms,
        taxId: args.taxId,
        isActive: args.isActive,
        updatedAt: now,
      });

      return { success: true, message: 'Supplier updated successfully' };
    } catch (error) {
      console.log(`Failed to update supplier: ${error}`);
      return { success: false, message: 'Failed to update supplier' };
    }
  },
});

export const deleteSupplier = mutation({
  args: { supplierId: v.id('suppliers') },
  handler: async (ctx, args) => {
    try {
      const existingSupplier = await ctx.db.get(args.supplierId);

      if (!existingSupplier) {
        return { success: false, message: 'Supplier does not exist' };
      }

      // Check if supplier is used in inventory items
      const hasInventoryItems = await ctx.db
        .query('inventoryItems')
        .withIndex('by_supplierId', (q) => q.eq('supplierId', args.supplierId))
        .first();

      if (hasInventoryItems) {
        return { success: false, message: 'Cannot delete supplier - is associated with inventory items' };
      }

      // Check if supplier is used in purchase orders
      const hasPurchaseOrders = await ctx.db
        .query('purchaseOrders')
        .withIndex('by_supplierId', (q) => q.eq('supplierId', args.supplierId))
        .first();

      if (hasPurchaseOrders) {
        return { success: false, message: 'Cannot delete supplier - has associated purchase orders' };
      }

      await ctx.db.delete(args.supplierId);
      return { success: true, message: 'Supplier deleted successfully' };
    } catch (error) {
      console.log(`Failed to delete supplier: ${error}`);
      return { success: false, message: 'Failed to delete supplier' };
    }
  },
});
