'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { FcDocument } from 'react-icons/fc'
import { Button } from '../../../../../shared/button'
import BootstrapModal from '../../../../../shared/modal'
import Pagination from '../../../../../shared/ui-pagination'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
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
    orders !== undefined && !orders.isDone && Boolean(orders.continueCursor) && cursorHistory.length > currentPage
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Order</th>
              <th className="p-2">Type</th>
              <th className="p-2">Table / room</th>
              <th className="p-2">Status</th>
              <th className="p-2">Total</th>
              <th className="p-2">Due</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders === undefined && (
              <tr>
                <td className="p-3" colSpan={7}>
                  Loading
                </td>
              </tr>
            )}
            {orders !== undefined && rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={7}>
                  No orders found.
                </td>
              </tr>
            )}
            {rows.map((order) => (
              <tr key={order._id} className="border-t">
                <td className="p-2">#{order.checkSuffix || String(order._id).slice(-6)}</td>
                <td className="p-2">{ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</td>
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
                if (hasNextPage) setCurrentPage((page) => page + 1)
              }}
              disabled={!hasNextPage}
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
