const CHRONOLOGICAL_COLLECTIONS = new Set([
  'expenses',
  'billPeriods',
  'storeTransactions',
  'purchaseOrderLines',
  'hours',
  'timeOff',
  'payrolls',
  'reservations',
  'inventoryTransactions',
  'housekeepingTasks',
  'maintenanceOrders',
  'inventoryTasks',
  'shifts',
]);

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nestedName(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  return text((value as { name?: unknown }).name);
}

export function listLabel(row: unknown): string {
  if (!row || typeof row !== 'object') return '';
  const record = row as Record<string, unknown>;
  const person = `${text(record.firstName)} ${text(record.lastName)}`.trim();
  return (
    nestedName(record.beverage) ||
    nestedName(record.menuItem) ||
    text(record.name) ||
    text(record.label) ||
    text(record.roomNumber) ||
    text(record.tableNumber) ||
    person ||
    text(record.userName) ||
    text(record.staffName) ||
    text(record.scheduledName) ||
    nestedName(record.user) ||
    text(record.email)
  );
}

export function sortByLabel<T>(rows: T[]): T[] {
  return rows
    .map((row, index) => ({ row, index, label: listLabel(row) }))
    .sort((a, b) => {
      if (a.label && b.label) {
        const compared = a.label.localeCompare(b.label, undefined, {
          sensitivity: 'base',
          numeric: true,
        });
        if (compared !== 0) return compared;
      } else if (a.label) {
        return -1;
      } else if (b.label) {
        return 1;
      }
      return a.index - b.index;
    })
    .map((item) => item.row);
}

export function isChronologicalCollection(collectionName: string) {
  return CHRONOLOGICAL_COLLECTIONS.has(collectionName);
}

export function orderedRows<T>(collectionName: string, rows: T[]): T[] {
  if (CHRONOLOGICAL_COLLECTIONS.has(collectionName)) return rows;
  if (rows.length === 0 || rows.every((row) => !listLabel(row))) return rows;
  return sortByLabel(rows);
}
