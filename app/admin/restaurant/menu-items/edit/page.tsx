'use client'

import { BackLink } from '../../../../../shared/pageHeader'
import React from 'react'
import Spinner from '../../../../../shared/spinner'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { useSearchParams } from 'next/navigation'
import { FormComponent } from '../components/editMenuItemForm'

export default function Page() {
  const { isAuthenticated } = useConvexAuth()
  const searchParams = useSearchParams()
  const id = searchParams.get('menu_item_id') ?? null
  const response = useQuery(
    api.restaurantMenuItems.getMenuItem,
    isAuthenticated && id ? { menuItemId: id as Id<'restaurantMenuItems'> } : 'skip',
  )

  if (response === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner size="sm" />
      </div>
    )
  }
  if (!response?.success || !response.data) return <div>No data available!</div>

  const item = response.data

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Update {item.name}</h1>
          <p className="text-gray-600">Update this menu item’s name, station, price, and availability.</p>
        </div>
        <BackLink />
      </header>

      <FormComponent
        id={item._id}
        name={item.name}
        category={item.category}
        station={item.station}
        price={item.price}
        isAvailable={item.isAvailable}
      />
    </div>
  )
}
