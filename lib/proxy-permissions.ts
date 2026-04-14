export interface RoutePermission {
  granular: string;
}

export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Admin Dashboard
  '/admin/dashboard': { granular: 'reports.read' },

  // Users & Roles
  '/admin/user': { granular: 'users.read' },
  '/admin/user/role': { granular: 'roles.read' },
  '/admin/user/userRole': { granular: 'users.read' },

  // Properties
  '/admin/property': { granular: 'properties.read' },

  // Staff Management
  '/admin/staff': { granular: 'staff.read' },

  // Bar Management (Food & Beverage)
  '/admin/bar-management': { granular: 'fnb.read' },
  '/admin/bar-management/bar': { granular: 'fnb.read' },
  '/admin/bar-management/beverages': { granular: 'fnb.read' },
  '/admin/bar-management/user-stock-logs': { granular: 'fnb.read' },
  '/admin/bar-management/store-inventory': { granular: 'inventory.read' },
  '/admin/bar-management/store-transactions': { granular: 'inventory.read' },

  // Inventory Management
  '/admin/inventory-management': { granular: 'inventory.read' },
  '/admin/inventory-management/inventory-item': { granular: 'inventory.read' },
  '/admin/inventory-management/inventory-transaction': { granular: 'inventory.read' },
  '/admin/inventory-management/supplier': { granular: 'inventory.read' },
  '/admin/inventory-management/purchase-order': { granular: 'inventory.read' },
  '/admin/inventory-management/purchase-order-line': { granular: 'inventory.read' },

  // Room Management & Reservations
  '/admin/room-management': { granular: 'reservations.read' },
  '/admin/room-management/room-type': { granular: 'rooms.read' },
  '/admin/room-management/room': { granular: 'rooms.read' },
  '/admin/room-management/reservation': { granular: 'reservations.read' },
  '/admin/room-management/guest': { granular: 'reservations.read' },
  '/admin/room-management/housekeeping-task': { granular: 'system.admin' },

  // Shift Management
  '/admin/shift-management': { granular: 'staff.read' },
  '/admin/shift-management/shift': { granular: 'staff.read' },

  // Additional admin routes for specific actions
  '/admin/user/create': { granular: 'users.create' },
  '/admin/user/[id]/edit': { granular: 'users.update' },
  '/admin/user/[id]': { granular: 'users.read' },
  '/admin/user/role/create': { granular: 'roles.create' },
  '/admin/user/role/[id]/edit': { granular: 'roles.update' },
  '/admin/user/userRole/create': { granular: 'users.create' },
  '/admin/user/userRole/[id]/edit': { granular: 'users.update' },

  // Properties
  '/admin/property/create': { granular: 'properties.create' },
  '/admin/property/[id]/edit': { granular: 'properties.update' },

  // Staff Management
  '/admin/staff/create': { granular: 'staff.create' },
  '/admin/staff/[id]/edit': { granular: 'staff.update' },
  '/admin/shift-management/shift/create': { granular: 'staff.create' },
  '/admin/shift-management/shift/[id]/edit': { granular: 'staff.update' },

  // Reservations & Rooms
  '/admin/room-management/reservation/create': { granular: 'reservations.create' },
  '/admin/room-management/reservation/[id]/edit': { granular: 'reservations.update' },
  '/admin/room-management/reservation/[id]/checkin': { granular: 'reservations.update' },
  '/admin/room-management/reservation/[id]/checkout': { granular: 'reservations.update' },
  '/admin/room-management/room/create': { granular: 'rooms.update' },
  '/admin/room-management/room/[id]/edit': { granular: 'rooms.update' },
  '/admin/room-management/room-type/create': { granular: 'rooms.update' },
  '/admin/room-management/room-type/[id]/edit': { granular: 'rooms.update' },
  '/admin/room-management/guest/create': { granular: 'reservations.create' },
  '/admin/room-management/guest/[id]/edit': { granular: 'reservations.update' },
  '/admin/room-management/housekeeping-task/create': { granular: 'system.admin' },
  '/admin/room-management/housekeeping-task/[id]/edit': { granular: 'system.admin' },

  // Food & Beverage
  '/admin/bar-management/bar/create': { granular: 'fnb.create' },
  '/admin/bar-management/bar/[id]/edit': { granular: 'fnb.update' },
  '/admin/bar-management/beverages/create': { granular: 'fnb.create' },
  '/admin/bar-management/beverages/[id]/edit': { granular: 'fnb.update' },

  // Inventory Management
  '/admin/inventory-management/inventory-item/create': { granular: 'inventory.create' },
  '/admin/inventory-management/inventory-item/[id]/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/inventory-transaction/create': { granular: 'inventory.create' },
  '/admin/inventory-management/inventory-transaction/[id]/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/supplier/create': { granular: 'inventory.create' },
  '/admin/inventory-management/supplier/[id]/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/purchase-order/create': { granular: 'inventory.create' },
  '/admin/inventory-management/purchase-order/[id]/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/purchase-order-line/create': { granular: 'inventory.create' },
  '/admin/inventory-management/purchase-order-line/[id]/edit': { granular: 'inventory.update' },
};