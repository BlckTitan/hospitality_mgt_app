// Permission types and constants based on RBAC model

export type PermissionLevel = 'FULL' | 'LIMITED' | 'VIEW' | 'NONE';

export type Module =
  | 'users'
  | 'roles'
  | 'properties'
  | 'staff'
  | 'reservations'
  | 'rooms'
  | 'fnb'
  | 'inventory'
  | 'finance'
  | 'financial'
  | 'reports'
  | 'system'
  | 'maintenance'
  | 'security'
  | 'expenses'
  | 'payroll';

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export'
  | 'admin'
  | 'settings'
  | 'audit';

export interface RolePermissions {
  [key: string]: PermissionLevel;
}

export type UserPermissions = Partial<Record<Module, PermissionLevel>>;
export type UserPermissionSet = UserPermissions | Record<string, boolean>;

// Granular permissions
export interface GranularPermission {
  module: Module;
  action: Action;
  resource?: string; // For specific resources like 'reservations.checkin'
}

// Permission mapping from level to actions
export const levelToActions: Record<PermissionLevel, Action[]> = {
  'FULL': ['create', 'read', 'update', 'delete', 'approve', 'export', 'admin', 'settings', 'audit'],
  'LIMITED': ['create', 'read', 'update'], // No delete, approve, export, or system-level actions for limited
  'VIEW': ['read'],
  'NONE': []
};

// Role-based permission matrix
export const ROLE_PERMISSION_MATRIX: Record<string, UserPermissions> = {
  'Administrator': {
    users: 'FULL',
    properties: 'FULL',
    staff: 'FULL',
    reservations: 'FULL',
    fnb: 'FULL',
    inventory: 'FULL',
    finance: 'FULL',
    reports: 'FULL',
    system: 'FULL',
    maintenance: 'FULL',
    security: 'FULL',
    payroll: 'FULL'
  },
  'Director': {
    users: 'NONE',
    properties: 'FULL',
    staff: 'FULL',
    reservations: 'FULL',
    fnb: 'FULL',
    inventory: 'FULL',
    finance: 'FULL',
    reports: 'FULL',
    system: 'LIMITED',
    maintenance: 'VIEW',
    security: 'VIEW',
    payroll: 'FULL'
  },
  'General Manager': {
    users: 'NONE',
    properties: 'LIMITED',
    staff: 'FULL',
    reservations: 'FULL',
    fnb: 'FULL',
    inventory: 'FULL',
    finance: 'FULL',
    reports: 'FULL',
    system: 'NONE',
    maintenance: 'LIMITED',
    security: 'VIEW',
    payroll: 'FULL'
  },
  'Operations Manager': {
    users: 'NONE',
    properties: 'LIMITED',
    staff: 'LIMITED',
    reservations: 'FULL',
    fnb: 'FULL',
    inventory: 'FULL',
    finance: 'LIMITED',
    reports: 'FULL',
    system: 'NONE',
    maintenance: 'FULL',
    security: 'VIEW',
    payroll: 'LIMITED'
  },
  'Finance Manager': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'LIMITED',
    reservations: 'VIEW',
    fnb: 'VIEW',
    inventory: 'VIEW',
    finance: 'FULL',
    reports: 'FULL',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'VIEW',
    payroll: 'FULL'
  },
  'HR Manager': {
    users: 'LIMITED',
    properties: 'NONE',
    staff: 'FULL',
    reservations: 'NONE',
    fnb: 'NONE',
    inventory: 'NONE',
    finance: 'LIMITED',
    reports: 'LIMITED',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'FULL'
  },
  'IT Manager': {
    users: 'FULL',
    properties: 'LIMITED',
    staff: 'LIMITED',
    reservations: 'LIMITED',
    fnb: 'LIMITED',
    inventory: 'LIMITED',
    finance: 'LIMITED',
    reports: 'FULL',
    system: 'FULL',
    maintenance: 'FULL',
    security: 'FULL',
    payroll: 'LIMITED'
  },
  'Manager': {
    users: 'NONE',
    properties: 'LIMITED',
    staff: 'FULL',
    reservations: 'FULL',
    fnb: 'FULL',
    inventory: 'FULL',
    finance: 'LIMITED',
    reports: 'FULL',
    system: 'NONE',
    maintenance: 'LIMITED',
    security: 'NONE',
    payroll: 'LIMITED'
  },
  'Assistant Manager': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'LIMITED',
    reservations: 'FULL',
    fnb: 'FULL',
    inventory: 'LIMITED',
    finance: 'NONE',
    reports: 'LIMITED',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'LIMITED'
  },
  'Supervisor': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'LIMITED',
    reservations: 'LIMITED',
    fnb: 'FULL',
    inventory: 'LIMITED',
    finance: 'NONE',
    reports: 'LIMITED',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'LIMITED'
  },
  'Receptionist': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'FULL',
    fnb: 'LIMITED',
    inventory: 'NONE',
    finance: 'LIMITED',
    reports: 'LIMITED',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'NONE'
  },
  'Concierge': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'LIMITED',
    fnb: 'NONE',
    inventory: 'NONE',
    finance: 'NONE',
    reports: 'VIEW',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'NONE'
  },
  'Housekeeping': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'LIMITED',
    fnb: 'NONE',
    inventory: 'NONE',
    finance: 'NONE',
    reports: 'NONE',
    system: 'NONE',
    maintenance: 'LIMITED',
    security: 'NONE',
    payroll: 'NONE'
  },
  'Waiter': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'NONE',
    fnb: 'LIMITED',
    inventory: 'NONE',
    finance: 'NONE',
    reports: 'NONE',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'NONE'
  },
  'Bartender': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'NONE',
    fnb: 'FULL',
    inventory: 'LIMITED',
    finance: 'NONE',
    reports: 'NONE',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'NONE'
  },
  'Cook / Chef': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'NONE',
    fnb: 'FULL',
    inventory: 'LIMITED',
    finance: 'NONE',
    reports: 'NONE',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'NONE'
  },
  'Kitchen Assistant': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'NONE',
    fnb: 'LIMITED',
    inventory: 'LIMITED',
    finance: 'NONE',
    reports: 'NONE',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'NONE',
    payroll: 'NONE'
  },
  'Maintenance Staff': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'NONE',
    fnb: 'NONE',
    inventory: 'NONE',
    finance: 'NONE',
    reports: 'NONE',
    system: 'NONE',
    maintenance: 'FULL',
    security: 'NONE',
    payroll: 'NONE'
  },
  'Security Officer': {
    users: 'NONE',
    properties: 'NONE',
    staff: 'NONE',
    reservations: 'NONE',
    fnb: 'NONE',
    inventory: 'NONE',
    finance: 'NONE',
    reports: 'NONE',
    system: 'NONE',
    maintenance: 'NONE',
    security: 'FULL',
    payroll: 'NONE'
  }
};

