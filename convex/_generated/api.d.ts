/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assets from "../assets.js";
import type * as attendance from "../attendance.js";
import type * as authContext from "../authContext.js";
import type * as bars from "../bars.js";
import type * as beverages from "../beverages.js";
import type * as billing from "../billing.js";
import type * as cron from "../cron.js";
import type * as crons from "../crons.js";
import type * as expenses from "../expenses.js";
import type * as functions_paginated from "../functions/paginated.js";
import type * as guests from "../guests.js";
import type * as hours from "../hours.js";
import type * as housekeepingTasks from "../housekeepingTasks.js";
import type * as http from "../http.js";
import type * as inventoryItems from "../inventoryItems.js";
import type * as inventoryTasks from "../inventoryTasks.js";
import type * as inventoryTransactions from "../inventoryTransactions.js";
import type * as lib_billingPeriods from "../lib/billingPeriods.js";
import type * as lib_payrollHelpers from "../lib/payrollHelpers.js";
import type * as lib_payrollPacks from "../lib/payrollPacks.js";
import type * as lib_pendingInvites from "../lib/pendingInvites.js";
import type * as lib_permissionsData from "../lib/permissionsData.js";
import type * as lib_postCashOutflow from "../lib/postCashOutflow.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as lib_searchNames from "../lib/searchNames.js";
import type * as lib_shiftHelpers from "../lib/shiftHelpers.js";
import type * as lib_staffAccess from "../lib/staffAccess.js";
import type * as lib_systemRoles from "../lib/systemRoles.js";
import type * as lib_taskAssignment from "../lib/taskAssignment.js";
import type * as lib_userIdentity from "../lib/userIdentity.js";
import type * as lib_userRoleAssignment from "../lib/userRoleAssignment.js";
import type * as maintenanceOrders from "../maintenanceOrders.js";
import type * as payrollConfig from "../payrollConfig.js";
import type * as payrolls from "../payrolls.js";
import type * as property from "../property.js";
import type * as purchaseOrderLines from "../purchaseOrderLines.js";
import type * as purchaseOrders from "../purchaseOrders.js";
import type * as ratePlans from "../ratePlans.js";
import type * as reorderAlerts from "../reorderAlerts.js";
import type * as reservations from "../reservations.js";
import type * as roles from "../roles.js";
import type * as roomTypes from "../roomTypes.js";
import type * as rooms from "../rooms.js";
import type * as roster from "../roster.js";
import type * as salesSummaries from "../salesSummaries.js";
import type * as searchBackfill from "../searchBackfill.js";
import type * as shiftTemplates from "../shiftTemplates.js";
import type * as shifts from "../shifts.js";
import type * as staff from "../staff.js";
import type * as staffMigrations from "../staffMigrations.js";
import type * as storeInventories from "../storeInventories.js";
import type * as storeTransactions from "../storeTransactions.js";
import type * as suppliers from "../suppliers.js";
import type * as taskBoards from "../taskBoards.js";
import type * as taskConfig from "../taskConfig.js";
import type * as timeOff from "../timeOff.js";
import type * as userRoles from "../userRoles.js";
import type * as userStockLogs from "../userStockLogs.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assets: typeof assets;
  attendance: typeof attendance;
  authContext: typeof authContext;
  bars: typeof bars;
  beverages: typeof beverages;
  billing: typeof billing;
  cron: typeof cron;
  crons: typeof crons;
  expenses: typeof expenses;
  "functions/paginated": typeof functions_paginated;
  guests: typeof guests;
  hours: typeof hours;
  housekeepingTasks: typeof housekeepingTasks;
  http: typeof http;
  inventoryItems: typeof inventoryItems;
  inventoryTasks: typeof inventoryTasks;
  inventoryTransactions: typeof inventoryTransactions;
  "lib/billingPeriods": typeof lib_billingPeriods;
  "lib/payrollHelpers": typeof lib_payrollHelpers;
  "lib/payrollPacks": typeof lib_payrollPacks;
  "lib/pendingInvites": typeof lib_pendingInvites;
  "lib/permissionsData": typeof lib_permissionsData;
  "lib/postCashOutflow": typeof lib_postCashOutflow;
  "lib/rbac": typeof lib_rbac;
  "lib/searchNames": typeof lib_searchNames;
  "lib/shiftHelpers": typeof lib_shiftHelpers;
  "lib/staffAccess": typeof lib_staffAccess;
  "lib/systemRoles": typeof lib_systemRoles;
  "lib/taskAssignment": typeof lib_taskAssignment;
  "lib/userIdentity": typeof lib_userIdentity;
  "lib/userRoleAssignment": typeof lib_userRoleAssignment;
  maintenanceOrders: typeof maintenanceOrders;
  payrollConfig: typeof payrollConfig;
  payrolls: typeof payrolls;
  property: typeof property;
  purchaseOrderLines: typeof purchaseOrderLines;
  purchaseOrders: typeof purchaseOrders;
  ratePlans: typeof ratePlans;
  reorderAlerts: typeof reorderAlerts;
  reservations: typeof reservations;
  roles: typeof roles;
  roomTypes: typeof roomTypes;
  rooms: typeof rooms;
  roster: typeof roster;
  salesSummaries: typeof salesSummaries;
  searchBackfill: typeof searchBackfill;
  shiftTemplates: typeof shiftTemplates;
  shifts: typeof shifts;
  staff: typeof staff;
  staffMigrations: typeof staffMigrations;
  storeInventories: typeof storeInventories;
  storeTransactions: typeof storeTransactions;
  suppliers: typeof suppliers;
  taskBoards: typeof taskBoards;
  taskConfig: typeof taskConfig;
  timeOff: typeof timeOff;
  userRoles: typeof userRoles;
  userStockLogs: typeof userStockLogs;
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
