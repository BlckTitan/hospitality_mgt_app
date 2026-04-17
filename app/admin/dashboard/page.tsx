'use client'

import React, { useState, Suspense } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import CheckRole from '../../../utils/checkUserRole';
import Spinner from '../../../shared/spinner';

export default function Dashboard() {
  const [propertyId, setPropertyId] = useState<string>('');

  return (
    <Suspense fallback={
      <div className='w-full h-full flex justify-center items-center'>
        <Spinner size="lg" />
      </div>
    }>
      <DashboardContent propertyId={propertyId} setPropertyId={setPropertyId} />
    </Suspense>
  );
}

function DashboardContent({ propertyId, setPropertyId }: { propertyId: string; setPropertyId: (id: string) => void }) {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';

  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <Spinner size="lg" />
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
      </div>
    </div>
  );
}