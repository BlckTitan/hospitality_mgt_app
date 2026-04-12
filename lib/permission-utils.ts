import {
  Module,
  Action,
  PermissionLevel,
  UserPermissions,
  UserPermissionSet,
  ROLE_PERMISSION_MATRIX,
  levelToActions,
  GRANULAR_PERMISSIONS
} from './permissions';

export interface UserContext {
  userId: string;
  roles: string[];
  propertyId?: string;
  customPermissions?: UserPermissionSet;
}

function isPermissionLevel(value: unknown): value is PermissionLevel {
  return value === 'FULL' || value === 'LIMITED' || value === 'VIEW' || value === 'NONE';
}

function isModule(value: string): value is Module {
  return [
    'users', 'roles', 'properties', 'staff', 'reservations', 'rooms', 'fnb',
    'inventory', 'financial', 'reports', 'system', 'maintenance', 'security', 'expenses'
  ].includes(value);
}

function isAction(value: string): value is Action {
  return [
    'create', 'read', 'update', 'delete', 'approve', 'export', 'admin', 'settings', 'audit'
  ].includes(value);
}

function parseGranularPermission(granularPerm: string): { module: Module; action: Action } | null {
  const [modulePart, actionPart] = granularPerm.split('.');
  if (!modulePart || !actionPart) return null;
  if (isModule(modulePart) && isAction(actionPart)) {
    return { module: modulePart, action: actionPart };
  }
  return null;
}

export class PermissionChecker {
  private userContext: UserContext;

  constructor(userContext: UserContext) {
    this.userContext = userContext;
  }

  private hasCustomPermission(module: Module, action: Action): boolean {
    const customPermissions = this.userContext.customPermissions;
    if (!customPermissions) return false;

    const modulePermission = (customPermissions as UserPermissions)[module];
    if (isPermissionLevel(modulePermission) && levelToActions[modulePermission].includes(action)) {
      return true;
    }

    return Boolean((customPermissions as Record<string, boolean>)[`${module}.${action}`]);
  }

