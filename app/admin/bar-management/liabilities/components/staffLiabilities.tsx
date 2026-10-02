'use client'

import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { Button } from '../../../../../shared/button'
import { toast } from 'sonner'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../../inventory-management/components/money'

type StatusFilter = 'all' | 'pending' | 'approved' | 'waived' | 'collected' | 'deducted'

const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm'

export default function StaffLiabilities() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)

  const [status, setStatus] = useState<StatusFilter>('pending')
  const [employeeId, setEmployeeId] = useState('')
  const [kind, setKind] = useState<'cash_shortage' | 'stock_shortage'>('stock_shortage')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const servers = useQuery(
    api.cashSettlements.listServersForCashUp,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )
  const list = useQuery(
    api.staffLiabilities.listStaffLiabilities,
    currentPropertyId
      ? {
          propertyId: currentPropertyId,
          ...(status === 'all' ? {} : { status }),
        }
      : 'skip',
  )

  const createLiability = useMutation(api.staffLiabilities.createStaffLiability)
  const approveLiability = useMutation(api.staffLiabilities.approveStaffLiability)
  const waiveLiability = useMutation(api.staffLiabilities.waiveStaffLiability)
  const collectLiability = useMutation(api.staffLiabilities.collectStaffLiability)

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="text-xl">No properties yet!</p>

  const money = (n: number) => formatPropertyMoney(n, currency)
  const staffOptions = servers?.data ?? []

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPropertyId || !employeeId) {
      toast.error('Select staff')
      return
    }
    const value = Number(amount)
    if (Number.isNaN(value) || value <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setBusy(true)
    try {
      const response = await createLiability({
        propertyId: currentPropertyId,
        employeeId: employeeId as Id<'staffs'>,
        kind,
        amount: value,
        reason,
      })
      if (response.success) {
        toast.success(response.message)
        setAmount('')
        setReason('')
      } else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  const run = async (
    action: () => Promise<{ success: boolean; message: string }>,
  ) => {
    setBusy(true)
    try {
      const response = await action()
      if (response.success) toast.success(response.message)
      else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="collected">Collected</option>
            <option value="deducted">Deducted</option>
            <option value="waived">Waived</option>
          </select>
        </label>
        <Link href="/admin/pos/cash-up" className="text-sm underline ms-auto">
          POS cash-up
        </Link>
      </div>

      <form onSubmit={handleCreate} className="border rounded-md p-3 max-w-xl space-y-2">
        <h4 className="text-base font-semibold m-0">Manual shortage liability</h4>
        <p className="text-xs text-gray-500 m-0">
          Use for stock float shortages (or other agreed recoveries). Cash shortages normally come
          from cash-up.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-sm">
            Staff
            <select
              className={selectClassName + ' mt-1'}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            >
              <option value="">Select</option>
              {staffOptions.map((s) => (
                <option key={s.employeeId} value={s.employeeId}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Kind
            <select
              className={selectClassName + ' mt-1'}
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <option value="stock_shortage">Stock shortage</option>
              <option value="cash_shortage">Cash shortage</option>
            </select>
          </label>
          <label className="text-sm">
            Amount
            <input
              className={selectClassName + ' mt-1'}
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            Reason
            <input
              className={selectClassName + ' mt-1'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
        </div>
        <Button type="submit" variant="dark" size="sm" disabled={busy}>
          Create pending liability
        </Button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2">Staff</th>
              <th className="py-2 pr-2">Kind</th>
              <th className="py-2 pr-2">Reason</th>
              <th className="py-2 pr-2 text-right">Amount</th>
              <th className="py-2 pr-2 text-right">Remaining</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(list?.data ?? []).map((row) => (
              <tr key={row._id} className="border-b align-top">
                <td className="py-2 pr-2">{row.staffName}</td>
                <td className="py-2 pr-2">{row.kind}</td>
                <td className="py-2 pr-2 max-w-[16rem]">{row.reason}</td>
                <td className="py-2 pr-2 text-right">{money(row.amount)}</td>
                <td className="py-2 pr-2 text-right">{money(row.remainingAmount)}</td>
                <td className="py-2 pr-2">{row.status}</td>
                <td className="py-2 pr-2">
                  <div className="flex flex-wrap gap-1">
                    {row.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="dark"
                        disabled={busy}
                        onClick={() =>
                          void run(() => approveLiability({ liabilityId: row._id }))
                        }
                      >
                        Approve
                      </Button>
                    )}
                    {(row.status === 'pending' || row.status === 'approved') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline-dark"
                          disabled={busy}
                          onClick={() =>
                            void run(() => collectLiability({ liabilityId: row._id }))
                          }
                        >
                          Collect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={busy}
                          onClick={() =>
                            void run(() => waiveLiability({ liabilityId: row._id }))
                          }
                        >
                          Waive
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(list?.data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-gray-500">
                  No liabilities for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
