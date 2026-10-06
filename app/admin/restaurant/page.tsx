'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { BackLink } from '../../../shared/pageHeader'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../inventory-management/components/money'
import { HUB_LINKS } from './components/hubLinks'
import { RestaurantPageGuide } from './components/restaurantPageGuide'

export default function RestaurantHubPage() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)

  const snapshot = useQuery(
    api.dashboard.getRestaurantTodaySnapshot,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )

  if (propertiesResponse === undefined) {
    return <p className="p-4">Loading</p>
  }
  if (properties.length === 0) {
    return <p className="p-4 text-xl">No properties yet!</p>
  }

  const data = snapshot?.data
  const money = (n: number) => formatPropertyMoney(n, currency)

  const kpis = [
    { label: 'Revenue today', value: data ? money(data.revenue) : '—' },
    { label: 'Food cost %', value: data ? `${data.foodCostPercent.toFixed(1)}%` : '—' },
    { label: 'Open checks', value: data ? String(data.openOrders) : '—' },
    { label: 'Tables occupied', value: data ? String(data.occupiedTables) : '—' },
  ]

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant</h1>
          <RestaurantPageGuide page="hub" />
        </div>
        <BackLink />
      </header>

      <div className="mb-6">
        <label htmlFor="restaurant-property" className="block text-sm font-medium text-gray-700 mb-2">
          Property
        </label>
        <select
          id="restaurant-property"
          value={currentPropertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="block w-full lg:w-3/12 px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {properties.map((property) => (
            <option key={property._id} value={property._id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">
              {snapshot === undefined ? '…' : kpi.value}
            </p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Screens</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {HUB_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block border border-gray-200 rounded-md p-4 hover:border-gray-400 transition-colors"
          >
            <span className="font-semibold text-gray-900">{link.title}</span>
            <p className="text-sm text-gray-600 mt-1">{link.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
