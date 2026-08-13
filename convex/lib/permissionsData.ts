export type PermissionLevel = "FULL" | "LIMITED" | "VIEW" | "NONE";

export type Module =
  | "users"
  | "roles"
  | "properties"
  | "staff"
  | "reservations"
  | "rooms"
  | "fnb"
  | "inventory"
  | "finance"
  | "financial"
  | "reports"
  | "system"
  | "maintenance"
  | "security"
  | "expenses";

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "approve"
  | "export"
  | "admin"
  | "settings"
  | "audit";

export type UserPermissions = Partial<Record<Module, PermissionLevel>>;

export const levelToActions: Record<PermissionLevel, Action[]> = {
  FULL: ["create", "read", "update", "delete", "approve", "export", "admin", "settings", "audit"],
  LIMITED: ["create", "read", "update"],
  VIEW: ["read"],
  NONE: [],
};

export const ROLE_PERMISSION_MATRIX: Record<string, UserPermissions> = {
  Administrator: {
    users: "FULL",
    properties: "FULL",
    staff: "FULL",
    reservations: "FULL",
    fnb: "FULL",
    inventory: "FULL",
    finance: "FULL",
    reports: "FULL",
    system: "FULL",
    maintenance: "FULL",
    security: "FULL",
  },
  Director: {
    users: "NONE",
    properties: "FULL",
    staff: "FULL",
    reservations: "FULL",
    fnb: "FULL",
    inventory: "FULL",
    finance: "FULL",
    reports: "FULL",
    system: "LIMITED",
    maintenance: "VIEW",
    security: "VIEW",
  },
  "General Manager": {
    users: "NONE",
    properties: "LIMITED",
    staff: "FULL",
    reservations: "FULL",
    fnb: "FULL",
    inventory: "FULL",
    finance: "FULL",
    reports: "FULL",
    system: "NONE",
    maintenance: "LIMITED",
    security: "VIEW",
  },
  "Operations Manager": {
    users: "NONE",
    properties: "LIMITED",
    staff: "LIMITED",
    reservations: "FULL",
    fnb: "FULL",
    inventory: "FULL",
    finance: "LIMITED",
    reports: "FULL",
    system: "NONE",
    maintenance: "FULL",
    security: "VIEW",
  },
  "Finance Manager": {
    users: "NONE",
    properties: "NONE",
    staff: "LIMITED",
    reservations: "VIEW",
    fnb: "VIEW",
    inventory: "VIEW",
    finance: "FULL",
    reports: "FULL",
    system: "NONE",
    maintenance: "NONE",
    security: "VIEW",
  },
  Manager: {
    users: "NONE",
    properties: "LIMITED",
    staff: "FULL",
    reservations: "FULL",
    fnb: "FULL",
    inventory: "FULL",
    finance: "LIMITED",
    reports: "FULL",
    system: "NONE",
    maintenance: "LIMITED",
    security: "NONE",
  },
  Bartender: {
    users: "NONE",
    properties: "NONE",
    staff: "NONE",
    reservations: "NONE",
    fnb: "FULL",
    inventory: "LIMITED",
    finance: "NONE",
    reports: "NONE",
    system: "NONE",
    maintenance: "NONE",
    security: "NONE",
  },
};

export const GRANULAR_PERMISSIONS: Record<string, Record<string, string>> = {
  reservations: {
    "reservations.view": "reservations.read",
    "reservations.create": "reservations.create",
    "reservations.update": "reservations.update",
    "reservations.checkin": "reservations.update",
    "reservations.checkout": "reservations.update",
    "reservations.cancel": "reservations.delete",
  },
  fnb: {
    "fnb.order.create": "fnb.create",
    "fnb.order.manage": "fnb.update",
    "fnb.menu.update": "fnb.update",
  },
};
