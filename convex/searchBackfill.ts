import { mutation, query } from "./_generated/server";
import { requireAuthenticated } from "./lib/rbac";
import { loginSearchName, peopleSearchName } from "./lib/searchNames";

export const needsSearchNameBackfill = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticated(ctx);
    const staff = await ctx.db.query("staffs").take(50);
    if (staff.some((row) => !row.searchName)) return true;
    const guests = await ctx.db.query("guests").take(50);
    if (guests.some((row) => !row.searchName)) return true;
    const users = await ctx.db.query("users").take(50);
    return users.some((row) => !row.searchName);
  },
});

export const backfillSearchNames = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticated(ctx);
    let staffPatched = 0;
    const staffs = await ctx.db.query("staffs").collect();
    for (const staff of staffs) {
      const searchName = peopleSearchName(staff.firstName, staff.lastName);
      if (staff.searchName !== searchName) {
        await ctx.db.patch(staff._id, { searchName });
        staffPatched += 1;
      }
    }

    let guestPatched = 0;
    const guests = await ctx.db.query("guests").collect();
    for (const guest of guests) {
      const searchName = peopleSearchName(guest.firstName, guest.lastName);
      if (guest.searchName !== searchName) {
        await ctx.db.patch(guest._id, { searchName });
        guestPatched += 1;
      }
    }

    let userPatched = 0;
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      const searchName = loginSearchName(user.name, user.email);
      if (user.searchName !== searchName) {
        await ctx.db.patch(user._id, { searchName });
        userPatched += 1;
      }
    }

    return { staffPatched, guestPatched, userPatched };
  },
});
