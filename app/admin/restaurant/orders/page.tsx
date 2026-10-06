'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { BackLink } from '../../../../shared/pageHeader'
import { Button } from '../../../../shared/button'
import Pagination from '../../../../shared/ui-pagination'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../inventory-management/components/money'
import { RestaurantPageGuide } from '../components/restaurantPageGuide'

type StatusFilter = 'all' | 'open' | 'open_tab' | 'settled' | 'voided'
type TypeFilter = 'all' | 'dine_in' | 'takeout' | 'room_service'
type TenderMethod = 'cash' | 'card' | 'room_charge' | 'other'

const PAGE_SIZE = 10
const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm'

const statusClass: Record<string, string> = {
  open: 'bg-amber-50 text-amber-800',
  open_tab: 'bg-sky-50 text-sky-800',
  settled: 'bg-green-50 text-green-800',
  voided: 'bg-gray-100 text-gray-600',
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine in',
  takeout: 'Takeout',
  room_service: 'Room service',
}

export default function RestaurantOrdersPage() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)

  const [status, setStatus] = useState<StatusFilter>('all')
  const [orderType, setOrderType] = useState<TypeFilter>('all')
  const [detailOrderId, setDetailOrderId] = useState<Id<'restaurantOrders'> | null>(null)
  const [payOrderId, setPayOrderId] = useState<Id<'restaurantOrders'> | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<TenderMethod>('cash')
  const [busy, setBusy] = useState(false)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null])
  const [currentPage, setCurrentPage] = useState(1)

  const listCursor = currentPage === 1 ? null : (cursorHistory[currentPage - 1] ?? null)
  const orders = useQuery(
    api.restaurantOrders.listOrders,
    currentPropertyId
      ? {
          propertyId: currentPropertyId,
          cursor: listCursor,
          limit: PAGE_SIZE,
          ...(status === 'all' ? {} : { status }),
          ...(orderType === 'all' ? {} : { orderType }),
        }
      : 'skip',
  )
  const detail = useQuery(
    api.restaurantOrders.getOrder,
    detailOrderId ? { orderId: detailOrderId } : 'skip',
  )
  const payDownTab = useMutation(api.restaurantOrders.payDownTab)

  useEffect(() => {
    if (!orders) return
    setCursorHistory((prev) => {
      const knownPages = prev.slice(0, currentPage)
      if (orders.isDone || !orders.continueCursor) return knownPages
      if (knownPages[currentPage] === orders.continueCursor) return prev
      return [...knownPages, orders.continueCursor]
    })
  }, [orders, currentPage])

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="p-4 text-xl">No properties yet!</p>

  const money = (n: number) => formatPropertyMoney(n, currency)
  const rows = orders?.page ?? []
  const hasNextPage =
    orders !== undefined &&
    !orders.isDone &&
    Boolean(orders.continueCursor) &&
    cursorHistory.length > currentPage
  const pageCount = cursorHistory.length
  const showPager = rows.length > 0 || currentPage > 1

  const resetPages = () => {
    setCursorHistory([null])
    setCurrentPage(1)
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

  const detailData = detail?.success ? detail.data : null

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant orders</h1>
          <RestaurantPageGuide page="orders" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/restaurant/pos" className="text-sm text-blue-600 hover:underline">
            Open POS
          </Link>
          <BackLink />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Property
          <select
            className={selectClassName + ' mt-1 min-w-[12rem]'}
            value={currentPropertyId}
            onChange={(e) => {
              setPropertyId(e.target.value)
              setDetailOrderId(null)
              setPayOrderId(null)
              resetPages()
            }}
          >
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Status
          <select
            className={selectClassName + ' mt-1 min-w-[8rem]'}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter)
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
        <label className="text-sm">
          Type
          <select
            className={selectClassName + ' mt-1 min-w-[8rem]'}
            value={orderType}
            onChange={(e) => {
              setOrderType(e.target.value as TypeFilter)
              resetPages()
            }}
          >
            <option value="all">All</option>
            <option value="dine_in">Dine in</option>
            <option value="takeout">Takeout</option>
            <option value="room_service">Room service</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Table / room</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th className="px-3 py-2 font-medium text-right">Due</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {orders === undefined && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {orders !== undefined && rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  No orders found.
                </td>
              </tr>
            )}
            {rows.map((order) => (
              <tr key={order._id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">
                  #{order.checkSuffix || String(order._id).slice(-6)}
                </td>
                <td className="px-3 py-2">
                  {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
                </td>
                <td className="px-3 py-2">
                  {order.table?.tableNumber
                    ? `Table ${order.table.tableNumber}`
                    : order.roomLabel
                      ? `Room ${order.roomLabel}`
                      : order.guestLabel || '—'}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs ${statusClass[order.status]}`}
                  >
                    {order.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-medium">{money(order.totalAmount)}</td>
                <td className="px-3 py-2 text-right">{money(order.balanceDue)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs text-blue-600 underline me-2"
                    onClick={() => setDetailOrderId(order._id)}
                  >
                    View
                  </button>
                  {order.status === 'open_tab' && (
                    <Button
                      variant="light"
                      className="text-xs"
                      onClick={() => {
                        setPayOrderId(order._id)
                        setPayAmount(String(order.balanceDue))
                      }}
                    >
                      Pay down
                    </Button>
                  )}
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
                if (hasNextPage) setCurrentPage((page) => page + 1)
              }}
              disabled={!hasNextPage}
            />
          </Pagination>
        </div>
      )}

      {detailOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-md bg-white p-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold">
                Check #{detailData?.checkSuffix || String(detailOrderId).slice(-6)}
              </h2>
              <Button variant="light" size="sm" onClick={() => setDetailOrderId(null)}>
                Close
              </Button>
            </div>
            {detail === undefined && <p className="text-sm text-gray-500">Loading…</p>}
            {detailData && (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {ORDER_TYPE_LABELS[detailData.orderType] ?? detailData.orderType}
                  {' · '}
                  {detailData.status.replace('_', ' ')}
                  {detailData.serverName ? ` · ${detailData.serverName}` : ''}
                  {detailData.table?.tableNumber
                    ? ` · Table ${detailData.table.tableNumber}`
                    : ''}
                  {detailData.roomLabel ? ` · Room ${detailData.roomLabel}` : ''}
                </p>
                <ul className="space-y-2 mb-4 text-sm">
                  {detailData.lines
                    .filter((line) => line.lineStatus === 'active')
                    .map((line) => (
                      <li key={line._id} className="flex justify-between border-b pb-1">
                        <span>
                          {line.quantity}× {line.nameSnapshot}
                        </span>
                        <span>{money(line.lineTotal)}</span>
                      </li>
                    ))}
                </ul>
                <div className="text-sm space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>{money(detailData.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span>{money(detailData.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Due</span>
                    <span>{money(detailData.balanceDue)}</span>
                  </div>
                </div>
                {(detailData.payments?.length ?? 0) > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Payments</p>
                    <ul className="space-y-1">
                      {detailData.payments.map((payment) => (
                        <li key={payment._id} className="flex justify-between text-gray-600">
                          <span>{payment.paymentMethod}</span>
                          <span>{money(payment.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {payOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-md bg-white p-4 shadow-lg space-y-3">
            <h2 className="text-lg font-semibold">Pay down open tab</h2>
            <label className="block text-sm">
              Method
              <select
                className={selectClassName + ' mt-1'}
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as TenderMethod)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="room_charge">Room charge</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-sm">
              Amount
              <input
                type="number"
                min={0}
                step="0.01"
                className={selectClassName + ' mt-1'}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="light" onClick={() => setPayOrderId(null)}>
                Cancel
              </Button>
              <Button variant="dark" disabled={busy} onClick={() => void handlePayDown()}>
                Pay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
