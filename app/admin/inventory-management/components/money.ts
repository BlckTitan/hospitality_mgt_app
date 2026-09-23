'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

export function propertyCurrencyCode(currency?: string | null) {
  const code = (currency || 'USD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : 'USD';
}

export function formatPropertyMoney(amount: number | undefined | null, currency?: string | null) {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return '—';
  const code = propertyCurrencyCode(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(Number(amount));
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  }
}

export function usePropertyCurrency(propertyId?: string) {
  const currency = useQuery(
    api.property.getPropertyCurrency,
    propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip',
  );
  return propertyCurrencyCode(currency);
}
