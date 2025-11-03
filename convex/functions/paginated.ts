// convex/staffs.ts

import { query } from "../_generated/server";
import { v } from "convex/values";

export const getPaginatedData = query({
  args: {
    table: v.union(
      v.literal('staffs'),
      v.literal('users'),
    ), //collection name
    limit: v.number(), //items per page
    cursor: v.optional(v.string()), //current page cursor
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))), // optional
  },
  handler: async ({ db }, { table, limit, cursor, sortOrder }) => {
    
    // const tableName = table as TableNames;
    // Use convex pagination pattern
    const items = await db
      .query(table) // your table name, specify generic type
      .order(sortOrder ?? "desc")   // respect sortOrder if provided, default to "desc"
      .paginate({ numItems: limit, cursor: cursor ?? null });

    return items;
  },
});
