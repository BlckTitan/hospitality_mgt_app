'use client'

import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from '../../../../../shared/button'
import ImageThumbnail from '../../../../../shared/imageThumbnail'
import { toast } from 'sonner'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../../inventory-management/components/money'
import { useCanSelectProperty } from '../../../../../hooks/useCanSelectProperty'

type OrderMode = 'bar' | 'room_service'
type TenderMethod = 'cash' | 'card' | 'room_charge' | 'other'

const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
const tenderInputClassName = 'w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right'

const TENDERS: Array<[TenderMethod, string]> = [
  ['cash', 'Cash'],
  ['card', 'Card (record)'],
  ['room_charge', 'Room charge'],
  ['other', 'Other'],
]

export default function PosTerminal() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const canSelectProperty = useCanSelectProperty()
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)

  const [mode, setMode] = useState<OrderMode>('bar')
  const [reservationId, setReservationId] = useState('')
  const [orderId, setOrderId] = useState<Id<'orders'> | null>(null)
  const [category, setCategory] = useState<string>('All')
  const [tenderMethod, setTenderMethod] = useState<TenderMethod>('cash')
  const [tenderAmount, setTenderAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [salesUserId, setSalesUserId] = useState('')
  const [saleBarId, setSaleBarId] = useState('')

  const isRoom = mode === 'room_service'

  const roster = useQuery(
    api.barSales.listOnShiftSellers,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )
  const adminSale = roster?.mode === 'admin'
  const rosterSellers = roster?.sellers ?? []
  const chosenSeller = roster?.mustChoose
    ? rosterSellers.find((seller) => seller.userId === salesUserId && seller.barId === saleBarId)
    : rosterSellers.length === 1
      ? rosterSellers[0]
      : undefined
  const beverages = useQuery(
    api.posOrders.listSellableBeverages,
    currentPropertyId && chosenSeller
      ? {
          propertyId: currentPropertyId,
          barId: chosenSeller.barId,
          salesUserId: chosenSeller.userId,
        }
      : 'skip',
  )
  const stays = useQuery(
    api.posOrders.listStayReservationsForPos,
    currentPropertyId && isRoom ? { propertyId: currentPropertyId } : 'skip',
  )
  const openOrders = useQuery(
    api.posOrders.listOpenOrders,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )
  const orderResponse = useQuery(
    api.posOrders.getOrder,
    orderId ? { orderId } : 'skip',
  )

  const createOrder = useMutation(api.posOrders.createOrder)
  const addLine = useMutation(api.posOrders.addLine)
  const voidLine = useMutation(api.posOrders.voidLine)
  const setRoomContext = useMutation(api.posOrders.setRoomContext)
  const settleOrder = useMutation(api.posOrders.settleOrder)
  const voidOrder = useMutation(api.posOrders.voidOrder)
  const markOpenTab = useMutation(api.posOrders.markOpenTab)

  const order = orderResponse?.success ? orderResponse.data : null
  const legacyCheck = Boolean(order && !order.barId && !order.shiftId)
  const canSell = Boolean(chosenSeller)
  const dutyMessage = !roster
    ? 'Loading'
    : chosenSeller
      ? `Selling at ${chosenSeller.barName} · ${chosenSeller.name}`
      : roster.message || (roster.mustChoose ? 'Choose the bar before selling.' : 'You are not linked to a bar.')
  const activeLines = (order?.lines ?? []).filter((line) => line.status === 'active')

  const categories = useMemo(() => {
    const set = new Set((beverages?.data ?? []).map((b) => b.category))
    return ['All', ...Array.from(set).sort()]
  }, [beverages?.data])

  const menu = useMemo(() => {
    const rows = beverages?.data ?? []
    if (category === 'All') return rows
    return rows.filter((b) => b.category === category)
  }, [beverages?.data, category])

  if (propertiesResponse === undefined) {
    return <p className="p-4">Loading</p>
  }
  if (properties.length === 0) {
    return <p className="text-xl">No properties yet!</p>
  }

  const money = (n: number) => formatPropertyMoney(n, currency)

  const switchMode = (next: OrderMode) => {
    setMode(next)
    setOrderId(null)
    setTenderAmount('')
    setTenderMethod(next === 'room_service' ? 'room_charge' : 'cash')
    if (next === 'bar') setReservationId('')
  }

  const ensureOrder = async (): Promise<Id<'orders'> | null> => {
    if (orderId) return orderId
    if (!currentPropertyId) return null
    if (!canSell) {
      toast.error(dutyMessage)
      return null
    }
    if (isRoom && !reservationId) {
      toast.error('Select a room / reservation first')
      return null
    }
    setBusy(true)
    try {
      const response = await createOrder({
        propertyId: currentPropertyId,
        orderType: mode,
        reservationId: reservationId
          ? (reservationId as Id<'reservations'>)
          : undefined,
        ...(chosenSeller
          ? { salesUserId: chosenSeller.userId, barId: chosenSeller.barId }
          : {}),
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

  const handleAddBeverage = async (beverageId: Id<'beverages'>) => {
    const id = await ensureOrder()
    if (!id) return
    setBusy(true)
    try {
      const response = await addLine({ orderId: id, beverageId })
      if (!response.success) toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to add item')
    } finally {
      setBusy(false)
    }
  }

  const handleLinkRoom = async () => {
    if (!orderId || !reservationId) {
      toast.error('Open a check and select a reservation')
      return
    }
    setBusy(true)
    try {
      const response = await setRoomContext({
        orderId,
        reservationId: reservationId as Id<'reservations'>,
      })
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to link room')
    } finally {
      setBusy(false)
    }
  }

  const handleSettle = async (asTab: boolean) => {
    if (!orderId || !order) return
    const due = order.balanceDue
    if (due <= 0) {
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
    if (tenderMethod === 'room_charge' && !order.reservationId && !reservationId) {
      toast.error('Link a reservation for room charge')
      return
    }
    if (tenderMethod === 'room_charge' && reservationId && !order.reservationId) {
      await handleLinkRoom()
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
      if (response.data?.status === 'settled') {
        setOrderId(null)
      }
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

  const handleNewCheck = () => {
    setOrderId(null)
    setTenderAmount('')
  }

  const resumeOrder = (id: Id<'orders'>, orderType: OrderMode) => {
    setMode(orderType)
    setTenderMethod(orderType === 'room_service' ? 'room_charge' : 'cash')
    setOrderId(id)
    setTenderAmount('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        {canSelectProperty && (
        <label className="text-sm">
          Property
          <select
            className={selectClassName + ' mt-1 min-w-[12rem]'}
            value={currentPropertyId}
            onChange={(e) => {
              setPropertyId(e.target.value)
              setOrderId(null)
              setReservationId('')
              setSalesUserId('')
              setSaleBarId('')
            }}
          >
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        )}
        <p className={`text-sm m-0 ${canSell ? 'text-gray-700' : 'text-amber-800'}`}>{dutyMessage}</p>
        {roster?.mustChoose && (
          <label className="text-sm">
            {adminSale ? 'Waiter' : 'Bar'}
            <select
              className={selectClassName + ' mt-1 min-w-[12rem]'}
              value={chosenSeller ? `${chosenSeller.userId}:${chosenSeller.barId}` : ''}
              onChange={(event) => {
                const [userId, barId] = event.target.value.split(':')
                setSalesUserId(userId || '')
                setSaleBarId(barId || '')
                setOrderId(null)
              }}
            >
              <option value="">{adminSale ? 'Choose the waiter' : 'Choose the bar'}</option>
              {roster.sellers.map((seller) => (
                <option key={`${seller.userId}:${seller.barId}`} value={`${seller.userId}:${seller.barId}`}>
                  {adminSale ? `${seller.name} · ${seller.barName}` : seller.barName}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === 'bar' ? 'dark' : 'outline-secondary'}
            onClick={() => switchMode('bar')}
          >
            Bar
          </Button>
          <Button
            size="sm"
            variant={mode === 'room_service' ? 'dark' : 'outline-secondary'}
            onClick={() => switchMode('room_service')}
          >
            Room service
          </Button>
        </div>
        <Link href="/admin/bar-management/pos/orders" className="text-sm underline ms-auto">
          Orders list
        </Link>
      </div>

      {isRoom && (
        <div className="flex flex-wrap gap-2 items-end border rounded-md p-3 bg-gray-50">
          <label className="text-sm flex-1 min-w-[16rem]">
            Room / guest (required)
            <select
              className={selectClassName + ' mt-1'}
              value={reservationId}
              onChange={(e) => setReservationId(e.target.value)}
            >
              <option value="">Select room / guest</option>
              {(stays?.data ?? []).map((s) => (
                <option key={s._id} value={s._id}>
                  Room {s.roomNumber} · {s.guestName} · {s.confirmationNumber}
                </option>
              ))}
            </select>
          </label>
          {orderId && reservationId && (
            <Button size="sm" variant="outline-dark" disabled={busy} onClick={() => void handleLinkRoom()}>
              Link to check
            </Button>
          )}
        </div>
      )}

      {(openOrders?.data?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600 font-medium">Open checks</span>
          {(openOrders?.data ?? []).slice(0, 12).map((row) => (
            <Button
              key={row._id}
              size="sm"
              variant={orderId === row._id ? 'dark' : 'outline-secondary'}
              className="h-auto min-h-8 max-w-full whitespace-normal break-words px-3 py-1 text-left leading-snug"
              onClick={() =>
                resumeOrder(
                  row._id,
                  row.orderType === 'room_service' ? 'room_service' : 'bar',
                )
              }
            >
              #{String(row._id).slice(-6)}
              {row.barName ? ` · ${row.barName}` : row.orderType === 'room_service' ? ' · room' : ' · bar'}
              {row.waiterName ? ` · ${row.waiterName}` : ''}
              {row.roomLabel ? ` · R${row.roomLabel}` : ''}
              {row.status === 'open_tab' ? ' · tab' : ''}
              {' · '}
              {money(row.balanceDue)}
            </Button>
          ))}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-5">
        <section className="@container min-w-0 border rounded-md p-3 lg:col-span-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={category === c ? 'dark' : 'outline-secondary'}
                onClick={() => setCategory(c)}
                className="h-auto min-h-8 max-w-full whitespace-normal break-words px-3 py-1 text-left leading-snug"
              >
                {c}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 @min-[18rem]:grid-cols-2 @min-[40rem]:grid-cols-3">
            {beverages === undefined ? (
              <p className="text-sm text-gray-500 col-span-full">Loading drinks…</p>
            ) : (
              menu.map((item) => (
                <div key={item._id} className="@container/drink min-w-0">
                  <button
                    type="button"
                    title={`${item.name} · ${item.category}`}
                    disabled={busy || !canSell || item.availableQty <= 0 || (isRoom && !reservationId && !orderId)}
                    onClick={() => void handleAddBeverage(item._id)}
                    className="flex h-full w-full min-w-0 flex-col items-start gap-2 overflow-hidden rounded-md border p-2 text-left hover:bg-gray-50 disabled:opacity-50 @min-[11rem]/drink:flex-row @min-[11rem]/drink:items-center"
                  >
                    <ImageThumbnail
                      src={item.imageUrl}
                      alt={item.name}
                      size={48}
                      className="shrink-0"
                    />
                    <div className="w-full min-w-0 flex-1">
                      <div className="line-clamp-2 break-words text-sm font-medium leading-snug">{item.name}</div>
                      <div className="truncate text-xs text-gray-500">{item.category}</div>
                      <div className="mt-1 break-words text-sm">{money(item.unitPrice)}</div>
                      <div className="break-words text-xs text-gray-600">{item.availableQty} in stock</div>
                    </div>
                  </button>
                </div>
              ))
            )}
            {beverages && menu.length === 0 && (
              <p className="text-sm text-gray-500 col-span-full">
                {beverages.message ??
                  (canSell
                    ? 'Nothing left in your stock at this bar.'
                    : dutyMessage)}
              </p>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3 self-start rounded-md border p-3 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="m-0 min-w-0 truncate text-base font-semibold">
              {orderId ? `Check ${String(orderId).slice(-6)}` : 'New check'}
            </h4>
            <div className="flex gap-2">
              <Button size="sm" variant="outline-secondary" onClick={handleNewCheck}>
                New
              </Button>
              {orderId && order?.status === 'open' && (
                <Button size="sm" variant="outline-danger" disabled={busy || (!canSell && !legacyCheck)} onClick={() => void handleVoidOrder()}>
                  Void
                </Button>
              )}
            </div>
          </div>
          <p className="m-0 break-words text-xs text-gray-500">
            {isRoom ? 'Room service' : order?.barName || chosenSeller?.barName || 'Bar'}
            {(order?.waiterName || chosenSeller?.name)
              ? ` · ${order?.waiterName || chosenSeller?.name}`
              : ''}
            {order?.roomLabel ? ` · Room ${order.roomLabel}` : ''}
            {order?.guestName ? ` · ${order.guestName}` : ''}
            {order?.status ? ` · ${order.status}` : ''}
          </p>

          <ul className="space-y-2 min-h-[8rem]">
            {activeLines.map((line) => (
              <li key={line._id} className="flex items-start justify-between gap-2 border-b pb-1 text-sm">
                <span className="min-w-0 break-words">
                  {line.quantity}× {line.nameSnapshot}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {money(line.lineTotal)}
                  {order?.status === 'open' && (
                    <button
                      type="button"
                      className="text-xs text-red-600 underline"
                      disabled={busy}
                      onClick={() =>
                        void voidLine({ orderLineId: line._id }).then((r) => {
                          if (!r.success) toast.error(r.message)
                        })
                      }
                    >
                      Void
                    </button>
                  )}
                </span>
              </li>
            ))}
            {activeLines.length === 0 && (
              <li className="text-sm text-gray-500">
                {isRoom && !reservationId
                  ? 'Select a room, then tap menu items.'
                  : 'Tap menu items to add lines.'}
              </li>
            )}
          </ul>

          <div className="space-y-1 text-sm">
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
                  if (order && tenderAmount === '') {
                    setTenderAmount(String(order.balanceDue))
                  }
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
              onChange={(e) => setTenderAmount(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="outline-dark"
              disabled={busy || !orderId || (!canSell && !legacyCheck)}
              onClick={() => void handleSettle(true)}
            >
              Open tab
            </Button>
            <Button
              variant="dark"
              disabled={busy || !orderId || (!canSell && !legacyCheck)}
              onClick={() => void handleSettle(false)}
            >
              Settle
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
