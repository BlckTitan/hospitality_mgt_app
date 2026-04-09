// Permission types and constants based on RBAC model

export type PermissionLevel = 'FULL' | 'LIMITED' | 'VIEW' | 'NONE';

export type Module = 
  | 'users'
  | 'properties'
  | 'staff'
  | 'reservations'
  | 'fnb'
  | 'inventory'
  | 'finance'
  | 'reports'
  | 'system'
  | 'maintenance'
  | 'security';

export type Action = 'create' | 'read' | 'update' | 'delete';

export interface RolePermissions {
  [key: string]: PermissionLevel;
}

export type UserPermissions = {
  [module in Module]: PermissionLevel;
};

// Granular permissions
export interface GranularPermission {
  module: Module;
  action: Action;
  resource?: string; // For specific resources like 'reservations.checkin'
}

// Permission mapping from level to actions
export const levelToActions: Record<PermissionLevel, Action[]> = {
  'FULL': ['create', 'read', 'update', 'delete'],
  'LIMITED': ['create', 'read', 'update'], // No delete for limited
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
    security: 'FULL'
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
    security: 'VIEW'
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
    security: 'VIEW'
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
    security: 'VIEW'
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
    security: 'VIEW'
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
    security: 'NONE'
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
    security: 'FULL'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'NONE'
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
    security: 'FULL'
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
  fnb: {
    'fnb.order.create': 'fnb.create',
    'fnb.order.manage': 'fnb.update',
    'fnb.menu.update': 'fnb.update'
  }
} as const;
