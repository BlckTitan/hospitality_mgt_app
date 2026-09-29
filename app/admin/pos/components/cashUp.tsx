'use client'

import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { Button } from 'react-bootstrap'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { formatPropertyMoney, usePropertyCurrency } from '../../inventory-management/components/money'

const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm'

export default function CashUp() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''
  const currency = usePropertyCurrency(currentPropertyId || undefined)

  const [serverUserId, setServerUserId] = useState('')
  const [dateKey, setDateKey] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const serversResponse = useQuery(
    api.cashSettlements.listServersForCashUp,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  )
  const servers = serversResponse?.data ?? []

  const selectedServer = serverUserId || servers[0]?.userId || ''

  const preview = useQuery(
    api.cashSettlements.previewCashSettlement,
    currentPropertyId && selectedServer
      ? {
          propertyId: currentPropertyId,
          serverUserId: selectedServer as Id<'users'>,
          ...(dateKey ? { settlementDateKey: dateKey } : {}),
        }
      : 'skip',
  )
  const history = useQuery(
    api.cashSettlements.listCashSettlements,
    currentPropertyId
      ? {
          propertyId: currentPropertyId,
          ...(dateKey || preview?.data?.settlementDateKey
            ? { settlementDateKey: dateKey || preview?.data?.settlementDateKey }
            : {}),
        }
      : 'skip',
  )

  const postCashSettlement = useMutation(api.cashSettlements.postCashSettlement)

  if (propertiesResponse === undefined) return <p className="p-4">Loading</p>
  if (properties.length === 0) return <p className="text-xl">No properties yet!</p>

  const money = (n: number) => formatPropertyMoney(n, currency)
  const expected = preview?.data
  const counted = countedCash === '' ? NaN : Number(countedCash)
  const variance =
    expected && !Number.isNaN(counted) ? counted - expected.expectedCash : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPropertyId || !selectedServer) {
      toast.error('Select property and server')
      return
    }
    if (Number.isNaN(counted) || counted < 0) {
      toast.error('Enter counted cash')
      return
    }
    setBusy(true)
    try {
      const response = await postCashSettlement({
        propertyId: currentPropertyId,
        serverUserId: selectedServer as Id<'users'>,
        countedCash: counted,
        ...(dateKey ? { settlementDateKey: dateKey } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        createLiabilityIfShortage: true,
      })
      if (response.success) {
        toast.success(response.message)
        setCountedCash('')
        setNotes('')
      } else toast.error(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Cash-up failed')
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
            onChange={(e) => {
              setPropertyId(e.target.value)
              setServerUserId('')
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
          Server (linked staff)
          <select
            className={selectClassName + ' mt-1 min-w-[14rem]'}
            value={selectedServer}
            onChange={(e) => setServerUserId(e.target.value)}
          >
            {servers.length === 0 && <option value="">No linked staff users</option>}
            {servers.map((s) => (
              <option key={s.employeeId} value={s.userId}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Date (optional)
          <input
            className={selectClassName + ' mt-1'}
            type="date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
          />
        </label>
        <Link href="/admin/bar-management/liabilities" className="text-sm underline ms-auto">
          Staff liabilities
        </Link>
      </div>

      {expected && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-500">Date</div>
            <div className="font-semibold">{expected.settlementDateKey}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-500">Expected cash</div>
            <div className="font-semibold">{money(expected.expectedCash)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-500">Card / room (info)</div>
            <div className="text-sm">
              {money(expected.expectedCard)} card · {money(expected.expectedRoomCharge)} room
            </div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-500">Orders</div>
            <div className="font-semibold">{expected.orderCount}</div>
          </div>
        </div>
      )}

      {expected?.existingPosted && (
        <p className="text-sm text-amber-700">
          A posted cash-up already exists for this server and day (variance{' '}
          {money(expected.existingPosted.varianceCash)}).
        </p>
      )}

      <form onSubmit={handleSubmit} className="border rounded-md p-3 max-w-lg space-y-3">
        <h4 className="text-base font-semibold m-0">Post cash-up</h4>
        <label className="text-sm block">
          Counted cash in drawer
          <input
            className={selectClassName + ' mt-1'}
            type="number"
            min={0}
            step="0.01"
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
            required
          />
        </label>
        {variance !== null && (
          <p className="text-sm m-0">
            Variance:{' '}
            <span className={variance < 0 ? 'text-red-600 font-semibold' : variance > 0 ? 'text-green-700 font-semibold' : ''}>
              {money(variance)}
            </span>
            {variance < 0 ? ' (shortage → pending liability)' : variance > 0 ? ' (overage)' : ' (balanced)'}
          </p>
        )}
        <label className="text-sm block">
          Notes
          <input
            className={selectClassName + ' mt-1'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <Button type="submit" variant="dark" disabled={busy || Boolean(expected?.existingPosted)}>
          Post cash-up
        </Button>
      </form>

      <div className="overflow-x-auto">
        <h4 className="text-base font-semibold mb-2">Recent cash-ups</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Server</th>
              <th className="py-2 pr-2 text-right">Expected</th>
              <th className="py-2 pr-2 text-right">Counted</th>
              <th className="py-2 pr-2 text-right">Variance</th>
              <th className="py-2 pr-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(history?.data ?? []).map((row) => (
              <tr key={row._id} className="border-b">
                <td className="py-2 pr-2">{row.settlementDateKey}</td>
                <td className="py-2 pr-2">{row.staffName || row.serverName}</td>
                <td className="py-2 pr-2 text-right">{money(row.expectedCash)}</td>
                <td className="py-2 pr-2 text-right">{money(row.countedCash)}</td>
                <td className={`py-2 pr-2 text-right ${row.varianceCash < 0 ? 'text-red-600' : ''}`}>
                  {money(row.varianceCash)}
                </td>
                <td className="py-2 pr-2">{row.status}</td>
              </tr>
            ))}
            {(history?.data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-gray-500">
                  No cash-ups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
