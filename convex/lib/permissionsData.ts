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
  | "expenses"
  | "payroll";

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
    payroll: "FULL",
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
    payroll: "FULL",
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
    payroll: "FULL",
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
    payroll: "LIMITED",
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
    payroll: "FULL",
  },
  "HR Manager": {
    users: "LIMITED",
    properties: "NONE",
    staff: "FULL",
    reservations: "NONE",
    fnb: "NONE",
    inventory: "NONE",
    finance: "LIMITED",
    reports: "LIMITED",
    system: "NONE",
    maintenance: "NONE",
    security: "NONE",
    payroll: "FULL",
  },
  Supervisor: {
    users: "NONE",
    properties: "NONE",
    staff: "LIMITED",
    reservations: "LIMITED",
    fnb: "FULL",
    inventory: "LIMITED",
    finance: "NONE",
    reports: "LIMITED",
    system: "NONE",
    maintenance: "LIMITED",
    security: "NONE",
    payroll: "LIMITED",
  },
  "Assistant Manager": {
    users: "NONE",
    properties: "NONE",
    staff: "LIMITED",
    reservations: "FULL",
    fnb: "FULL",
    inventory: "LIMITED",
    finance: "NONE",
    reports: "LIMITED",
    system: "NONE",
    maintenance: "NONE",
    security: "NONE",
    payroll: "LIMITED",
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
    payroll: "LIMITED",
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
    payroll: "NONE",
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
  payroll: {
    "payroll.employee.read": "payroll.read",
    "payroll.employee.create": "payroll.create",
    "payroll.employee.update": "payroll.update",
    "payroll.timesheet.read": "payroll.read",
    "payroll.timesheet.create": "payroll.create",
    "payroll.timesheet.update": "payroll.update",
    "payroll.timesheet.approve": "payroll.update",
    "payroll.leave.read": "payroll.read",
    "payroll.leave.create": "payroll.create",
    "payroll.leave.approve": "payroll.update",
    "payroll.run.read": "payroll.read",
    "payroll.run.create": "payroll.create",
    "payroll.run.calculate": "payroll.update",
    "payroll.run.approve": "payroll.approve",
    "payroll.run.export": "payroll.export",
    "payroll.run.mark_paid": "payroll.approve",
    "payroll.payslip.read": "payroll.read",
    "payroll.settings.update": "payroll.settings",
  },
  staff: {
    "staff.self.read": "staff.read",
  },
  housekeeping: {
    "housekeeping.task.read": "reservations.read",
    "housekeeping.task.assign": "reservations.update",
    "housekeeping.task.update": "reservations.update",
    "housekeeping.task.complete": "reservations.update",
  },
  rooms: {
    "rooms.read": "reservations.read",
  },
  maintenance: {
    "maintenance.order.read": "maintenance.read",
    "maintenance.order.assign": "maintenance.update",
    "maintenance.order.update": "maintenance.update",
    "maintenance.order.complete": "maintenance.update",
  },
  inventory: {
    "inventory.task.read": "inventory.read",
    "inventory.task.assign": "inventory.update",
    "inventory.task.update": "inventory.update",
    "inventory.task.complete": "inventory.update",
  },
};
