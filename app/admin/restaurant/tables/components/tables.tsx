'use client'

import { useState } from 'react'
import { MdEditDocument } from 'react-icons/md'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Button } from '../../../../../shared/button'
import BootstrapModal from '../../../../../shared/modal'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { usePermissions } from '../../../../../hooks/usePermissions'

type TableStatus = 'available' | 'occupied' | 'reserved' | 'out-of-service'

const statusStyles: Record<TableStatus, string> = {
  available: 'border-green-300 bg-green-50',
  occupied: 'border-amber-300 bg-amber-50',
  reserved: 'border-sky-300 bg-sky-50',
  'out-of-service': 'border-gray-300 bg-gray-100 opacity-70',
}

const statusLabel: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  'out-of-service': 'Out of service',
}

const STATUS_CYCLE: TableStatus[] = ['available', 'occupied', 'reserved', 'out-of-service']

type PropertyOption = { _id: Id<'properties'>; name: string }

export default function Tables({
  propertyId,
  properties,
  onPropertyChange,
}: {
  propertyId: Id<'properties'> | ''
  properties: PropertyOption[]
  onPropertyChange: (id: string) => void
}) {
  const { hasGranularPermission } = usePermissions()
  const canUpdate = hasGranularPermission('restaurant.update')
  const [statusPicker, setStatusPicker] = useState<{
    tableId: Id<'restaurantTables'>
    current: TableStatus
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const tables = useQuery(
    api.restaurantTables.listTables,
    propertyId ? { propertyId, isActive: true } : 'skip',
  )
  const setStatus = useMutation(api.restaurantTables.setStatus)

  const handleSetStatus = async (status: TableStatus) => {
    if (!statusPicker) return
    setBusy(true)
    try {
      const response = await setStatus({
        tableId: statusPicker.tableId,
        status,
      })
      if (response.success) {
        toast.success(response.message)
        setStatusPicker(null)
      } else toast.error(response.message)
    } catch (error) {
      console.log(`Failed to update table status! ${error}`)
      toast.error('Failed to update table status')
    } finally {
      setBusy(false)
    }
  }

  if (tables === undefined && propertyId) {
    return <p className="p-4">Loading</p>
  }

  const rows = tables?.data ?? []

  return (
    <div className="w-full h-full">
      <div className="flex flex-wrap gap-3 mb-4 items-end py-2">
        <label className="flex flex-col text-sm">
          Property
          <select
            className="border rounded px-2 mt-2"
            value={propertyId}
            onChange={(event) => onPropertyChange(event.target.value)}
          >
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-600">
        {(Object.keys(statusLabel) as TableStatus[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded border ${statusStyles[status]}`} />
            {statusLabel[status]}
          </span>
        ))}
      </div>

      {rows.length === 0 && <p className="text-sm text-gray-500">No tables yet. Create one to get started.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rows.map((table) => (
          <div
            key={table._id}
            className={`rounded-md border-2 p-4 text-left ${statusStyles[table.status as TableStatus]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="text-left"
                disabled={!canUpdate}
                onClick={() =>
                  setStatusPicker({
                    tableId: table._id,
                    current: table.status as TableStatus,
                  })
                }
              >
                <div className="text-2xl font-bold text-gray-900">{table.tableNumber}</div>
                <div className="text-sm text-gray-700 mt-1">{table.section || '—'}</div>
                <div className="text-xs text-gray-600 mt-2">
                  {table.capacity} seats · {statusLabel[table.status as TableStatus]}
                </div>
              </button>
              {canUpdate && (
                <a
                  href={`/admin/restaurant/tables/edit?table_id=${table._id}`}
                  className="!no-underline !text-amber-400"
                >
                  <MdEditDocument />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <BootstrapModal
        show={Boolean(statusPicker)}
        onHide={() => setStatusPicker(null)}
        backdrop="static"
        keyboard={false}
        heading="Set table status"
        body={
          statusPicker ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">Current: {statusLabel[statusPicker.current]}</p>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {STATUS_CYCLE.map((status) => (
                  <Button
                    key={status}
                    variant={status === statusPicker.current ? 'dark' : 'outline-secondary'}
                    disabled={busy}
                    onClick={() => void handleSetStatus(status)}
                  >
                    {statusLabel[status]}
                  </Button>
                ))}
              </div>
            </div>
          ) : null
        }
      />
    </div>
  )
}
