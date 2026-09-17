import { query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { Id } from "./_generated/dataModel";

export const listExpenses = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "expenses.read", args.propertyId);
    const rows = await ctx.db
      .query("expenses")
      .withIndex("by_propertyId_expenseDate", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    rows.sort((a, b) => b.expenseDate - a.expenseDate);
    const data = await Promise.all(
      rows.map(async (row) => {
        let sourceLabel: string | undefined;
        if (row.sourceType === "PropertyBill" && row.sourceId) {
          const period = await ctx.db.get(row.sourceId as Id<"billPeriods">);
          if (period) {
            const account = await ctx.db.get(period.accountId);
            sourceLabel = account?.name;
          }
        }
        return { ...row, sourceLabel };
      }),
    );
    return { success: true, data };
  },
});
