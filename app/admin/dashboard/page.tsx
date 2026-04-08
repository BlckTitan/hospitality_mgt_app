'use client'

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { checkRole } from '../../../utils/roles';
// import DashboardSalesCharts from './components/sales-summary-charts';

export default function Dashboard() {
  const [propertyId, setPropertyId] = useState<string>('');

  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';

  if (!checkRole('admin')) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-red-600">Access denied. Admin role required.</p>
      </div>
    );
  }

  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600">Comprehensive overview of your hospitality business</p>
      </div>

      {/* Property Selector */}
      <div className="mb-6">
        <label htmlFor="property-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Property
        </label>
        <select
          id="property-select"
          value={currentPropertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {properties.map((property: any) => (
            <option key={property._id} value={property._id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sales Summary Charts */}
      {/* <DashboardSalesCharts currentPropertyId={currentPropertyId as Id<"properties">} /> */}

      {/* Additional Dashboard Sections */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <p className="text-gray-600">Recent transactions and activities will appear here.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database Status</span>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Healthy</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last Sync</span>
              <span className="text-sm text-gray-500">2 minutes ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Users</span>
              <span className="text-sm text-gray-500">12 online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}