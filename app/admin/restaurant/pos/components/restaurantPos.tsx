'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Button } from '../../../../../shared/button'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../../inventory-management/components/money'

type OrderType = 'dine_in' | 'takeout' | 'room_service'
type TenderMethod = 'cash' | 'card' | 'room_charge' | 'other'
type StationFilter = 'All' | 'kitchen' | 'grill' | 'other'

const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
const tenderInputClassName = 'w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right'

const TENDERS: Array<[TenderMethod, string]> = [
  ['cash', 'Cash'],
  ['card', 'Card (record)'],
  ['room_charge', 'Room charge'],
  ['other', 'Other'],
]

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: 'Dine in',
  takeout: 'Takeout',
  room_service: 'Room service',
}

export default function RestaurantPos() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)

  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [tableId, setTableId] = useState('')
  const [reservationId, setReservationId] = useState('')
  const [guestLabel, setGuestLabel] = useState('')
  const [orderId, setOrderId] = useState<Id<'restaurantOrders'> | null>(null)
  const [stationFilter, setStationFilter] = useState<StationFilter>('All')
  const [category, setCategory] = useState('All')
  const [tenderMethod, setTenderMethod] = useState<TenderMethod>('cash')
  const [tenderAmount, setTenderAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const menuItems = useQuery(
    api.restaurantOrders.listSellableMenuItems,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )
  const tables = useQuery(
    api.restaurantOrders.listTablesForPos,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )
  const stays = useQuery(
    api.restaurantOrders.listStayReservationsForRestaurant,
    currentPropertyId && orderType === 'room_service' ? { propertyId: currentPropertyId } : 'skip',
  )
  const openList = useQuery(
    api.restaurantOrders.listOrders,
    currentPropertyId ? { propertyId: currentPropertyId, status: 'open', limit: 20 } : 'skip',
  )
  const tabList = useQuery(
    api.restaurantOrders.listOrders,
    currentPropertyId ? { propertyId: currentPropertyId, status: 'open_tab', limit: 20 } : 'skip',
  )
  const orderResponse = useQuery(api.restaurantOrders.getOrder, orderId ? { orderId } : 'skip')

  const createOrder = useMutation(api.restaurantOrders.createOrder)
  const addLine = useMutation(api.restaurantOrders.addLine)
  const voidLine = useMutation(api.restaurantOrders.voidLine)
  const settleOrder = useMutation(api.restaurantOrders.settleOrder)
  const voidOrder = useMutation(api.restaurantOrders.voidOrder)
  const markOpenTab = useMutation(api.restaurantOrders.markOpenTab)

  const order = orderResponse?.success ? orderResponse.data : null
  const activeLines = (order?.lines ?? []).filter((line) => line.lineStatus === 'active')
  const openChecks = useMemo(
    () => [...(openList?.page ?? []), ...(tabList?.page ?? [])],
    [openList?.page, tabList?.page],
  )

  const categories = useMemo(() => {
    const set = new Set((menuItems?.data ?? []).map((item) => item.category))
    return ['All', ...Array.from(set).sort()]
  }, [menuItems?.data])

  const menu = useMemo(() => {
    let rows = menuItems?.data ?? []
    if (stationFilter !== 'All') rows = rows.filter((item) => item.station === stationFilter)
    if (category !== 'All') rows = rows.filter((item) => item.category === category)
    return rows
  }, [menuItems?.data, stationFilter, category])

  const availableTables = useMemo(
    () =>
      (tables?.data ?? []).filter(
        (t) => t.status !== 'out-of-service' && (!t.currentOrderId || t.currentOrderId === orderId),
      ),
    [tables?.data, orderId],
  )

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="p-4 text-xl">No properties yet!</p>

  const money = (n: number) => formatPropertyMoney(n, currency)

  const switchType = (next: OrderType) => {
    setOrderType(next)
    setOrderId(null)
    setTenderAmount('')
    setTenderMethod(next === 'room_service' ? 'room_charge' : 'cash')
    if (next !== 'dine_in') setTableId('')
    if (next !== 'room_service') setReservationId('')
  }

  const ensureOrder = async (): Promise<Id<'restaurantOrders'> | null> => {
    if (orderId) return orderId
    if (!currentPropertyId) return null
    if (orderType === 'dine_in' && !tableId) {
      toast.error('Select a table first')
      return null
    }
    if (orderType === 'room_service' && !reservationId) {
      toast.error('Select a room / reservation first')
      return null
    }
    setBusy(true)
    try {
      const response = await createOrder({
        propertyId: currentPropertyId,
        orderType,
        tableId: tableId ? (tableId as Id<'restaurantTables'>) : undefined,
        reservationId: reservationId ? (reservationId as Id<'reservations'>) : undefined,
        guestLabel: guestLabel.trim() || undefined,
      })
      if (!response.success || !response.data?.orderId) {
        toast.error(response.message || 'Could not open check')
        return null
      }
      setOrderId(response.data.orderId)
      return response.data.orderId
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not open check')
      return null
    } finally {
      setBusy(false)
    }
  }

  const handleAddItem = async (menuItemId: Id<'restaurantMenuItems'>) => {
    const id = await ensureOrder()
    if (!id) return
    setBusy(true)
    try {
      const response = await addLine({ orderId: id, menuItemId })
      if (!response.success) toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to add item')
    } finally {
      setBusy(false)
    }
  }

  const handleSettle = async (asTab: boolean) => {
    if (!orderId || !order) return
    const due = order.balanceDue
    if (due <= 0 && !asTab) {
      toast.error('Nothing due')
      return
    }

    if (asTab && (tenderAmount === '' || Number(tenderAmount) === 0)) {
      setBusy(true)
      try {
        const response = await markOpenTab({ orderId })
        if (response.success) {
          toast.success(response.message)
          setOrderId(null)
        } else toast.error(response.message)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Open tab failed')
      } finally {
        setBusy(false)
      }
      return
    }

    const amount = tenderAmount === '' ? due : Number(tenderAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid tender amount')
      return
    }
    if (asTab && amount >= due) {
      toast.error('For an open tab with payment, enter less than the balance due')
      return
    }
    if (tenderMethod === 'room_charge' && !order.reservationId) {
      toast.error('Link a reservation for room charge')
      return
    }
    setBusy(true)
    try {
      const response = await settleOrder({
        orderId,
        tenders: [{ paymentMethod: tenderMethod, amount }],
      })
      if (!response.success) {
        toast.error(response.message)
        return
      }
      toast.success(response.message)
      setTenderAmount('')
      if (response.data?.status === 'settled') setOrderId(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Settle failed')
    } finally {
      setBusy(false)
    }
  }

  const handleVoidOrder = async () => {
    if (!orderId) return
    setBusy(true)
    try {
      const response = await voidOrder({ orderId })
      if (response.success) {
        toast.success(response.message)
        setOrderId(null)
      } else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Void failed')
    } finally {
      setBusy(false)
    }
  }

  const resumeOrder = (id: Id<'restaurantOrders'>, type: OrderType) => {
    setOrderType(type)
    setTenderMethod(type === 'room_service' ? 'room_charge' : 'cash')
    setOrderId(id)
    setTenderAmount('')
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <label className="flex flex-col text-sm">
          Property
          <select
            className="border rounded px-2 mt-2"
            value={currentPropertyId}
            onChange={(event) => {
              setPropertyId(event.target.value)
              setOrderId(null)
              setTableId('')
              setReservationId('')
            }}
          >
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map((type) => (
            <Button
              key={type}
              size="sm"
              variant={orderType === type ? 'dark' : 'outline-secondary'}
              onClick={() => switchType(type)}
            >
              {ORDER_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      {orderType === 'dine_in' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
          <select
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={tableId}
            onChange={(event) => setTableId(event.target.value)}
            disabled={Boolean(orderId)}
          >
            <option value="">Select table</option>
            {availableTables.map((table) => (
              <option key={table._id} value={table._id}>
                Table {table.tableNumber}
                {table.section ? ` (${table.section})` : ''} · {table.status}
              </option>
            ))}
          </select>
        </div>
      )}

      {orderType === 'room_service' && (
        <div className="mb-4 flex flex-wrap gap-2 items-end border rounded-md p-3 bg-gray-50">
          <label className="text-sm flex-1 min-w-[16rem]">
            Room / guest
            <select
              className={selectClassName + ' mt-1'}
              value={reservationId}
              onChange={(event) => setReservationId(event.target.value)}
              disabled={Boolean(orderId)}
            >
              <option value="">Select room / guest</option>
              {(stays?.data ?? []).map((stay) => (
                <option key={stay._id} value={stay._id}>
                  Room {stay.roomNumber} · {stay.guestName} · {stay.confirmationNumber}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {orderType === 'takeout' && !orderId && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Guest label (optional)</label>
          <input
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={guestLabel}
            onChange={(event) => setGuestLabel(event.target.value)}
            placeholder="Name on check"
          />
        </div>
      )}

      {openChecks.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <span className="text-sm text-gray-600 font-medium">Open checks</span>
          {openChecks.slice(0, 12).map((row) => (
            <Button
              key={row._id}
              size="sm"
              variant={orderId === row._id ? 'dark' : 'outline-secondary'}
              onClick={() => resumeOrder(row._id, row.orderType as OrderType)}
            >
              #{row.checkSuffix || String(row._id).slice(-6)}
              {' · '}
              {ORDER_TYPE_LABELS[row.orderType as OrderType] ?? row.orderType}
              {row.table?.tableNumber ? ` · T${row.table.tableNumber}` : ''}
              {row.roomLabel ? ` · R${row.roomLabel}` : ''}
              {row.status === 'open_tab' ? ' · tab' : ''}
              {' · '}
              {money(row.balanceDue)}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['All', 'kitchen', 'grill', 'other'] as StationFilter[]).map((station) => (
              <button
                key={station}
                type="button"
                onClick={() => setStationFilter(station)}
                className={`px-3 py-1 text-xs rounded-md border ${
                  stationFilter === station ? 'border-gray-800 bg-gray-100' : 'border-gray-300'
                }`}
              >
                {station === 'All' ? 'All stations' : station}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={category === item ? 'dark' : 'outline-secondary'}
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {menu.map((item) => (
              <button
                key={item._id}
                type="button"
                disabled={busy || !currentPropertyId}
                onClick={() => void handleAddItem(item._id)}
                className="border border-gray-200 rounded-md p-3 text-left hover:border-gray-400 disabled:opacity-50"
              >
                <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                <div className="text-xs text-gray-500 capitalize mt-1">{item.station}</div>
                <div className="text-sm font-semibold mt-2">{money(item.price)}</div>
              </button>
            ))}
            {menu.length === 0 && <p className="text-sm text-gray-500 col-span-full">No sellable menu items.</p>}
          </div>
        </div>

        <div className="border border-gray-200 rounded-md p-4 flex flex-col min-h-[420px] gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 m-0">
              {orderId ? `Check #${order?.checkSuffix || String(orderId).slice(-6)}` : 'New check'}
            </h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => {
                  setOrderId(null)
                  setTenderAmount('')
                }}
              >
                New
              </Button>
              {orderId && order?.status === 'open' && (
                <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => void handleVoidOrder()}>
                  Void
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 m-0">
            {ORDER_TYPE_LABELS[orderType]}
            {order?.table?.tableNumber ? ` · Table ${order.table.tableNumber}` : ''}
            {order?.roomLabel ? ` · Room ${order.roomLabel}` : ''}
            {order?.guestName ? ` · ${order.guestName}` : ''}
            {order?.guestLabel ? ` · ${order.guestLabel}` : ''}
            {order?.status ? ` · ${order.status}` : ''}
          </p>

          <ul className="flex-1 space-y-2 min-h-[8rem]">
            {activeLines.map((line) => (
              <li key={line._id} className="flex justify-between gap-2 text-sm border-b border-gray-100 pb-2">
                <div>
                  <div className="font-medium">
                    {line.quantity}× {line.nameSnapshot}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{line.station}</div>
                </div>
                <span className="flex items-center gap-2">
                  {money(line.lineTotal)}
                  {order?.status === 'open' && (
                    <button
                      type="button"
                      className="text-xs text-red-600 underline"
                      disabled={busy}
                      onClick={() =>
                        void voidLine({ orderLineId: line._id }).then((result) => {
                          if (!result.success) toast.error(result.message)
                        })
                      }
                    >
                      Void
                    </button>
                  )}
                </span>
              </li>
            ))}
            {activeLines.length === 0 && <li className="text-sm text-gray-500">Tap menu items to add lines.</li>}
          </ul>

          <div className="space-y-1 text-sm border-t border-gray-200 pt-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(order?.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{money(order?.amountPaid ?? 0)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Due</span>
              <span>{money(order?.balanceDue ?? 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {TENDERS.map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={tenderMethod === id ? 'dark' : 'outline-secondary'}
                onClick={() => {
                  setTenderMethod(id)
                  if (order && tenderAmount === '') setTenderAmount(String(order.balanceDue))
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <label className="text-sm">
            Amount
            <input
              className={tenderInputClassName + ' mt-1'}
              type="number"
              min={0}
              step="0.01"
              value={tenderAmount}
              placeholder={order ? String(order.balanceDue) : '0'}
              onChange={(event) => setTenderAmount(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="outline-dark"
              disabled={busy || !orderId || order?.status !== 'open'}
              onClick={() => void handleSettle(true)}
            >
              Open tab
            </Button>
            <Button
              variant="dark"
              disabled={busy || !orderId || (order?.status !== 'open' && order?.status !== 'open_tab')}
              onClick={() => void handleSettle(false)}
            >
              Settle
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
