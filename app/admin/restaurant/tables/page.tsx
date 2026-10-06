'use client'

import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { FcPlus } from 'react-icons/fc'
import { BackLink } from '../../../../shared/pageHeader'
import { Button } from '../../../../shared/button'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { RestaurantPageGuide } from '../components/restaurantPageGuide'

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

const STATUS_CYCLE: TableStatus[] = [
  'available',
  'occupied',
  'reserved',
  'out-of-service',
]

export default function TablesPage() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''

  const [modalOpen, setModalOpen] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [section, setSection] = useState('')
  const [statusPicker, setStatusPicker] = useState<{
    tableId: Id<'restaurantTables'>
    current: TableStatus
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const tables = useQuery(
    api.restaurantTables.listTables,
    currentPropertyId ? { propertyId: currentPropertyId, isActive: true } : 'skip',
  )
  const createTable = useMutation(api.restaurantTables.createTable)
  const setStatus = useMutation(api.restaurantTables.setStatus)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPropertyId) return
    const cap = Number(capacity)
    if (!tableNumber.trim() || !Number.isFinite(cap) || cap <= 0) {
      toast.error('Enter table number and capacity > 0')
      return
    }
    setBusy(true)
    try {
      const response = await createTable({
        propertyId: currentPropertyId,
        tableNumber: tableNumber.trim(),
        capacity: cap,
        section: section.trim() || undefined,
      })
      if (response.success) {
        toast.success(response.message)
        setModalOpen(false)
        setTableNumber('')
        setCapacity('4')
        setSection('')
      } else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Status update failed')
    } finally {
      setBusy(false)
    }
  }

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="p-4 text-xl">No properties yet!</p>

  const rows = tables?.data ?? []

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Tables</h1>
          <RestaurantPageGuide page="tables" />
        </div>
        <div className="flex items-center gap-3">
          <BackLink />
          <Button variant="light" className="cursor-pointer" circle onClick={() => setModalOpen(true)}>
            <FcPlus className="w-8 h-8" />
          </Button>
        </div>
      </header>

      <div className="mb-4">
        <label className="text-sm">
          Property
          <select
            className="block mt-1 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={currentPropertyId}
            onChange={(e) => setPropertyId(e.target.value)}
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

      {tables === undefined && <p className="text-sm text-gray-500">Loading tables…</p>}
      {tables !== undefined && rows.length === 0 && (
        <p className="text-sm text-gray-500">No tables yet. Create one to get started.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rows.map((table) => (
          <button
            key={table._id}
            type="button"
            onClick={() =>
              setStatusPicker({
                tableId: table._id,
                current: table.status as TableStatus,
              })
            }
            className={`rounded-md border-2 p-4 text-left transition-colors ${
              statusStyles[table.status as TableStatus]
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{table.tableNumber}</div>
            <div className="text-sm text-gray-700 mt-1">{table.section || '—'}</div>
            <div className="text-xs text-gray-600 mt-2">
              {table.capacity} seats · {statusLabel[table.status as TableStatus]}
            </div>
          </button>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="w-full max-w-md rounded-md bg-white p-4 shadow-lg space-y-3"
          >
            <h2 className="text-lg font-semibold">Create table</h2>
            <label className="block text-sm">
              Table number
              <input
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Capacity
              <input
                type="number"
                min={1}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Section (optional)
              <input
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="light" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="dark" disabled={busy}>
                Create
              </Button>
            </div>
          </form>
        </div>
      )}

      {statusPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-md bg-white p-4 shadow-lg">
            <h2 className="text-lg font-semibold mb-3">Set table status</h2>
            <p className="text-sm text-gray-600 mb-3">
              Current: {statusLabel[statusPicker.current]}
            </p>
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
            <Button variant="light" className="w-full" onClick={() => setStatusPicker(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
