'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { FcPlus } from 'react-icons/fc'
import { BackLink } from '../../../../shared/pageHeader'
import { Button } from '../../../../shared/button'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../inventory-management/components/money'
import { RestaurantPageGuide } from '../components/restaurantPageGuide'

type Station = 'kitchen' | 'grill' | 'other'

const stationClass: Record<Station, string> = {
  kitchen: 'bg-sky-50 text-sky-800',
  grill: 'bg-orange-50 text-orange-800',
  other: 'bg-gray-100 text-gray-700',
}

const emptyForm = {
  name: '',
  category: '',
  station: 'kitchen' as Station,
  price: '',
  isAvailable: true,
}

type MenuItemRow = {
  _id: Id<'restaurantMenuItems'>
  name: string
  category: string
  station: Station
  price: number
  cost?: number
  isAvailable: boolean
  isActive: boolean
}

export default function MenuItemsPage() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)

  const [station, setStation] = useState<string>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItemRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)

  const list = useQuery(
    api.restaurantMenuItems.listMenuItems,
    currentPropertyId
      ? {
          propertyId: currentPropertyId,
          ...(station === 'All' ? {} : { station: station as Station }),
          isActive: true,
        }
      : 'skip',
  )

  const createMenuItem = useMutation(api.restaurantMenuItems.createMenuItem)
  const updateMenuItem = useMutation(api.restaurantMenuItems.updateMenuItem)
  const deactivateMenuItem = useMutation(api.restaurantMenuItems.deactivateMenuItem)

  const rows = useMemo(() => (list?.data ?? []) as MenuItemRow[], [list?.data])
  const money = (n: number) => formatPropertyMoney(n, currency)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: MenuItemRow) => {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category,
      station: item.station,
      price: String(item.price),
      isAvailable: item.isAvailable,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPropertyId) return
    const price = Number(form.price)
    if (!form.name.trim() || !form.category.trim()) {
      toast.error('Name and category are required')
      return
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price')
      return
    }
    setBusy(true)
    try {
      if (editing) {
        const response = await updateMenuItem({
          menuItemId: editing._id,
          name: form.name,
          category: form.category,
          station: form.station,
          price,
          isAvailable: form.isAvailable,
        })
        if (!response.success) {
          toast.error(response.message)
          return
        }
        toast.success(response.message || 'Menu item updated')
      } else {
        const response = await createMenuItem({
          propertyId: currentPropertyId,
          name: form.name,
          category: form.category,
          station: form.station,
          price,
          isAvailable: form.isAvailable,
        })
        if (!response.success) {
          toast.error(response.message)
          return
        }
        toast.success(response.message || 'Menu item created')
      }
      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDeactivate = async (menuItemId: Id<'restaurantMenuItems'>) => {
    if (!confirm('Deactivate this menu item?')) return
    setBusy(true)
    try {
      const response = await deactivateMenuItem({ menuItemId })
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
      if (editing?._id === menuItemId) {
        setModalOpen(false)
        setEditing(null)
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Deactivate failed')
    } finally {
      setBusy(false)
    }
  }

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="p-4 text-xl">No properties yet!</p>

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Menu items</h1>
          <RestaurantPageGuide page="menu-items" />
        </div>
        <div className="flex items-center gap-3">
          <BackLink />
          <Button variant="light" className="cursor-pointer" circle onClick={openCreate}>
            <FcPlus className="w-8 h-8" />
          </Button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Property
          <select
            className="block mt-1 w-full min-w-[12rem] px-3 py-2 border border-gray-300 rounded-md text-sm"
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
        <div className="flex flex-wrap gap-2">
          {['All', 'kitchen', 'grill', 'other'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStation(s)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                station === s ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'
              }`}
            >
              {s === 'All' ? 'All stations' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Station</th>
              <th className="px-3 py-2 font-medium text-right">Price</th>
              <th className="px-3 py-2 font-medium text-right">Cost</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {list === undefined && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {list !== undefined && rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  No menu items yet.
                </td>
              </tr>
            )}
            {rows.map((item) => (
              <tr key={item._id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                <td className="px-3 py-2 text-gray-600">{item.category}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${stationClass[item.station]}`}
                  >
                    {item.station}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{money(item.price)}</td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {item.cost !== undefined ? money(item.cost) : '—'}
                </td>
                <td className="px-3 py-2">
                  {item.isAvailable ? (
                    <span className="text-green-700 text-xs font-medium">Available</span>
                  ) : (
                    <span className="text-red-600 text-xs font-medium">Unavailable</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs text-blue-600 underline me-2"
                    onClick={() => openEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-600 underline"
                    disabled={busy}
                    onClick={() => void handleDeactivate(item._id)}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="w-full max-w-md rounded-md bg-white p-4 shadow-lg"
          >
            <h2 className="text-lg font-semibold mb-4">
              {editing ? 'Edit menu item' : 'Add menu item'}
            </h2>
            <div className="space-y-3 mb-4">
              <label className="block text-sm">
                Name
                <input
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm">
                Category
                <input
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm">
                Station
                <select
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.station}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, station: e.target.value as Station }))
                  }
                >
                  <option value="kitchen">Kitchen</option>
                  <option value="grill">Grill</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm">
                Price
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                />
                Available on POS
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="light"
                disabled={busy}
                onClick={() => {
                  setModalOpen(false)
                  setEditing(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="dark" disabled={busy}>
                {editing ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
