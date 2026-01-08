/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as functions_paginated from "../functions/paginated.js";
import type * as guests from "../guests.js";
import type * as http from "../http.js";
import type * as property from "../property.js";
import type * as reservations from "../reservations.js";
import type * as roles from "../roles.js";
import type * as roomTypes from "../roomTypes.js";
import type * as rooms from "../rooms.js";
import type * as staff from "../staff.js";
import type * as user from "../user.js";
import type * as userRoles from "../userRoles.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "functions/paginated": typeof functions_paginated;
  guests: typeof guests;
  http: typeof http;
  property: typeof property;
  reservations: typeof reservations;
  roles: typeof roles;
  roomTypes: typeof roomTypes;
  rooms: typeof rooms;
  staff: typeof staff;
  user: typeof user;
  userRoles: typeof userRoles;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
