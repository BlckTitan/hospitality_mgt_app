import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { AuthContext } from "./rbac";
import { canViewTeamRecords, rolesForProperty } from "./staffScope";

/** Floor staff see open tables and tables they are serving. Managers see every table. */
export async function tablesForViewer(
  ctx: QueryCtx,
  auth: AuthContext,
  propertyId: Id<"properties">,
  tables: Doc<"restaurantTables">[],
) {
  if (canViewTeamRecords(rolesForProperty(auth, propertyId))) return tables;
  const visible: Doc<"restaurantTables">[] = [];
  for (const table of tables) {
    if (table.status !== "occupied" || !table.currentOrderId) {
      visible.push(table);
      continue;
    }
    const order = await ctx.db.get(table.currentOrderId);
    if (!order || order.serverUserId === auth.user._id) visible.push(table);
  }
  return visible;
}
