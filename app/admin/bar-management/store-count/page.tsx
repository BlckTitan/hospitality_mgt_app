'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { BarManagementPageGuide } from '../components/barManagementPageGuide'
import StoreCount from './components/storeCount'

export default function Page() {
  const [propertyId, setPropertyId] = useState('')
  const propertiesResponse = useQuery(api.property.getAllProperties)
  const properties = propertiesResponse?.data || []
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''

  if (propertiesResponse === undefined) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    )
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Store count</h1>
        <BarManagementPageGuide page="store-count" />
      </div>
        <BackLink />
      </header>
      {properties.length > 1 && (
        <div className="mb-4 w-full lg:w-3/12">
          <label className="block text-sm mb-1">Property</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={currentPropertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          >
            {properties.map((property: any) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <StoreCount currentPropertyId={currentPropertyId as Id<'properties'>} />
    </div>
  )
}
