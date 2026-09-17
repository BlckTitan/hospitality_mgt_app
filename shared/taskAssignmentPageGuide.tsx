'use client'

type GuidePage =
  | 'housekeeping'
  | 'housekeeping-edit'
  | 'maintenance'
  | 'maintenance-edit'
  | 'inventory'
  | 'inventory-edit'
  | 'mine'
  | 'templates';

const DESCRIPTIONS: Record<GuidePage, string> = {
  housekeeping:
    'Create checkout, stayover, deep-clean, or inspection work with +. Filter Unassigned, Mine, or Overdue. Any assignee may start; only the lead or a supervisor can complete. Completing a checkout task sets the room as cleaned. Front desk treats a room as unready while an open housekeeping task remains.',
  'housekeeping-edit':
    'Update type, lead, helpers, and status. Any assignee may start. Only the lead or a supervisor can complete or skip — skip requires notes. Completing a checkout task updates Room last cleaned.',
  maintenance:
    'Create a work order with +. Add a description, estimated cost, and any parts purchased for the job. Name a staff lead (and optional helpers) plus an optional vendor. Filter Unassigned, Mine, or Overdue. Preventive orders can also be created when an asset is due.',
  'maintenance-edit':
    'Start, complete, or cancel this order. Update the description, estimated and actual cost, and purchased items. Any assignee may start; only the lead or a supervisor can complete. Cancel requires notes. Completing preventive work updates the asset last and next maintenance dates.',
  inventory:
    'Restock when quantity hits the reorder point, or putaway when a purchase order is received. Create with + — putaway needs a received PO. Completing restock does not raise a purchase order.',
  'inventory-edit':
    'Start or complete this restock or putaway. Any assignee may start; only the lead or a supervisor can complete. Cancel requires notes.',
  mine:
    'Work assigned to you as lead or helper across housekeeping, maintenance, and inventory. Open a row to start or complete it.',
  templates:
    'Save a checklist per module and type (for example checkout or putaway). New work copies these steps; later template edits do not change open tasks.',
};

export function TaskAssignmentPageGuide({ page }: { page: GuidePage }) {
  return (
    <p className="mb-4 text-sm text-gray-600">
      {DESCRIPTIONS[page]}
    </p>
  );
}
