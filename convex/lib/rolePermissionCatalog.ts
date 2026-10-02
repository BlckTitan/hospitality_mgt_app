import {
  Action,
  BILLING_FULL_KEYS,
  BILLING_VIEW_KEYS,
  COMPENSATION_KEYS,
  GRANULAR_PERMISSIONS,
  HOUSEKEEPING_TASK_KEYS,
  INVENTORY_TASK_KEYS,
  MAINTENANCE_ORDER_KEYS,
  MODULE_ACTION_KEYS,
  Module,
  PermissionLevel,
  ROLE_PERMISSION_MATRIX,
  TASK_FULL_KEYS,
  levelToActions,
} from "./permissionsData";

export type SystemRoleDefinition = {
  name: string;
  description: string;
};

/** Roles from ai/RBAC.md — names must match ROLE_PERMISSION_MATRIX keys. */
export const SYSTEM_ROLE_DEFINITIONS: SystemRoleDefinition[] = [
  { name: "Administrator", description: "Full system access for property owners and IT administrators" },
  { name: "Director", description: "Executive oversight across property operations and finance" },
  { name: "General Manager", description: "Overall property management with full operational access" },
  { name: "Operations Manager", description: "Day-to-day operations across rooms, F&B, inventory, and maintenance" },
  { name: "Finance Manager", description: "Financial management, billing, expenses, and payroll" },
  { name: "HR Manager", description: "Staff, payroll, and limited user administration" },
  { name: "IT Manager", description: "Users, roles, system settings, and cross-module support access" },
  { name: "Manager", description: "Department manager with broad operational access" },
  { name: "Assistant Manager", description: "Supports managers on reservations, F&B, and team oversight" },
  { name: "Supervisor", description: "Floor supervisor for F&B, tasks, hours, and direct reports" },
  { name: "Receptionist", description: "Front desk reservations, guests, and limited F&B / finance" },
  { name: "Concierge", description: "Guest services with limited reservation access" },
  { name: "Housekeeping", description: "Housekeeping tasks and limited room / reservation visibility" },
  { name: "Waiter", description: "F&B service orders" },
  { name: "Bartender", description: "Bar operations, POS, and limited store inventory" },
  { name: "Cook / Chef", description: "Kitchen operations and limited inventory" },
  { name: "Kitchen Assistant", description: "Kitchen support with limited F&B and inventory access" },
  { name: "Maintenance Staff", description: "Maintenance work orders and facilities" },
  { name: "Security Officer", description: "Security and access logs" },
];

const COMPENSATION_ROLES = new Set([
  "Administrator",
  "Director",
  "General Manager",
  "HR Manager",
  "Finance Manager",
]);

const BILLING_FULL_ROLES = new Set([
  "Administrator",
  "Director",
  "General Manager",
  "Finance Manager",
]);

const BILLING_VIEW_ROLES = new Set([
  "Operations Manager",
  "Manager",
]);

const TASK_FULL_ROLES = new Set([
  "Administrator",
  "Director",
  "General Manager",
  "Operations Manager",
]);

function grant(keys: readonly string[], permissions: Record<string, boolean>) {
  for (const key of keys) {
    permissions[key] = true;
  }
}

function revoke(keys: readonly string[], permissions: Record<string, boolean>) {
  for (const key of keys) {
    delete permissions[key];
  }
}

function expandModuleLevel(
  module: Module,
  level: PermissionLevel,
  permissions: Record<string, boolean>,
) {
  const allowed = new Set(levelToActions[level]);
  for (const action of MODULE_ACTION_KEYS[module]) {
    if (allowed.has(action)) {
      permissions[`${module}.${action}`] = true;
    }
  }
}

function expandPayrollGranular(
  level: PermissionLevel,
  permissions: Record<string, boolean>,
) {
  const allowed = new Set(levelToActions[level]);
  for (const [granular, mapped] of Object.entries(GRANULAR_PERMISSIONS.payroll)) {
    const action = mapped.split(".")[1] as Action;
    if (allowed.has(action)) {
      permissions[granular] = true;
    }
  }
}

