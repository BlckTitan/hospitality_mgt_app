'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

interface FilterComponentProps {
  propertyId: Id<'properties'>;
  onFilter: (filters: {
    userId?: string;
    barId?: string;
    logDate?: string;
  }) => void;
  onClear: () => void;
}

export function FilterComponent({ propertyId, onFilter, onClear }: FilterComponentProps) {
  // Fetch data for filter options
  const usersResponse = useQuery(api.users.getAllUsers, { propertyId });
  const barsResponse = useQuery(api.bars.getAllBars, { propertyId });
  
  const users = usersResponse?.data || [];
  const bars = barsResponse?.data || [];

  const [filters, setFilters] = useState({
    userId: '',
    barId: '',
    logDate: '',
  });

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    const activeFilters: any = {};
    if (filters.userId) activeFilters.userId = filters.userId as Id<'users'>;
    if (filters.barId) activeFilters.barId = filters.barId as Id<'bars'>;
    if (filters.logDate) activeFilters.logDate = filters.logDate;
    
    onFilter(activeFilters);
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      barId: '',
      logDate: '',
    });
    onClear();
  };

  const hasActiveFilters = filters.userId || filters.barId || filters.logDate;

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
          <select
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Users</option>
            {users
              .filter((user: any) => user.isActive)
              .map((user: any) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bar</label>
          <select
            value={filters.barId}
            onChange={(e) => handleFilterChange('barId', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Bars</option>
            {bars
              .filter((bar: any) => bar.isActive)
              .map((bar: any) => (
                <option key={bar._id} value={bar._id}>
                  {bar.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={filters.logDate}
            onChange={(e) => handleFilterChange('logDate', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button
            variant="primary"
            onClick={applyFilters}
            className="flex-1"
          >
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button
              variant="outline-secondary"
              onClick={clearFilters}
              className="flex-1"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