// Granular permission mappings
export const GRANULAR_PERMISSIONS = {
  reservations: {
    'reservations.view': 'reservations.read',
    'reservations.create': 'reservations.create',
    'reservations.update': 'reservations.update',
    'reservations.checkin': 'reservations.update',
    'reservations.checkout': 'reservations.update',
    'reservations.cancel': 'reservations.delete'
  },
  finance: {
    'finance.view': 'finance.read',
    'finance.charge': 'finance.create',
    'finance.refund': 'finance.update',
    'finance.reports': 'finance.read'
  },
  financial: {
    'financial.view': 'financial.read',
    'financial.charge': 'financial.create',
    'financial.refund': 'financial.update',
    'financial.reports': 'financial.read'
  },
  fnb: {
    'fnb.order.create': 'fnb.create',
    'fnb.order.manage': 'fnb.update',
    'fnb.menu.update': 'fnb.update'
  },
  // Hours/Time off approve map to update so Supervisor LIMITED can approve
  // those records without Approve payroll (payroll.approve).
  payroll: {
    'payroll.employee.read': 'payroll.read',
    'payroll.employee.create': 'payroll.create',
    'payroll.employee.update': 'payroll.update',
    'payroll.timesheet.read': 'payroll.read',
    'payroll.timesheet.create': 'payroll.create',
    'payroll.timesheet.update': 'payroll.update',
    'payroll.timesheet.approve': 'payroll.update',
    'payroll.leave.read': 'payroll.read',
    'payroll.leave.create': 'payroll.create',
    'payroll.leave.approve': 'payroll.update',
    'payroll.run.read': 'payroll.read',
    'payroll.run.create': 'payroll.create',
    'payroll.run.calculate': 'payroll.update',
    'payroll.run.approve': 'payroll.approve',
    'payroll.run.export': 'payroll.export',
    'payroll.run.mark_paid': 'payroll.approve',
    'payroll.payslip.read': 'payroll.read',
    'payroll.settings.update': 'payroll.settings'
  }
} as const;
