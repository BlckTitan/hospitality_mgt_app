'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../../../../../shared/button';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

interface FilterComponentProps {
  propertyId: Id<'properties'>;
  defaultLogDate: string;
  initialFilters?: {
    userId?: string;
    barId?: string;
    logDate?: string;
  } | null;
  onFilter: (filters: {
    userId?: string;
    barId?: string;
    logDate?: string;
  }) => void;
  onClear: () => void;
}

export function FilterComponent({ propertyId, defaultLogDate, initialFilters, onFilter, onClear }: FilterComponentProps) {
  const { isAuthenticated } = useConvexAuth();
  const barsResponse = useQuery(api.bars.getAllBars, isAuthenticated ? { propertyId } : 'skip');
  const bars = barsResponse?.data || [];

  const [filters, setFilters] = useState({
    userId: initialFilters?.userId ?? '',
    barId: initialFilters?.barId ?? '',
    logDate: initialFilters?.logDate || defaultLogDate,
  });

  const usersResponse = useQuery(
    api.userStockLogs.listActiveUsersForBar,
    isAuthenticated
      ? {
          propertyId,
          barId: filters.barId ? (filters.barId as Id<'bars'>) : undefined,
          logDate: filters.logDate || defaultLogDate,
        }
      : 'skip',
  );
  const users = usersResponse?.data || [];

  useEffect(() => {
    if (!filters.userId) return;
    if (usersResponse === undefined) return;
    if (!users.some((user) => user._id === filters.userId)) {
      setFilters((prev) => ({ ...prev, userId: '' }));
    }
  }, [filters.userId, users, usersResponse]);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => {
      if (field === 'barId') {
        return { ...prev, barId: value, userId: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  const applyFilters = () => {
    const activeFilters: {
      userId?: Id<'users'>;
      barId?: Id<'bars'>;
      logDate?: string;
    } = {};
    if (filters.userId) activeFilters.userId = filters.userId as Id<'users'>;
    if (filters.barId) activeFilters.barId = filters.barId as Id<'bars'>;
    activeFilters.logDate = filters.logDate || defaultLogDate;

    onFilter(activeFilters);
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      barId: '',
      logDate: defaultLogDate,
    });
    onClear();
  };

  const hasActiveFilters = Boolean(
    filters.userId || filters.barId || (filters.logDate && filters.logDate !== defaultLogDate),
  );

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3">
        <div className="w-full lg:w-3/12">
          <label className="block text-sm font-medium text-gray-700 mb-1">Bar</label>
          <select
            value={filters.barId}
            onChange={(e) => handleFilterChange('barId', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Bars</option>
            {bars
              .filter((bar: { isActive: boolean }) => bar.isActive)
              .map((bar: { _id: string; name: string }) => (
                <option key={bar._id} value={bar._id}>
                  {bar.name}
                </option>
              ))}
          </select>
        </div>

        <div className="w-full lg:w-3/12">
          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
          <select
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All on duty</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-2/12">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={filters.logDate}
            onChange={(e) => handleFilterChange('logDate', e.target.value || defaultLogDate)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 pb-0.5">
          <Button variant="primary" onClick={applyFilters}>
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button variant="outline-secondary" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>
      {usersResponse?.success && users.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {filters.barId
            ? 'No staff linked to this bar are on duty on this date.'
            : 'No staff linked to a bar are on duty on this date.'}
        </p>
      )}
    </div>
  );
}
