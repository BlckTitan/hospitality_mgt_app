'use client'

import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Button } from '../../../../shared/button'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../inventory-management/components/money'
import Pagination from '../../../../shared/ui-pagination'

type StatusFilter = 'all' | 'open' | 'open_tab' | 'settled' | 'voided'
type TypeFilter = 'all' | 'bar' | 'room_service'

const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
const PAGE_SIZE = 10

const ORDER_TYPE_LABELS: Record<string, string> = {
  bar: 'Bar',
  room_service: 'Room service',
  dine_in: 'Dine in',
  takeout: 'Takeout',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  open_tab: 'Open tab',
  settled: 'Settled',
  voided: 'Voided',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  room_charge: 'Room charge',
  other: 'Other',
}

function checkLabel(orderId: string, checkSuffix?: string) {
  return checkSuffix || orderId.slice(-6)
}

function formatWhen(timestamp: number | undefined) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString()
}

export default function PosOrders() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [orderType, setOrderType] = useState<TypeFilter>('all')
  const [checkInput, setCheckInput] = useState('')
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null)
  const [detailOrderId, setDetailOrderId] = useState<Id<'orders'> | null>(null)
  const [payOrderId, setPayOrderId] = useState<Id<'orders'> | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'room_charge' | 'other'>('cash')
  const [busy, setBusy] = useState(false)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null])
  const [currentPage, setCurrentPage] = useState(1)

  const backfillCheckSuffix = useMutation(api.posOrders.backfillOrderCheckSuffix)

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
    api.posOrders.listOrders,
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
    api.posOrders.findOrdersByCheckId,
    currentPropertyId && activeCheckId
      ? {
          propertyId: currentPropertyId,
          checkId: activeCheckId,
          ...(status === 'all' ? {} : { status }),
          ...(orderType === 'all' ? {} : { orderType }),
        }
      : 'skip',
  )
  const detail = useQuery(
    api.posOrders.getOrder,
    detailOrderId ? { orderId: detailOrderId } : 'skip',
  )
  const payDownTab = useMutation(api.posOrders.payDownTab)

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
  if (properties.length === 0) return <p className="text-xl">No properties yet!</p>

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

  const resetProperty = (nextPropertyId: string) => {
    setPropertyId(nextPropertyId)
    setCheckInput('')
    setActiveCheckId(null)
    setDetailOrderId(null)
    setPayOrderId(null)
    resetPages()
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Property
          <select
            className={selectClassName + ' mt-1 min-w-[12rem]'}
            value={currentPropertyId}
            onChange={(e) => resetProperty(e.target.value)}
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
            className={selectClassName + ' mt-1 min-w-[10rem]'}
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
            className={selectClassName + ' mt-1 min-w-[10rem]'}
            value={orderType}
            onChange={(e) => {
              setOrderType(e.target.value as TypeFilter)
              resetPages()
            }}
          >
            <option value="all">All</option>
            <option value="bar">Bar</option>
            <option value="room_service">Room service</option>
          </select>
        </label>
        <form className="text-sm" onSubmit={handleFind}>
          <label>
            Check ID
            <input
              className={selectClassName + ' mt-1 min-w-[12rem]'}
              value={checkInput}
              placeholder="Last 6 or full ID"
              onChange={(e) => setCheckInput(e.target.value)}
            />
          </label>
          <div className="flex gap-2 mt-2">
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
          </div>
        </form>
        <div className="flex flex-wrap gap-3 text-sm ms-auto">
          <Link href="/admin/pos" className="underline">
            Open POS
          </Link>
        </div>
      </div>

      {searching && (
        <p className="text-sm text-gray-600 m-0">
          {searchMessage ||
            'Matches are not limited to the current page.'}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2">Check</th>
              <th className="py-2 pr-2">Opened</th>
              <th className="py-2 pr-2">Type</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Guest / room</th>
              <th className="py-2 pr-2 text-right">Total</th>
              <th className="py-2 pr-2 text-right">Paid</th>
              <th className="py-2 pr-2 text-right">Due</th>
              <th className="py-2 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listLoading || searchLoading ? (
              <tr>
                <td colSpan={9} className="py-4 text-gray-500">
                  Loading
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="border-b align-top">
                  <td className="py-2 pr-2 font-medium whitespace-nowrap">
                    {checkLabel(row._id, row.checkSuffix)}
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">{row.openedAtDateKey}</td>
                  <td className="py-2 pr-2">{ORDER_TYPE_LABELS[row.orderType] ?? row.orderType}</td>
                  <td className="py-2 pr-2">{STATUS_LABELS[row.status] ?? row.status}</td>
                  <td className="py-2 pr-2">
                    {row.roomLabel ? `Room ${row.roomLabel}` : row.guestLabel || '—'}
                    {row.guestName ? (
                      <div className="text-xs text-gray-500">{row.guestName}</div>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2 text-right">{money(row.totalAmount)}</td>
                  <td className="py-2 pr-2 text-right">{money(row.amountPaid)}</td>
                  <td className="py-2 pr-2 text-right">{money(row.balanceDue)}</td>
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button
                        size="sm"
                        variant={detailOrderId === row._id ? 'dark' : 'outline-secondary'}
                        onClick={() => setDetailOrderId(row._id)}
                      >
                        View
                      </Button>
                      {row.status === 'open_tab' && (
                        <Button
                          size="sm"
                          variant="outline-dark"
                          onClick={() => {
                            setPayOrderId(row._id)
                            setPayAmount(String(row.balanceDue))
                          }}
                        >
                          Pay down
                        </Button>
                      )}
                      {row.status === 'open' && (
                        <Link href="/admin/pos" className="text-xs underline">
                          Continue on terminal
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!listLoading && !searchLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-4 text-gray-500">
                  {searching ? searchMessage || 'No check found for that ID.' : 'No orders for this filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPager && (
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
              if (searching) {
                if (currentPage < searchPageCount) setCurrentPage((page) => page + 1)
                return
              }
              if (hasNextPage) setCurrentPage((page) => page + 1)
            }}
            disabled={searching ? currentPage >= searchPageCount : !hasNextPage}
          />
        </Pagination>
      )}

      {detailOrderId && (
        <CheckDetail
          loading={detail === undefined}
          missing={detail !== undefined && !detail.success}
          order={detail?.success ? detail.data : null}
          money={money}
          onClose={() => setDetailOrderId(null)}
        />
      )}

      {payOrderId && (
        <div className="border rounded-md p-3 max-w-md space-y-2">
          <h4 className="text-base font-semibold m-0">Pay down tab</h4>
          <label className="text-sm block">
            Method
            <select
              className={selectClassName + ' mt-1'}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card (record)</option>
              <option value="room_charge">Room charge</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm block">
            Amount
            <input
              className={selectClassName + ' mt-1'}
              type="number"
              min={0}
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button variant="dark" size="sm" disabled={busy} onClick={() => void handlePayDown()}>
              Apply payment
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={busy}
              onClick={() => setPayOrderId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckDetail({
  loading,
  missing,
  order,
  money,
  onClose,
}: {
  loading: boolean
  missing: boolean
  order: {
    _id: string
    checkSuffix?: string
    orderType: string
    status: string
    openedAt: number
    settledAt?: number
    guestLabel?: string
    roomLabel: string | null
    guestName: string | null
    serverName: string | null
    bar: { name: string } | null
    subtotal: number
    totalAmount: number
    amountPaid: number
    balanceDue: number
    lines: Array<{
      _id: string
      quantity: number
      nameSnapshot: string
      unitPriceSnapshot: number
      lineTotal: number
      status: string
      createdAt: number
    }>
    payments: Array<{
      _id: string
      amount: number
      paymentMethod: string
      paidAt?: number
      createdAt: number
      createdByName: string | null
      status: string
    }>
  } | null
  money: (n: number) => string
  onClose: () => void
}) {
  const lines = [...(order?.lines ?? [])].sort((a, b) => a.createdAt - b.createdAt)
  const payments = order?.payments ?? []

  return (
    <section className="border rounded-md p-4 max-w-3xl space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h4 className="text-base font-semibold m-0">
            {order ? `Check ${checkLabel(order._id, order.checkSuffix)}` : 'Check'}
          </h4>
          {order && (
            <p className="text-xs text-gray-500 m-0 mt-1 break-all">Full ID {order._id}</p>
          )}
        </div>
        <Button size="sm" variant="outline-secondary" onClick={onClose}>
          Close
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-500 m-0">Loading check</p>}
      {missing && <p className="text-sm text-gray-500 m-0">This check could not be loaded.</p>}

      {order && (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm m-0">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="m-0">{STATUS_LABELS[order.status] ?? order.status}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Type</dt>
              <dd className="m-0">{ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Server</dt>
              <dd className="m-0">{order.serverName || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Opened</dt>
              <dd className="m-0">{formatWhen(order.openedAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Settled</dt>
              <dd className="m-0">{formatWhen(order.settledAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Guest / room</dt>
              <dd className="m-0">
                {order.roomLabel ? `Room ${order.roomLabel}` : order.guestLabel || '—'}
                {order.guestName ? ` · ${order.guestName}` : ''}
              </dd>
            </div>
            {order.bar && (
              <div>
                <dt className="text-gray-500">Bar</dt>
                <dd className="m-0">{order.bar.name}</dd>
              </div>
            )}
          </dl>

          <div>
            <h5 className="text-sm font-semibold m-0 mb-2">Items</h5>
            <ul className="space-y-1 m-0 p-0 list-none">
              {lines.map((line) => (
                <li key={line._id} className="flex justify-between gap-3 text-sm border-b pb-1">
                  <span className={line.status === 'voided' ? 'line-through text-gray-400' : ''}>
                    {line.quantity}× {line.nameSnapshot}
                    <span className="text-gray-500"> · {money(line.unitPriceSnapshot)}</span>
                    {line.status === 'voided' ? ' · Voided' : ''}
                  </span>
                  <span className={line.status === 'voided' ? 'line-through text-gray-400' : ''}>
                    {money(line.lineTotal)}
                  </span>
                </li>
              ))}
              {lines.length === 0 && <li className="text-sm text-gray-500">No items on this check.</li>}
            </ul>
          </div>

          <div>
            <h5 className="text-sm font-semibold m-0 mb-2">Payments</h5>
            <ul className="space-y-1 m-0 p-0 list-none">
              {payments.map((payment) => (
                <li key={payment._id} className="flex justify-between gap-3 text-sm border-b pb-1">
                  <span>
                    {PAYMENT_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
                    <span className="text-gray-500">
                      {' '}
                      · {formatWhen(payment.paidAt ?? payment.createdAt)}
                      {payment.createdByName ? ` · ${payment.createdByName}` : ''}
                    </span>
                  </span>
                  <span>{money(payment.amount)}</span>
                </li>
              ))}
              {payments.length === 0 && <li className="text-sm text-gray-500">No payments recorded.</li>}
            </ul>
          </div>

          <div className="space-y-1 text-sm max-w-xs ms-auto">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total</span>
              <span>{money(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{money(order.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Due</span>
              <span>{money(order.balanceDue)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
