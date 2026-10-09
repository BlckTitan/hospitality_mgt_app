'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'

type Station = 'kitchen' | 'grill' | 'other'
type PrepColumn = 'pending' | 'preparing' | 'ready'

export default function KitchenBoard() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''

  const [station, setStation] = useState<Station>('kitchen')
  const [busy, setBusy] = useState(false)

  const tickets = useQuery(
    api.restaurantOrders.listKitchenTickets,
    currentPropertyId ? { propertyId: currentPropertyId, station } : 'skip',
  )
  const bumpPrepStatus = useMutation(api.restaurantOrders.bumpPrepStatus)

  const visible = useMemo(() => tickets?.data ?? [], [tickets?.data])

  const handleBump = async (orderLineId: Id<'restaurantOrderLines'>) => {
    setBusy(true)
    try {
      const response = await bumpPrepStatus({ orderLineId })
      if (!response.success) toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Bump failed')
    } finally {
      setBusy(false)
    }
  }

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="p-4 text-xl">No properties yet!</p>

  return (
    <div className="w-full h-full">
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <label className="flex flex-col text-sm">
          Property
          <select
            className="border rounded px-2 mt-2"
            value={currentPropertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          >
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          {(['kitchen', 'grill', 'other'] as Station[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStation(item)}
              className={`px-4 py-2 text-sm rounded-md border capitalize ${
                station === item ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-300'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {tickets === undefined && <p className="text-sm text-gray-500 mb-4">Loading tickets…</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['pending', 'preparing', 'ready'] as PrepColumn[]).map((column) => (
          <div key={column} className="border border-gray-200 rounded-md min-h-[280px]">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-600">
              {column}
            </div>
            <ul className="p-2 space-y-2">
              {visible
                .filter((ticket) => ticket.prepStatus === column)
                .map((ticket) => (
                  <li key={ticket._id} className="border border-gray-200 rounded-md p-3 bg-white">
                    <div className="text-xs text-gray-500">
                      #{ticket.order.checkSuffix || String(ticket.orderId).slice(-6)}
                      {' · '}
                      {ticket.tableNumber
                        ? `Table ${ticket.tableNumber}`
                        : ticket.order.orderType.replace('_', ' ')}
                    </div>
                    <div className="font-semibold text-gray-900 mt-1">
                      {ticket.quantity}× {ticket.nameSnapshot}
                    </div>
                    {ticket.specialInstructions && (
                      <p className="text-xs text-amber-800 mt-1">{ticket.specialInstructions}</p>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleBump(ticket._id)}
                      className="mt-3 w-full text-sm py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Bump →
                    </button>
                  </li>
                ))}
              {visible.filter((ticket) => ticket.prepStatus === column).length === 0 && (
                <li className="text-sm text-gray-400 px-2 py-6 text-center">No tickets</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
