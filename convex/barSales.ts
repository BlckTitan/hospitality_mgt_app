import { query } from "./_generated/server";
import { v } from "convex/values";
import { explainNoBarOperator, listBarSellers } from "./lib/barSalesPerson";
import { propertyDateKey } from "./lib/barStock";
import { isAdministratorAtProperty, requirePermission } from "./lib/rbac";
import { isFloorServiceOnly, rolesForProperty } from "./lib/staffScope";

const ADMIN_ONLY = "Only an administrator can record a sale for the waiter on shift.";

export const listOnShiftSellers = query({
  args: {
    propertyId: v.id("properties"),
    barId: v.optional(v.id("bars")),
    logDate: v.optional(v.string()),
    includeEnded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePermission(ctx, "fnb.read", args.propertyId);
    const today = await propertyDateKey(ctx, args.propertyId);
    const logDate = args.logDate || today;
    const roles = rolesForProperty(auth, args.propertyId);
    const floor = isFloorServiceOnly(roles);
    const admin = isAdministratorAtProperty(auth, args.propertyId);

    const bars = args.barId
      ? [await ctx.db.get(args.barId)].filter(
          (bar) => Boolean(bar && bar.propertyId === args.propertyId && bar.isActive),
        )
      : (
          await ctx.db
            .query("bars")
            .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
            .collect()
        ).filter((bar) => bar.isActive);

    const sellers = [];
    for (const bar of bars) {
      if (!bar) continue;
      const people = await listBarSellers(ctx, {
        auth,
        propertyId: args.propertyId,
        barId: bar._id,
        logDate,
        today,
        includeEnded: args.includeEnded,
      });
      for (const person of people) {
        sellers.push({ ...person, barName: bar.name });
      }
    }
    sellers.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    if (!admin) {
      const mine = sellers.filter((seller) => seller.userId === auth.user._id);
      if (mine.length > 0) {
        return {
          success: true as const,
          mode: "self" as const,
          mustChoose: mine.length > 1,
          message: null,
          sellers: mine,
        };
      }
      if (sellers.length === 0 || floor) {
        return {
          success: true as const,
          mode: "self" as const,
          mustChoose: false,
          message: sellers.length === 0
            ? await explainNoBarOperator(ctx, auth, args.propertyId, args.barId)
            : "Start your shift at this bar before recording a sale.",
          sellers: [],
        };
      }
      return {
        success: true as const,
        mode: "blocked" as const,
        mustChoose: false,
        message: ADMIN_ONLY,
        sellers: [],
      };
    }
    return {
      success: true as const,
      mode: "admin" as const,
      mustChoose: sellers.length > 1,
      message: sellers.length === 0
        ? await explainNoBarOperator(ctx, auth, args.propertyId, args.barId)
        : null,
      sellers,
    };
  },
});
