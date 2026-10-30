'use client';

import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { beverageCategories } from './validation';

export function BeverageCategoryField({
  propertyId,
  registration,
  error,
  currentValue,
}: {
  propertyId?: Id<'properties'>;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  currentValue?: string;
}) {
  const listed = useQuery(
    api.beverageCategories.listBeverageCategories,
    propertyId ? { propertyId } : 'skip',
  );

  const options = useMemo(() => {
    const active = (listed?.data ?? [])
      .filter((item) => item.isActive)
      .map((item) => ({ value: item.name, label: item.label }));
    const fallback = beverageCategories.map((name) => ({
      value: name,
      label: name.charAt(0).toUpperCase() + name.slice(1).replaceAll('-', ' '),
    }));
    const base = active.length > 0 ? active : fallback;
    if (currentValue && !base.some((item) => item.value === currentValue)) {
      return [{ value: currentValue, label: currentValue }, ...base];
    }
    return base;
  }, [listed?.data, currentValue]);

  return (
    <label className="w-full">
      <span className="block text-sm font-medium text-gray-700 mb-1">Category *</span>
      <select
        id="category"
        {...registration}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select a category</option>
        {options.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </label>
  );
}
