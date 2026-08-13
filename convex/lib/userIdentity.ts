import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

function pickCanonicalUser(users: Doc<"users">[]): Doc<"users"> {
  return [...users].sort(
    (a, b) => a.createdAt - b.createdAt || a._id.localeCompare(b._id),
  )[0];
}

async function usersByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .collect();
}

export async function userByExternalId(ctx: QueryCtx, externalId: string) {
  const users = await usersByExternalId(ctx, externalId);
  if (users.length === 0) {
    return null;
  }
  return pickCanonicalUser(users);
}

async function dedupeUsers(
  ctx: MutationCtx,
  users: Doc<"users">[],
): Promise<Doc<"users">> {
  const canonical = pickCanonicalUser(users);
  for (const duplicate of users) {
    if (duplicate._id !== canonical._id) {
      await ctx.db.delete(duplicate._id);
    }
  }
  return canonical;
}

type NewUserFields = {
  externalId: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  phone?: string;
};

export async function createUserIfAbsent(
  ctx: MutationCtx,
  fields: NewUserFields,
): Promise<Doc<"users">> {
  const existingUsers = await usersByExternalId(ctx, fields.externalId);
  if (existingUsers.length > 0) {
    if (existingUsers.length === 1) {
      return existingUsers[0];
    }
    return await dedupeUsers(ctx, existingUsers);
  }

  const insertedUserId = await ctx.db.insert("users", fields);

  const matches = await usersByExternalId(ctx, fields.externalId);
  if (matches.length === 0) {
    const insertedUser = await ctx.db.get(insertedUserId);
    if (!insertedUser) {
      throw new Error("Failed to create user");
    }
    return insertedUser;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return await dedupeUsers(ctx, matches);
}

export async function ensureUserFromIdentity(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const timestamp = Date.now();
  return await createUserIfAbsent(ctx, {
    externalId: identity.subject,
    email: identity.email ?? "",
    name: identity.name ?? identity.nickname ?? identity.email ?? "User",
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