function expandTaskKeysFromModules(
  roleName: string,
  matrix: Record<string, PermissionLevel | undefined>,
  permissions: Record<string, boolean>,
) {
  if (TASK_FULL_ROLES.has(roleName)) {
    grant(TASK_FULL_KEYS, permissions);
    return;
  }

  const reservations = matrix.reservations ?? "NONE";
  const maintenance = matrix.maintenance ?? "NONE";
  const inventory = matrix.inventory ?? "NONE";
  const fnb = matrix.fnb ?? "NONE";

  // Housekeeping Staff: read + update (complete only as lead — enforced in mutations)
  if (roleName === "Housekeeping") {
    grant(["housekeeping.task.read", "housekeeping.task.update"], permissions);
  } else if (roleName === "Receptionist") {
    grant(["housekeeping.task.read"], permissions);
  } else if (roleName === "Supervisor") {
    // Assign + complete across F&B / housekeeping / inventory task modules
    grant(
      [
        "housekeeping.task.read",
        "housekeeping.task.assign",
        "housekeeping.task.update",
        "housekeeping.task.complete",
        "inventory.task.read",
        "inventory.task.assign",
        "inventory.task.update",
        "inventory.task.complete",
        "maintenance.order.read",
        "maintenance.order.assign",
        "maintenance.order.update",
        "maintenance.order.complete",
      ],
      permissions,
    );
  } else if (roleName === "Maintenance Staff") {
    grant(["maintenance.order.read", "maintenance.order.update"], permissions);
  } else if (
    roleName === "Bartender" ||
    roleName === "Cook / Chef" ||
    roleName === "Kitchen Assistant"
  ) {
    grant(["inventory.task.read", "inventory.task.update"], permissions);
  } else {
    // Derive from module levels for remaining management roles
    if (reservations !== "NONE") {
      const actions = new Set(levelToActions[reservations]);
      if (actions.has("read")) permissions["housekeeping.task.read"] = true;
      if (actions.has("update")) {
        permissions["housekeeping.task.assign"] = true;
        permissions["housekeeping.task.update"] = true;
        permissions["housekeeping.task.complete"] = true;
      }
    }
    if (maintenance !== "NONE") {
      const actions = new Set(levelToActions[maintenance]);
      if (actions.has("read")) permissions["maintenance.order.read"] = true;
      if (actions.has("update") || actions.has("create")) {
        permissions["maintenance.order.assign"] = true;
        permissions["maintenance.order.update"] = true;
        permissions["maintenance.order.complete"] = true;
      }
    }
    if (inventory !== "NONE" || fnb === "FULL" || fnb === "LIMITED") {
      const invLevel = inventory !== "NONE" ? inventory : "VIEW";
      const actions = new Set(levelToActions[invLevel]);
      if (actions.has("read") || fnb !== "NONE") {
        permissions["inventory.task.read"] = true;
      }
      if (actions.has("update")) {
        permissions["inventory.task.assign"] = true;
        permissions["inventory.task.update"] = true;
        permissions["inventory.task.complete"] = true;
      }
    }
  }

  // Strip assign/complete from pure operational staff who only get read+update
  if (roleName === "Housekeeping") {
    revoke(["housekeeping.task.assign", "housekeeping.task.complete"], permissions);
  }
  if (roleName === "Maintenance Staff") {
    revoke(
      ["maintenance.order.assign", "maintenance.order.complete", ...HOUSEKEEPING_TASK_KEYS, ...INVENTORY_TASK_KEYS],
      permissions,
    );
    grant(["maintenance.order.read", "maintenance.order.update"], permissions);
  }
  if (
    roleName === "Bartender" ||
    roleName === "Cook / Chef" ||
    roleName === "Kitchen Assistant"
  ) {
    revoke(
      [
        "inventory.task.assign",
        "inventory.task.complete",
        ...HOUSEKEEPING_TASK_KEYS,
        ...MAINTENANCE_ORDER_KEYS,
      ],
      permissions,
    );
    grant(["inventory.task.read", "inventory.task.update"], permissions);
  }
}

/**
 * Build the boolean permission map stored on a Role document.
 * Coarse matrix first, then RBAC.md granular overrides (billing, compensation, tasks).
 */
export function buildRolePermissions(roleName: string): Record<string, boolean> {
  const matrix = ROLE_PERMISSION_MATRIX[roleName];
  const permissions: Record<string, boolean> = {
    "staff.self.read": true,
  };

  if (!matrix) {
    return permissions;
  }

  for (const [module, level] of Object.entries(matrix) as [Module, PermissionLevel][]) {
    if (!level || level === "NONE") continue;
    expandModuleLevel(module, level, permissions);

    // Mirror finance ↔ financial for legacy key usage
    if (module === "finance" && !matrix.financial) {
      expandModuleLevel("financial", level, permissions);
    }
    if (module === "financial" && !matrix.finance) {
      expandModuleLevel("finance", level, permissions);
    }

    if (module === "payroll") {
      expandPayrollGranular(level, permissions);
    }

    if (module === "inventory" && (level === "FULL" || level === "LIMITED")) {
      if (level === "FULL" || levelToActions[level].includes("update")) {
        permissions["inventory.po.pay"] = level === "FULL";
      }
    }
  }

  // Explicit billing (not derived from finance LIMITED)
  if (BILLING_FULL_ROLES.has(roleName)) {
    grant(BILLING_FULL_KEYS, permissions);
  } else if (BILLING_VIEW_ROLES.has(roleName)) {
    grant(BILLING_VIEW_KEYS, permissions);
  }

  if (COMPENSATION_ROLES.has(roleName)) {
    grant(COMPENSATION_KEYS, permissions);
  }

  expandTaskKeysFromModules(roleName, matrix as Record<string, PermissionLevel | undefined>, permissions);

  // IT Manager: users/roles full already from matrix; ensure system keys
  if (roleName === "IT Manager") {
    grant(["system.admin", "system.settings", "system.audit"], permissions);
  }

  // Director system LIMITED → settings but not full admin/audit wipe
  if (roleName === "Director") {
    permissions["system.settings"] = true;
    delete permissions["system.admin"];
    delete permissions["system.audit"];
  }

  return permissions;
}

export const ADMINISTRATOR_PERMISSIONS = buildRolePermissions("Administrator");
