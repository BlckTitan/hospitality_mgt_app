'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { FcDocument } from 'react-icons/fc'
import { Button } from '../../../../../shared/button'
import BootstrapModal from '../../../../../shared/modal'
import Pagination from '../../../../../shared/ui-pagination'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import Link from 'next/link'
import { formatPropertyMoney, usePropertyCurrency } from '../../../inventory-management/components/money'
import { usePermissions } from '../../../../../hooks/usePermissions'

type StatusFilter = 'all' | 'open' | 'open_tab' | 'settled' | 'voided'
type TypeFilter = 'all' | 'dine_in' | 'takeout' | 'room_service'
type TenderMethod = 'cash' | 'card' | 'room_charge' | 'other'

const PAGE_SIZE = 10

const statusClass: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  open_tab: 'bg-sky-100 text-sky-800',
  settled: 'bg-green-100 text-green-800',
  voided: 'bg-gray-100 text-gray-600',
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine in',
  takeout: 'Takeout',
  room_service: 'Room service',
}

export default function Orders() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)
  const { hasGranularPermission } = usePermissions()
  const canUpdate = hasGranularPermission('restaurant.update')

  const [status, setStatus] = useState<StatusFilter>('all')
  const [orderType, setOrderType] = useState<TypeFilter>('all')
  const [checkInput, setCheckInput] = useState('')
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null)
  const [payOrderId, setPayOrderId] = useState<Id<'restaurantOrders'> | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<TenderMethod>('cash')
  const [busy, setBusy] = useState(false)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null])
  const [currentPage, setCurrentPage] = useState(1)

  const backfillCheckSuffix = useMutation(api.restaurantOrders.backfillOrderCheckSuffix)

  useEffect(() => {
    if (!currentPropertyId) return
    let cancelled = false
    const run = async () => {
      let cursor: string | null = null
      try {
        for (let page = 0; page < 100; page += 1) {
          const result = await backfillCheckSuffix({
            propertyId: currentPropertyId,
            cursor,
          })
          if (cancelled || result.done) return
          cursor = result.continueCursor
        }
      } catch {
        // Newer checks are indexed on open. A failed backfill only delays lookup of older ones.
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [currentPropertyId, backfillCheckSuffix])

  const listCursor = currentPage === 1 ? null : (cursorHistory[currentPage - 1] ?? null)
  const orders = useQuery(
    api.restaurantOrders.listOrders,
    currentPropertyId && !activeCheckId
      ? {
          propertyId: currentPropertyId,
          cursor: listCursor,
          limit: PAGE_SIZE,
          ...(status === 'all' ? {} : { status }),
          ...(orderType === 'all' ? {} : { orderType }),
        }
      : 'skip',
  )
  const found = useQuery(
    api.restaurantOrders.findOrdersByCheckId,
    currentPropertyId && activeCheckId
      ? {
          propertyId: currentPropertyId,
          checkId: activeCheckId,
          ...(status === 'all' ? {} : { status }),
          ...(orderType === 'all' ? {} : { orderType }),
        }
      : 'skip',
  )
  const payDownTab = useMutation(api.restaurantOrders.payDownTab)

  useEffect(() => {
    if (activeCheckId || !orders) return
    setCursorHistory((prev) => {
      const knownPages = prev.slice(0, currentPage)
      if (orders.isDone || !orders.continueCursor) return knownPages
      if (knownPages[currentPage] === orders.continueCursor) return prev
      return [...knownPages, orders.continueCursor]
    })
  }, [orders, currentPage, activeCheckId])

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="p-4 text-xl">No properties yet!</p>

  const money = (n: number) => formatPropertyMoney(n, currency)
  const searching = Boolean(activeCheckId)
  const searchRows = found?.data ?? []
  const searchPageCount = Math.ceil(searchRows.length / PAGE_SIZE)
  const rows = searching
    ? searchRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : (orders?.page ?? [])
  const listLoading = !searching && orders === undefined
  const searchLoading = searching && found === undefined
  const searchMessage = searching ? found?.message : undefined
  const hasNextPage =
    !searching &&
    orders !== undefined &&
    !orders.isDone &&
    Boolean(orders.continueCursor) &&
    cursorHistory.length > currentPage
  const pageCount = searching ? searchPageCount : cursorHistory.length
  const showPager = searching ? searchRows.length > 0 : rows.length > 0 || currentPage > 1

  const resetPages = () => {
    setCursorHistory([null])
    setCurrentPage(1)
  }

  const handleFind = (event?: FormEvent) => {
    event?.preventDefault()
    const next = checkInput.trim()
    resetPages()
    if (!next) {
      setActiveCheckId(null)
      return
    }
    setActiveCheckId(next)
  }

  const handlePayDown = async () => {
    if (!payOrderId) return
    const amount = Number(payAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setBusy(true)
    try {
      const response = await payDownTab({
        orderId: payOrderId,
        tenders: [{ paymentMethod: payMethod, amount }],
      })
      if (response.success) {
        toast.success(response.message)
        setPayOrderId(null)
        setPayAmount('')
      } else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Pay down failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-wrap gap-3 mb-4 items-end py-2">
        <label className="flex flex-col text-sm">
          Property
          <select
            className="border rounded px-2 mt-2"
            value={currentPropertyId}
            onChange={(event) => {
              setPropertyId(event.target.value)
              setPayOrderId(null)
              setCheckInput('')
              setActiveCheckId(null)
              resetPages()
            }}
          >
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Status
          <select
            className="border rounded px-2 mt-2"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter)
              resetPages()
            }}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="open_tab">Open tab</option>
            <option value="settled">Settled</option>
            <option value="voided">Voided</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Type
          <select
            className="border rounded px-2 mt-2"
            value={orderType}
            onChange={(event) => {
              setOrderType(event.target.value as TypeFilter)
              resetPages()
            }}
          >
            <option value="all">All</option>
            <option value="dine_in">Dine in</option>
            <option value="takeout">Takeout</option>
            <option value="room_service">Room service</option>
          </select>
        </label>
        <form className="flex flex-wrap items-end gap-2 text-sm" onSubmit={handleFind}>
          <label className="flex flex-col">
            Check ID
            <input
              className="border rounded px-2 mt-2"
              value={checkInput}
              placeholder="Last 6 or full ID"
              onChange={(event) => setCheckInput(event.target.value)}
            />
          </label>
          <Button type="submit" size="sm" variant="dark">
            Find check
          </Button>
          {searching && (
            <Button
              type="button"
              size="sm"
              variant="outline-secondary"
              onClick={() => {
                setCheckInput('')
                setActiveCheckId(null)
                resetPages()
              }}
            >
              Clear
            </Button>
          )}
        </form>
        <Link href="/admin/restaurant/pos" className="text-sm underline ms-auto">
          Open POS
        </Link>
      </div>

      {searching && (
        <p className="text-sm text-gray-600 mb-3">
          {searchMessage || 'Matches are not limited to the current page.'}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Order</th>
              <th className="p-2">Opened</th>
              <th className="p-2">Type</th>
              <th className="p-2">Waiter</th>
              <th className="p-2">Table / room</th>
              <th className="p-2">Status</th>
              <th className="p-2">Total</th>
              <th className="p-2">Due</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {(listLoading || searchLoading) && (
              <tr>
                <td className="p-3" colSpan={9}>
                  Loading
                </td>
              </tr>
            )}
            {!listLoading && !searchLoading && rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={9}>
                  {searching ? searchMessage || 'No check found for that ID.' : 'No orders found.'}
                </td>
              </tr>
            )}
            {rows.map((order) => (
              <tr key={order._id} className="border-t">
                <td className="p-2">#{order.checkSuffix || String(order._id).slice(-6)}</td>
                <td className="p-2 whitespace-nowrap">{order.openedAtDateKey}</td>
                <td className="p-2">{ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</td>
                <td className="p-2">{order.waiterName || '—'}</td>
                <td className="p-2">
                  {order.table?.tableNumber
                    ? `Table ${order.table.tableNumber}`
                    : order.roomLabel
                      ? `Room ${order.roomLabel}`
                      : order.guestLabel || '—'}
                </td>
                <td className="p-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusClass[order.status]}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-2">{money(order.totalAmount)}</td>
                <td className="p-2">{money(order.balanceDue)}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <a href={`/admin/restaurant/orders/view?order_id=${order._id}`} className="!no-underline">
                      <FcDocument />
                    </a>
                    {order.status === 'open' && (
                      <Link href="/admin/restaurant/pos" className="text-xs underline">
                        Continue
                      </Link>
                    )}
                    {canUpdate && order.status === 'open_tab' && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          setPayOrderId(order._id)
                          setPayAmount(String(order.balanceDue))
                        }}
                      >
                        Pay down
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPager && (
        <div className="mt-4">
          <Pagination>
            <Pagination.Prev
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            />
            {Array.from({ length: pageCount }, (_, index) => (
              <Pagination.Item
                key={index}
                active={currentPage === index + 1}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => {
                const canGoNext = searching ? currentPage < searchPageCount : hasNextPage
                if (canGoNext) setCurrentPage((page) => page + 1)
              }}
              disabled={searching ? currentPage >= searchPageCount : !hasNextPage}
            />
          </Pagination>
        </div>
      )}

      <BootstrapModal
        show={Boolean(payOrderId)}
        onHide={() => setPayOrderId(null)}
        backdrop="static"
        keyboard={false}
        heading="Pay down open tab"
        body={
          <div className="space-y-3">
            <label className="flex flex-col text-sm">
              Method
              <select
                className="border rounded px-2 mt-2"
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value as TenderMethod)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="room_charge">Room charge</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              Amount
              <input
                type="number"
                min={0}
                step="0.01"
                className="border rounded px-2 mt-2"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="dark" disabled={busy} onClick={() => void handlePayDown()}>
                Pay
              </Button>
            </div>
          </div>
        }
      />
    </div>
  )
}
