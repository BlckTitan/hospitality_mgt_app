'use client'

import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../inventory-management/components/money'

type StatusFilter = 'all' | 'open' | 'open_tab' | 'settled' | 'voided'
type TypeFilter = 'all' | 'bar' | 'room_service'

const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm'

export default function PosOrders() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [orderType, setOrderType] = useState<TypeFilter>('all')
  const [payOrderId, setPayOrderId] = useState<Id<'orders'> | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'room_charge' | 'other'>('cash')
  const [busy, setBusy] = useState(false)

  const orders = useQuery(
    api.posOrders.listOrders,
    currentPropertyId
      ? {
          propertyId: currentPropertyId,
          ...(status === 'all' ? {} : { status }),
          ...(orderType === 'all' ? {} : { orderType }),
        }
      : 'skip',
  )
  const payDownTab = useMutation(api.posOrders.payDownTab)

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="text-xl">No properties yet!</p>

  const money = (n: number) => formatPropertyMoney(n, currency)
  const rows = orders?.data ?? []

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
            onChange={(e) => setPropertyId(e.target.value)}
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
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
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
            onChange={(e) => setOrderType(e.target.value as TypeFilter)}
          >
            <option value="all">All</option>
            <option value="bar">Bar</option>
            <option value="room_service">Room service</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3 text-sm ms-auto">
          <Link href="/admin/pos" className="underline">
            Bar POS
          </Link>
          <Link href="/admin/room-management/room-service-pos" className="underline">
            Room service POS
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
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
            {rows.map((row) => (
              <tr key={row._id} className="border-b align-top">
                <td className="py-2 pr-2 whitespace-nowrap">
                  {row.openedAtDateKey}
                  <div className="text-xs text-gray-500">{String(row._id).slice(-6)}</div>
                </td>
                <td className="py-2 pr-2">{row.orderType}</td>
                <td className="py-2 pr-2">{row.status}</td>
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
                    <Link
                      href={
                        row.orderType === 'room_service'
                          ? '/admin/room-management/room-service-pos'
                          : '/admin/pos'
                      }
                      className="text-xs underline"
                    >
                      Continue on terminal
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-gray-500">
                  No orders for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
