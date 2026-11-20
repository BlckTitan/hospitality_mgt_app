import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  listFrontOfficeOperators,
  NOBODY_ON_ROTATION,
  resolveDeskOperator,
} from "./lib/deskOperator";
import { isAdministratorAtProperty, tryRequirePermission } from "./lib/rbac";

const receptionistValidator = v.object({
  userId: v.id("users"),
  staffId: v.id("staffs"),
  shiftId: v.optional(v.id("shifts")),
  name: v.string(),
});

export const listOnDutyReceptionists = query({
  args: { propertyId: v.id("properties") },
  returns: v.object({
    success: v.literal(true),
    mode: v.union(v.literal("self"), v.literal("admin")),
    mustChoose: v.boolean(),
    message: v.union(v.string(), v.null()),
    receptionists: v.array(receptionistValidator),
  }),
  handler: async (ctx, args) => {
    const auth = await tryRequirePermission(ctx, "reservations.read", args.propertyId);
    if (!auth) {
      return {
        success: true as const,
        mode: "self" as const,
        mustChoose: false,
        message: null,
        receptionists: [],
      };
    }
    if (!isAdministratorAtProperty(auth, args.propertyId)) {
      const duty = await resolveDeskOperator(ctx, { auth, propertyId: args.propertyId });
      if (duty.ok === false) {
        return {
          success: true as const,
          mode: "self" as const,
          mustChoose: false,
          message: duty.message,
          receptionists: [],
        };
      }
      return {
        success: true as const,
        mode: "self" as const,
        mustChoose: false,
        message: `On duty: ${duty.operator.name} · Front office`,
        receptionists: [duty.operator],
      };
    }

    const receptionists = await listFrontOfficeOperators(ctx, args.propertyId);
    return {
      success: true as const,
      mode: "admin" as const,
      mustChoose: receptionists.length > 1,
      message: receptionists.length === 0 ? NOBODY_ON_ROTATION : null,
      receptionists,
    };
  },
});
