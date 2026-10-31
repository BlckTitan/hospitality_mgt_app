'use client'

type GuidePage =
  | 'hub'
  | 'menu-items'
  | 'recipes'
  | 'tables'
  | 'pos'
  | 'orders'
  | 'kitchen'
  | 'inventory'
  | 'inventory-movements'

const DESCRIPTIONS: Record<GuidePage, string> = {
  hub: 'Restaurant hub — food menu, recipes, tables, POS, and kitchen/grill tickets. Independent from Bar Management / beverage POS.',
  'menu-items':
    'Food sellables with a photo, category, station (kitchen or grill), price, and recipe cost. Availability controls what appears on Restaurant POS.',
  recipes:
    'Link menu items to restaurant ingredients. Cost updates when ingredient unit cost changes.',
  tables:
    'Simple floor board: available, occupied, reserved, out of service. Seat a party from here or from Restaurant POS.',
  pos: 'Open dine-in, takeout, or room-service checks after you start a restaurant shift. Add lines by station. Settle with cash, card (record), room charge, or open tab — no payment gateway.',
  orders:
    'List restaurant checks the way beverage POS lists checks: check ID, waiter, open date, and pay down. Beverage POS orders stay under /admin/pos.',
  kitchen:
    'Toast-style station board. Filter kitchen or grill, bump line status pending → preparing → ready → served.',
  inventory:
    'Restaurant-owned ingredients. Stock here is separate from hotel inventory and the bar store.',
  'inventory-movements':
    'Receive, use, waste, or adjust restaurant ingredient stock. Settled checks deduct recipe quantities automatically.',
}

export function RestaurantPageGuide({ page }: { page: GuidePage }) {
  return <p className="text-gray-600">{DESCRIPTIONS[page]}</p>
}
