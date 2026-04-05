"use client"
import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import ReorderAlertsTable from './components/reorder-alerts';

export default function BarManagement() {
    const [propertyId, setPropertyId] = useState<string>('');

    const propertiesResponse = useQuery(api.property.getAllProperties);
    const properties = propertiesResponse?.data || [];
    const currentPropertyId = propertyId || properties?.[0]?._id || '';

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
        <div className="w-full p-6 bg-white">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Bar Management</h1>
                <p className="text-gray-600">Manage your bar operations, inventory, and reorder alerts</p>
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

            {/* Reorder Alerts Section */}
            <div className="mb-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
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
                
                <ReorderAlertsTable currentPropertyId={currentPropertyId as Id<"properties">} />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a 
                    href="/admin/bar-management/beverages" 
                    className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Beverages</h3>
                    <p className="text-sm text-blue-600">Manage beverage catalog and pricing</p>
                </a>
                
                <a 
                    href="/admin/bar-management/store-inventory" 
                    className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Store Inventory</h3>
                    <p className="text-sm text-green-600">View and manage central store stock</p>
                </a>
                
                <a 
                    href="/admin/bar-management/store-transactions" 
                    className="block p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">Stock Transactions</h3>
                    <p className="text-sm text-purple-600">Track stock movements and issues</p>
                </a>
            </div>
        </div>
    );
}