  /**
   * Check if user has permission for a specific action on a module
   */
  hasPermission(module: Module, action: Action): boolean {
    if (this.hasCustomPermission(module, action)) {
      return true;
    }

    // Check role-based permissions
    for (const role of this.userContext.roles) {
      const rolePermissions = ROLE_PERMISSION_MATRIX[role];
      if (!rolePermissions) continue;

      const permissionLevel = rolePermissions[module];
      if (permissionLevel && levelToActions[permissionLevel].includes(action)) {
        return true;
      }

      if ((rolePermissions as Record<string, boolean>)[`${module}.${action}`]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has any permission for a module
   */
  hasAnyPermission(module: Module): boolean {
    return this.hasPermission(module, 'read') ||
           this.hasPermission(module, 'create') ||
           this.hasPermission(module, 'update') ||
           this.hasPermission(module, 'delete');
  }

  /**
   * Check if user has full access to a module
   */
  hasFullAccess(module: Module): boolean {
    if ((this.userContext.customPermissions as UserPermissions)?.[module] === 'FULL') {
      return true;
    }

    for (const role of this.userContext.roles) {
      const rolePermissions = ROLE_PERMISSION_MATRIX[role];
      if (rolePermissions?.[module] === 'FULL') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check granular permission (e.g., reservations.checkin)
   */
  hasGranularPermission(granularPerm: string): boolean {
    const customPermissions = this.userContext.customPermissions;
    if (customPermissions && (customPermissions as Record<string, boolean>)[granularPerm]) {
      return true;
    }

    const parsed = parseGranularPermission(granularPerm);
    if (parsed && this.hasPermission(parsed.module, parsed.action)) {
      return true;
    }

    for (const permissions of Object.values(GRANULAR_PERMISSIONS)) {
      const mapped = permissions[granularPerm as keyof typeof permissions];
      if (mapped) {
        const nested = parseGranularPermission(mapped);
        if (nested && this.hasPermission(nested.module, nested.action)) {
          return true;
        }
      }
    }

    return false;
  }

  private getGranularPermissionLevel(module: Module): PermissionLevel {
    const customPermissions = this.userContext.customPermissions;
    if (!customPermissions) return 'NONE';

    const grantedActions = new Set<Action>();
    for (const [key, value] of Object.entries(customPermissions)) {
      if (value !== true) continue;
      const parsed = parseGranularPermission(key);
      if (parsed?.module === module) {
        grantedActions.add(parsed.action);
      }
    }

    if (grantedActions.has('create') && grantedActions.has('read') && grantedActions.has('update') && grantedActions.has('delete')) {
      return 'FULL';
    }
    if (grantedActions.has('create') && grantedActions.has('read') && grantedActions.has('update')) {
      return 'LIMITED';
    }
    if (grantedActions.has('read')) {
      return 'VIEW';
    }

    return 'NONE';
  }

  /**
   * Get user's permission level for a module
   */
  getPermissionLevel(module: Module): PermissionLevel {
    const customPermissions = this.userContext.customPermissions;
    if (customPermissions) {
      const modulePermission = (customPermissions as UserPermissions)[module];
      if (isPermissionLevel(modulePermission)) {
        return modulePermission;
      }

      const granularLevel = this.getGranularPermissionLevel(module);
      if (granularLevel !== 'NONE') {
        return granularLevel;
      }
    }

    let highestLevel: PermissionLevel = 'NONE';
    const levelHierarchy: PermissionLevel[] = ['NONE', 'VIEW', 'LIMITED', 'FULL'];

    for (const role of this.userContext.roles) {
      const rolePermissions = ROLE_PERMISSION_MATRIX[role];
      if (!rolePermissions) continue;
      const roleLevel = rolePermissions[module];
      if (roleLevel && levelHierarchy.indexOf(roleLevel) > levelHierarchy.indexOf(highestLevel)) {
        highestLevel = roleLevel;
      }
    }

    return highestLevel;
  }

  /**
   * Get all modules user has access to
   */
  getAccessibleModules(): Module[] {
    const modules: Module[] = [
      'users', 'roles', 'properties', 'staff', 'reservations', 'rooms',
      'fnb', 'inventory', 'financial', 'reports', 'system', 'maintenance',
      'security', 'expenses'
    ];

    return modules.filter(module => this.hasAnyPermission(module));
  }

  /**
   * Check property-scoped access
   */
  hasPropertyAccess(propertyId: string): boolean {
    if (!this.userContext.propertyId) {
      return true;
    }

    return this.userContext.propertyId === propertyId;
  }
}

/**
 * Create a permission checker instance
 */
export function createPermissionChecker(userContext: UserContext): PermissionChecker {
  return new PermissionChecker(userContext);
}

/**
 * Higher-order function for permission checking
 */
export function requirePermission(module: Module, action: Action) {
  return (userContext: UserContext): boolean => {
    const checker = new PermissionChecker(userContext);
    return checker.hasPermission(module, action);
  };
}

/**
 * Higher-order function for granular permission checking
 */
export function requireGranularPermission(granularPerm: string) {
  return (userContext: UserContext): boolean => {
    const checker = new PermissionChecker(userContext);
    return checker.hasGranularPermission(granularPerm);
  };
}

/**
 * Check multiple permissions (AND logic)
 */
export function requireAllPermissions(permissions: Array<{ module: Module; action: Action }>) {
  return (userContext: UserContext): boolean => {
    const checker = new PermissionChecker(userContext);
    return permissions.every(({ module, action }) => checker.hasPermission(module, action));
  };
}

/**
 * Check multiple permissions (OR logic)
 */
export function requireAnyPermission(permissions: Array<{ module: Module; action: Action }>) {
  return (userContext: UserContext): boolean => {
    const checker = new PermissionChecker(userContext);
    return permissions.some(({ module, action }) => checker.hasPermission(module, action));
  };
}
