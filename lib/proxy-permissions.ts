export interface RoutePermission {
  granular: string | string[];
}

export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Admin Dashboard
  '/admin/dashboard': { granular: 'reports.read' },

  // Users & Roles
  '/admin/user': { granular: 'users.read' },
  '/admin/user/role': { granular: 'roles.read' },
  '/admin/user/userRole': { granular: 'users.read' },
  '/admin/userRole': { granular: 'users.read' },

  // Properties
  '/admin/property': { granular: 'properties.read' },

  // Staff Management
  '/admin/staff': { granular: 'staff.read' },
  '/admin/staff/myProfile': { granular: 'staff.self.read' },

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
  '/admin/room-management/housekeeping-task': { granular: 'housekeeping.task.read' },

  // Shift Management
  '/admin/shift-management': { granular: 'staff.read' },
  '/admin/shift-management/shift': { granular: ['staff.read', 'payroll.timesheet.create', 'fnb.read'] },
  '/admin/shift-management/templates': { granular: 'staff.read' },
  '/admin/shift-management/templates/edit': { granular: 'staff.update' },
  '/admin/shift-management/cover': { granular: 'staff.update' },
  '/admin/shift-management/attendance': { granular: ['payroll.timesheet.create', 'fnb.read'] },
  '/admin/shift-management/hours': { granular: 'payroll.timesheet.read' },
  '/admin/shift-management/hours/edit': { granular: 'payroll.timesheet.update' },
  '/admin/shift-management/punctuality': { granular: ['payroll.timesheet.read', 'staff.read'] },

  // Payroll Management — screens use Hours / Time off / Payroll / Payroll settings
  '/admin/payroll-management': { granular: 'payroll.run.read' },
  '/admin/payroll-management/payroll': { granular: 'payroll.run.read' },
  '/admin/payroll-management/payroll/edit': { granular: 'payroll.run.read' },
  '/admin/payroll-management/payroll/view': { granular: 'payroll.run.read' },
  '/admin/payroll-management/payroll/payslip': { granular: 'payroll.payslip.read' },
  '/admin/payroll-management/payroll/export': { granular: 'payroll.run.export' },
  '/admin/payroll-management/hours': { granular: 'payroll.timesheet.read' },
  '/admin/payroll-management/hours/edit': { granular: 'payroll.timesheet.update' },
  '/admin/payroll-management/time-off': { granular: 'payroll.leave.read' },
  '/admin/payroll-management/time-off/edit': { granular: 'payroll.leave.create' },
  '/admin/payroll-management/settings': { granular: 'payroll.settings.update' },

  // Additional admin routes for specific actions
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
  '/admin/room-management/housekeeping-task/create': { granular: 'housekeeping.task.assign' },
  '/admin/room-management/housekeeping-task/[id]/edit': { granular: 'housekeeping.task.update' },

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

  // Edit pages (query-param based routes used in the app)
  '/admin/user/edit': { granular: 'users.update' },
  '/admin/user/role/edit': { granular: 'roles.update' },
  '/admin/userRole/edit': { granular: 'users.update' },
  '/admin/property/edit': { granular: 'properties.update' },
  '/admin/staff/edit': { granular: 'staff.update' },
  '/admin/staff/view': { granular: 'staff.read' },
  '/admin/shift-management/shift/edit': { granular: 'staff.update' },
  '/admin/bar-management/bar/edit': { granular: 'fnb.update' },
  '/admin/bar-management/beverages/edit': { granular: 'fnb.update' },
  '/admin/bar-management/user-stock-logs/edit': { granular: 'fnb.update' },
  '/admin/bar-management/store-inventory/edit': { granular: 'inventory.update' },
  '/admin/bar-management/store-transactions/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/inventory-item/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/inventory-transaction/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/supplier/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/purchase-order/edit': { granular: 'inventory.update' },
  '/admin/inventory-management/purchase-order-line/edit': { granular: 'inventory.update' },
  '/admin/room-management/room/edit': { granular: 'rooms.update' },
  '/admin/room-management/room-type/edit': { granular: 'rooms.update' },
  '/admin/room-management/reservation/edit': { granular: 'reservations.update' },
  '/admin/room-management/reservation/guest/edit': { granular: 'reservations.update' },
  '/admin/room-management/guest/edit': { granular: 'reservations.update' },
  '/admin/room-management/housekeeping-task/edit': { granular: 'housekeeping.task.update' },
  '/admin/tasks/mine': { granular: ['housekeeping.task.read', 'maintenance.order.read', 'inventory.task.read'] },
  '/admin/tasks/templates': { granular: ['housekeeping.task.assign', 'maintenance.order.assign', 'inventory.task.assign'] },
  '/admin/maintenance': { granular: 'maintenance.order.read' },
  '/admin/maintenance/edit': { granular: 'maintenance.order.update' },
  '/admin/inventory-management/tasks': { granular: 'inventory.task.read' },
  '/admin/inventory-management/tasks/edit': { granular: 'inventory.task.update' },
  '/admin/billing': { granular: 'billing.period.read' },
  '/admin/billing/accounts': { granular: 'billing.account.read' },
  '/admin/billing/accounts/edit': { granular: 'billing.account.update' },
  '/admin/billing/bills': { granular: 'billing.period.read' },
  '/admin/expenses': { granular: 'expenses.read' },
};