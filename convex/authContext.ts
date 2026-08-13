import { query } from "./_generated/server";
import { getAuthContext } from "./lib/rbac";

export const getCurrentUserContext = query({
  args: {},
  handler: async (ctx) => {
    const authContext = await getAuthContext(ctx);
    if (!authContext) {
      return null;
    }

    return {
      userId: authContext.user.externalId,
      roles: authContext.roles,
      propertyId: authContext.propertyIds[0],
      propertyIds: authContext.propertyIds,
      customPermissions: authContext.permissions,
    };
  },
});
