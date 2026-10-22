import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { fulfillPendingInviteForUser } from "./pendingInvites";
import { loginSearchName } from "./searchNames";

const PLACEHOLDER_NAME = "User";

export function isUsableUserName(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed) && !trimmed!.includes("@") && trimmed !== PLACEHOLDER_NAME;
}

/** First candidate that is a real name. Emails and the old "User" placeholder never qualify. */
export function cleanUserName(...candidates: (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    if (isUsableUserName(candidate)) {
      return candidate.trim().replace(/\s+/g, " ");
    }
  }
  return "";
}

function identityName(identity: {
  name?: string;
  nickname?: string;
  givenName?: string;
  familyName?: string;
}): string {
  const fullName = [identity.givenName, identity.familyName].filter(Boolean).join(" ");
  return cleanUserName(identity.name, fullName, identity.nickname);
}

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

export async function patchLastLoginAtIfActive(
  ctx: MutationCtx,
  user: Doc<"users">,
  timestamp: number,
): Promise<boolean> {
  if (!user.isActive) {
    return false;
  }
  await ctx.db.patch(user._id, {
    lastLoginAt: timestamp,
    updatedAt: timestamp,
  });
  return true;
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
  lastLoginAt?: number;
  phone?: string;
};

export async function createUserIfAbsent(
  ctx: MutationCtx,
  fields: NewUserFields,
): Promise<Doc<"users">> {
  const existingUsers = await usersByExternalId(ctx, fields.externalId);
  if (existingUsers.length > 0) {
    const user =
      existingUsers.length === 1
        ? existingUsers[0]
        : await dedupeUsers(ctx, existingUsers);
    // Existing row may have been created before the webhook; still try to attach the invite.
    await fulfillPendingInviteForUser(ctx, {
      email: fields.email || user.email,
      userId: user._id,
    });
    const name = cleanUserName(fields.name, user.name);
    const searchName = loginSearchName(name, fields.email || user.email);
    if (user.searchName !== searchName || user.name !== name) {
      await ctx.db.patch(user._id, { name, searchName });
      const refreshed = await ctx.db.get(user._id);
      if (refreshed) {
        return refreshed;
      }
    }
    return user;
  }

  const name = cleanUserName(fields.name);
  const insertedUserId = await ctx.db.insert("users", {
    ...fields,
    name,
    searchName: loginSearchName(name, fields.email),
  });

  const matches = await usersByExternalId(ctx, fields.externalId);
  let user: Doc<"users">;
  if (matches.length === 0) {
    const insertedUser = await ctx.db.get(insertedUserId);
    if (!insertedUser) {
      throw new Error("Failed to create user");
    }
    user = insertedUser;
  } else if (matches.length === 1) {
    user = matches[0];
  } else {
    user = await dedupeUsers(ctx, matches);
  }

  await fulfillPendingInviteForUser(ctx, {
    email: fields.email || user.email,
    userId: user._id,
  });

  return user;
}

export async function ensureUserFromIdentity(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const timestamp = Date.now();
  const existingUser = await userByExternalId(ctx, identity.subject);
  
  if (existingUser) {
    const name = cleanUserName(identityName(identity), existingUser.name);
    const email = identity.email || existingUser.email;
    await ctx.db.patch(existingUser._id, {
      updatedAt: timestamp,
      email,
      name,
      searchName: loginSearchName(name, email),
    });
    const updatedUser = await ctx.db.get(existingUser._id);
    if (!updatedUser) {
      throw new Error("Failed to update user");
    }
    await fulfillPendingInviteForUser(ctx, {
      email: updatedUser.email,
      userId: updatedUser._id,
    });
    return updatedUser;
  }

  return await createUserIfAbsent(ctx, newUserFieldsFromIdentity(identity, timestamp));
}

export function newUserFieldsFromIdentity(
  identity: {
    subject: string;
    email?: string;
    name?: string;
    nickname?: string;
    givenName?: string;
    familyName?: string;
  },
  timestamp: number,
): NewUserFields {
  return {
    externalId: identity.subject,
    email: identity.email ?? "",
    name: identityName(identity),
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
