import { 
  Module, 
  Action, 
  PermissionLevel, 
  UserPermissions, 
  GranularPermission,
  ROLE_PERMISSION_MATRIX, 
  levelToActions,
  GRANULAR_PERMISSIONS 
} from './permissions';

export interface UserContext {
  userId: string;
  roles: string[];
  propertyId?: string;
  customPermissions?: UserPermissions;
}

export class PermissionChecker {
  private userContext: UserContext;

  constructor(userContext: UserContext) {
    this.userContext = userContext;
  }

  /**
   * Check if user has permission for a specific action on a module
   */
  hasPermission(module: Module, action: Action): boolean {
    // Check custom permissions first (if any)
    if (this.userContext.customPermissions) {
      const userLevel = this.userContext.customPermissions[module];
      if (userLevel && levelToActions[userLevel].includes(action)) {
        return true;
      }
    }

    // Check role-based permissions
    for (const role of this.userContext.roles) {
      const rolePermissions = ROLE_PERMISSION_MATRIX[role];
      if (rolePermissions) {
        const permissionLevel = rolePermissions[module];
        if (permissionLevel && levelToActions[permissionLevel].includes(action)) {
          return true;
        }
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
    // Check custom permissions first
    if (this.userContext.customPermissions?.[module] === 'FULL') {
      return true;
    }

    // Check role-based permissions
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
    // Find the module and action for this granular permission
    for (const [module, permissions] of Object.entries(GRANULAR_PERMISSIONS)) {
      if (permissions[granularPerm as keyof typeof permissions]) {
        const action = permissions[granularPerm as keyof typeof permissions] as `${Module}.${Action}`;
        const [modName, act] = action.split('.');
        return this.hasPermission(modName as Module, act as Action);
      }
    }

    return false;
  }

  /**
   * Get user's permission level for a module
   */
  getPermissionLevel(module: Module): PermissionLevel {
    // Check custom permissions first
    if (this.userContext.customPermissions?.[module]) {
      return this.userContext.customPermissions[module];
    }

    // Get highest permission level from all roles
    let highestLevel: PermissionLevel = 'NONE';
    const levelHierarchy = ['NONE', 'VIEW', 'LIMITED', 'FULL'];

    for (const role of this.userContext.roles) {
      const rolePermissions = ROLE_PERMISSION_MATRIX[role];
      if (rolePermissions?.[module]) {
        const roleLevel = rolePermissions[module];
        if (levelHierarchy.indexOf(roleLevel) > levelHierarchy.indexOf(highestLevel)) {
          highestLevel = roleLevel;
        }
      }
    }

    return highestLevel;
  }

  /**
   * Get all modules user has access to
   */
  getAccessibleModules(): Module[] {
    const modules: Module[] = [
      'users', 'properties', 'staff', 'reservations', 'fnb', 
      'inventory', 'finance', 'reports', 'system', 'maintenance', 'security'
    ];

    return modules.filter(module => this.hasAnyPermission(module));
  }

  /**
   * Check property-scoped access
   */
  hasPropertyAccess(propertyId: string): boolean {
    // If no propertyId specified in user context, assume full access
    if (!this.userContext.propertyId) {
      return true;
    }

    // Check if user has access to the specific property
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
