'use client'

import { useQuery, useConvexAuth } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { api } from '../../../../../../convex/_generated/api'
import { Id } from '../../../../../../convex/_generated/dataModel'
import Spinner from '../../../../../../shared/spinner'
import { formatPropertyMoney, usePropertyCurrency } from '../../../../inventory-management/components/money'

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine in',
  takeout: 'Takeout',
  room_service: 'Room service',
}

export default function OrderViewComponent() {
  const { isAuthenticated } = useConvexAuth()
  const searchParams = useSearchParams()
  const id = searchParams.get('order_id') ?? null
  const response = useQuery(
    api.restaurantOrders.getOrder,
    isAuthenticated && id ? { orderId: id as Id<'restaurantOrders'> } : 'skip',
  )
  const currency = usePropertyCurrency(response?.success ? response.data?.propertyId : undefined)

  if (response === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner size="sm" />
      </div>
    )
  }
  if (!response?.success || !response.data) return <div>No data available!</div>

  const order = response.data
  const money = (value: number) => formatPropertyMoney(value, currency)
  const activeLines = order.lines.filter((line) => line.lineStatus === 'active')

  return (
    <div className="w-full h-full">
      <p className="text-sm text-gray-600 mb-3">
        #{order.checkSuffix || String(order._id).slice(-6)}
        {' · '}
        {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
        {' · '}
        {order.status.replace('_', ' ')}
        {order.serverName ? ` · ${order.serverName}` : ''}
        {order.table?.tableNumber ? ` · Table ${order.table.tableNumber}` : ''}
        {order.roomLabel ? ` · Room ${order.roomLabel}` : ''}
      </p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-2">Item</th>
              <th className="p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {activeLines.length === 0 && (
              <tr>
                <td className="p-3" colSpan={2}>
                  No active lines.
                </td>
              </tr>
            )}
            {activeLines.map((line) => (
              <tr key={line._id} className="border-t">
                <td className="p-2">
                  {line.quantity}× {line.nameSnapshot}
                </td>
                <td className="p-2">{money(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm space-y-1 mb-4 max-w-sm">
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

      {(order.payments?.length ?? 0) > 0 && (
        <div className="overflow-x-auto">
          <p className="font-medium mb-2 text-sm">Payments</p>
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-2">Method</th>
                <th className="p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.payments.map((payment) => (
                <tr key={payment._id} className="border-t">
                  <td className="p-2">{payment.paymentMethod}</td>
                  <td className="p-2">{money(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
