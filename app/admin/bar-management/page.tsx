"use client"
import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import ReorderAlertsTable from './components/reorder-alerts';
import SalesSummaryCharts from './components/sales-summary-charts';
import { BackLink } from '../../../shared/pageHeader';
import { usePermissions } from '../../../hooks/usePermissions';
import Spinner from '../../../shared/spinner';

export default function BarManagement() {
  const [propertyId, setPropertyId] = useState('');
  const { hasGranularPermission, isLoading: permissionsLoading } = usePermissions();
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {});
  const properties = propertiesResponse?.data ?? [];
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | '';
  const selected = properties.find((property) => property._id === currentPropertyId) ?? properties[0];
  const canReports = hasGranularPermission('reports.read');
  const canInventory = hasGranularPermission('inventory.read');

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

  return (
    <div className="w-full p-6 bg-white">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Bar Management</h1>
          <p className="text-gray-600">Manage your bar operations, inventory, and reorder alerts</p>
        </div>
        <BackLink />
      </div>

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

      {canReports && currentPropertyId && (
        <div className="mb-8">
          <SalesSummaryCharts
            currentPropertyId={currentPropertyId}
            currency={selected?.currency}
          />
        </div>
      )}

      {canInventory && currentPropertyId && (
        <div className="mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Reorder Alerts
                </h3>
                <p className="text-sm text-yellow-700">
                  Automatic notifications when beverage stock falls below reorder levels
                </p>
              </div>
            </div>
          </div>

          <ReorderAlertsTable currentPropertyId={currentPropertyId} />
        </div>
      )}
    </div>
  );
}
