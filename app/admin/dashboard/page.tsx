'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import Spinner from '../../../shared/spinner';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  BillingCard,
  FinancialReportCard,
  FnBCard,
  HousekeepingCard,
  InventoryCard,
  RoomsCard,
} from './components/dashboard-cards';

const TAB_LABELS = {
  pnl: 'P&L / RevPAR',
  rooms: 'Rooms',
  housekeeping: 'Housekeeping',
  inventory: 'Inventory',
  fnb: 'F&B today',
  billing: 'Billing',
} as const;

type TabId = keyof typeof TAB_LABELS;

export default function Dashboard() {
  const [propertyId, setPropertyId] = useState('');
  const [tab, setTab] = useState<TabId>('pnl');
  const { hasGranularPermission, isLoading: permissionsLoading } = usePermissions();
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {});
  const properties = propertiesResponse?.data ?? [];
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | '';

  const canRooms = hasGranularPermission('rooms.read') || hasGranularPermission('reservations.read');
  const canHousekeeping = hasGranularPermission('housekeeping.task.read');
  const canInventory = hasGranularPermission('inventory.read');
  const canFnB = hasGranularPermission('fnb.read');
  const canBilling = hasGranularPermission('billing.period.read');

  const tabs = useMemo(() => {
    const items: TabId[] = ['pnl'];
    if (currentPropertyId && canRooms) items.push('rooms');
    if (currentPropertyId && canHousekeeping) items.push('housekeeping');
    if (currentPropertyId && canInventory) items.push('inventory');
    if (currentPropertyId && canFnB) items.push('fnb');
    if (currentPropertyId && canBilling) items.push('billing');
    return items;
  }, [canBilling, canFnB, canHousekeeping, canInventory, canRooms, currentPropertyId]);

  useEffect(() => {
    if (!tabs.includes(tab)) {
      setTab(tabs[0] ?? 'pnl');
    }
  }, [tab, tabs]);

  if (propertiesResponse === undefined || permissionsLoading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!propertiesResponse.success) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">{propertiesResponse.message || 'Could not load properties.'}</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    );
  }

  const selected = properties.find((property) => property._id === currentPropertyId) ?? properties[0];

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Property financial and operational health</p>
      </header>

      <div className="mb-6">
        <label htmlFor="property-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Property
        </label>
        <select
          id="property-select"
          value={currentPropertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="block w-full lg:w-3/12 px-3 py-2 border border-gray-300 rounded-md"
        >
          {properties.map((property) => (
            <option key={property._id} value={property._id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={tab === item ? 'dark' : 'outline-secondary'}
            onClick={() => setTab(item)}
          >
            {TAB_LABELS[item]}
          </Button>
        ))}
      </div>

      {tab === 'pnl' && currentPropertyId && (
        <FinancialReportCard
          propertyId={currentPropertyId}
          currency={selected.currency}
          timeZone={selected.timezone}
        />
      )}
      {tab === 'rooms' && currentPropertyId && <RoomsCard propertyId={currentPropertyId} />}
      {tab === 'housekeeping' && currentPropertyId && <HousekeepingCard propertyId={currentPropertyId} />}
      {tab === 'inventory' && currentPropertyId && (
        <InventoryCard propertyId={currentPropertyId} currency={selected.currency} />
      )}
      {tab === 'fnb' && currentPropertyId && (
        <FnBCard
          propertyId={currentPropertyId}
          currency={selected.currency}
          canReadInventory={canInventory}
        />
      )}
      {tab === 'billing' && currentPropertyId && (
        <BillingCard propertyId={currentPropertyId} currency={selected.currency} />
      )}
    </div>
  );
}
