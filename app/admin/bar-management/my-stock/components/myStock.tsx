'use client'

import { useMutation, useQuery } from 'convex/react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from 'use-debounce'
import { useRememberedList } from '../../../../../shared/listPageState'
import { TableSearch } from '../../../../../shared/pagination'
import { Button } from '../../../../../shared/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import Pagination from '../../../../../shared/ui-pagination'
import { formatPropertyMoney } from '../../../inventory-management/components/money'
import { DailySalesSummary } from './dailySalesSummary'

const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md';
const qtyInputClassName = 'w-20! max-w-[1.75rem] border rounded p-1 text-right';
const PAGE_SIZE = 10;

export default function MyStock() {
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data || []
  const [propertyId, setPropertyId] = useState<string>('')
  const [barId, setBarId] = useState<string>('')
  const [beverageId, setBeverageId] = useState<string>('')
  const [closingEdits, setClosingEdits] = useState<Record<string, string>>({})
  const [wasteEdits, setWasteEdits] = useState<Record<string, string>>({})
  const [compEdits, setCompEdits] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [autofilling, setAutofilling] = useState(false)
  const [beverageQuery, setBeverageQuery] = useState('')
  const [debouncedBeverageQuery] = useDebounce(beverageQuery, 300)

  const currentPropertyId = propertyId || properties[0]?._id || ''
  const today = useQuery(
    api.userStockLogs.getMyTodayStock,
    currentPropertyId ? { propertyId: currentPropertyId as Id<'properties'> } : 'skip',
  )

  const addBeverage = useMutation(api.userStockLogs.addMyTodayBeverage)
  const autofillToday = useMutation(api.userStockLogs.autofillMyToday)
  const saveClosing = useMutation(api.userStockLogs.saveMyClosingStock)
  const finalizeToday = useMutation(api.userStockLogs.finalizeMyToday)

  const data = today?.success ? today.data : null
  const bars = data?.bars ?? []
  const selectedBarId = barId || bars[0]?._id || ''
  const { ready, currentPage, setCurrentPage } = useRememberedList(
    `my-stock:${currentPropertyId}:${selectedBarId}`,
  )
  const logs = useMemo(() => {
    return (data?.logs ?? [])
      .filter((log) => !selectedBarId || log.barId === selectedBarId)
      .slice()
      .sort((a, b) =>
        (a.beverage?.name ?? '').localeCompare(b.beverage?.name ?? '', undefined, {
          sensitivity: 'base',
          numeric: true,
        }),
      )
  }, [data?.logs, selectedBarId])
  const selectedProperty = properties.find((property: any) => property._id === currentPropertyId)
  const beverageTerm = debouncedBeverageQuery.trim().toLowerCase()
  const visibleLogs = useMemo(() => {
    if (beverageTerm.length < 2) return logs
    return logs.filter((log) => (log.beverage?.name ?? '').toLowerCase().includes(beverageTerm))
  }, [logs, beverageTerm])
  const pageCount = Math.max(1, Math.ceil(visibleLogs.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, pageCount)
  const pageLogs = visibleLogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const previousBeverageQuery = useRef(debouncedBeverageQuery)
  useEffect(() => {
    if (previousBeverageQuery.current === debouncedBeverageQuery) return
    previousBeverageQuery.current = debouncedBeverageQuery
    setCurrentPage(1)
  }, [debouncedBeverageQuery, setCurrentPage])

  const availableBeverages = useMemo(() => {
    const used = new Set(logs.map((log) => log.beverageId))
    return (data?.beverages ?? []).filter((beverage) => !used.has(beverage._id))
  }, [data?.beverages, logs])

  if (!ready || propertiesResponse === undefined) {
    return <p className="p-4">Loading</p>
  }

  if (properties.length === 0) {
    return <p className="text-xl">No properties yet!</p>
  }

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPropertyId || !selectedBarId || !beverageId) {
      toast.error('Select a bar and beverage')
      return
    }
    try {
      const response = await addBeverage({
        propertyId: currentPropertyId as Id<'properties'>,
        barId: selectedBarId as Id<'bars'>,
        beverageId: beverageId as Id<'beverages'>,
      })
      if (response.success === false) toast.error(response.message)
      else {
        toast.success(response.message)
        setBeverageId('')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add beverage')
    }
  }

  const barFinalized = logs.some((log) => log.isFinalized)

  const handleAutofill = async () => {
    if (!currentPropertyId || !selectedBarId) {
      toast.error('Select a bar first')
      return
    }
    if (
      !confirm(
        'Add every drink you still had at the last close for this bar? Drinks already on today\'s log are left as they are.',
      )
    ) {
      return
    }
    try {
      setAutofilling(true)
      const response = await autofillToday({
        propertyId: currentPropertyId as Id<'properties'>,
        barId: selectedBarId as Id<'bars'>,
      })
      if (response.success === false) toast.error(response.message)
      else toast.success(response.message)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to autofill today\'s stock')
    } finally {
      setAutofilling(false)
    }
  }

  const handleSave = async (stockLogId: string, fallback: number) => {
    const raw = closingEdits[stockLogId]
    const closingStock = raw === undefined || raw === '' ? fallback : Number(raw)
    if (Number.isNaN(closingStock)) {
      toast.error('Closing stock must be a number')
      return
    }
    try {
      const wasteRaw = wasteEdits[stockLogId]
      const compRaw = compEdits[stockLogId]
      const wasteQuantity = wasteRaw === undefined || wasteRaw === '' ? undefined : Number(wasteRaw)
      const compQuantity = compRaw === undefined || compRaw === '' ? undefined : Number(compRaw)
      if (
        (wasteQuantity !== undefined && Number.isNaN(wasteQuantity)) ||
        (compQuantity !== undefined && Number.isNaN(compQuantity))
      ) {
        toast.error('Waste and comps must be numbers')
        return
      }
      setSavingId(stockLogId)
      const response = await saveClosing({
        stockLogId: stockLogId as Id<'userStockLogs'>,
        closingStock,
        wasteQuantity,
        compQuantity,
      })
      if (response.success === false) toast.error(response.message)
      else {
        toast.success(response.message)
        setClosingEdits((current) => {
          const next = { ...current }
          delete next[stockLogId]
          return next
        })
        setWasteEdits((current) => {
          const next = { ...current }
          delete next[stockLogId]
          return next
        })
        setCompEdits((current) => {
          const next = { ...current }
          delete next[stockLogId]
          return next
        })
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save closing stock')
    } finally {
      setSavingId(null)
    }
  }

  const handleFinalize = async () => {
    if (!selectedBarId) {
      toast.error('Select a bar first')
      return
    }
    if (!confirm('Finalize today for this bar? Issued stock cannot be added afterwards.')) return
    try {
      const response = await finalizeToday({
        propertyId: currentPropertyId as Id<'properties'>,
        barId: selectedBarId as Id<'bars'>,
      })
      if (response.success === false) toast.error(response.message)
      else toast.success(response.message)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to finalize today')
    }
  }

  return (
    <div className="w-full h-full">
      {properties.length > 1 && (
        <div className="mb-4 w-full lg:w-3/12">
          <label className="block text-sm mb-1">Property</label>
          <select
            className={selectClassName}
            value={currentPropertyId}
            onChange={(event) => {
              setPropertyId(event.target.value)
              setBarId('')
            }}
          >
            {properties.map((property: any) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleAdd} className="mb-6">
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:items-end">
          <div className="w-full lg:w-3/12">
            <label className="block text-sm mb-1">Bar</label>
            <select
              className={selectClassName}
              value={selectedBarId}
              onChange={(event) => setBarId(event.target.value)}
            >
              <option value="">Select a bar</option>
              {bars.map((bar) => (
                <option key={bar._id} value={bar._id}>
                  {bar.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full lg:w-3/12">
            <label className="block text-sm mb-1">Add beverage</label>
            <select
              className={selectClassName}
              value={beverageId}
              onChange={(event) => setBeverageId(event.target.value)}
            >
              <option value="">Select a beverage</option>
              {availableBeverages.map((beverage) => (
                <option key={beverage._id} value={beverage._id}>
                  {beverage.name}
                </option>
              ))}
            </select>
          </div>
          <Button variant="dark" type="submit" disabled={!selectedBarId || autofilling}>
            Add to today
          </Button>
          <Button
            variant="outline-dark"
            type="button"
            disabled={!selectedBarId || barFinalized || autofilling}
            title={
              barFinalized
                ? 'Today is already finalized for this bar'
                : 'Add every drink you still had at the last close for this bar'
            }
            onClick={handleAutofill}
          >
            {autofilling ? 'Autofilling…' : 'Autofill'}
          </Button>
        </div>
        {data?.logDate && (
          <p className="text-sm text-gray-500 mt-2">
            Date: {data.logDate}. Autofill adds drinks left at your last close for this bar.
          </p>
        )}
      </form>

      {today === undefined ? (
        <p className="text-gray-500">Loading today&apos;s stock…</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-600">
          No beverages on today&apos;s log yet. Autofill carry-over drinks, add one, wait for a store
          issue, or request stock.
        </p>
      ) : (
        <>
        <DailySalesSummary
          logs={logs}
          closingEdits={closingEdits}
          wasteEdits={wasteEdits}
          compEdits={compEdits}
          currency={selectedProperty?.currency}
        />
        <TableSearch
          value={beverageQuery}
          placeholder="Search by beverage"
          setSearchQuery={setBeverageQuery}
        />
        {visibleLogs.length === 0 ? (
          <p className="text-gray-600">No beverages match that search.</p>
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left text-sm">Beverage</th>
                <th className="p-2 text-left text-sm">Opening</th>
                <th className="p-2 text-left text-sm">Received</th>
                <th className="p-2 text-left text-sm">Total</th>
                <th className="p-2 text-left text-sm">Closing</th>
                <th className="p-2 text-left text-sm">Waste</th>
                <th className="p-2 text-left text-sm">Comps</th>
                <th className="p-2 text-left text-sm">Sales</th>
                <th className="p-2 text-left text-sm">Amount</th>
                <th className="p-2 text-left text-sm" title="Quantity rung on your checks opened today">
                  POS
                </th>
                <th
                  className="p-2 text-left text-sm"
                  title="Sales minus POS. Positive means bottles left that were not rung."
                >
                  Variance
                </th>
                <th className="p-2 text-left text-sm">Status</th>
                <th className="p-2 text-left text-sm">Action</th>
              </tr>
            </thead>
            
            <tbody>
              {pageLogs.map((log) => {
                const closingValue = closingEdits[log._id] ?? String(log.closingStock)
                const wasteValue = wasteEdits[log._id] ?? String(log.wasteQuantity ?? 0)
                const compValue = compEdits[log._id] ?? String(log.compQuantity ?? 0)
                const closingNumber = Number(closingValue)
                const wasteNumber = Number(wasteValue)
                const compNumber = Number(compValue)
                const disappeared = Number.isNaN(closingNumber)
                  ? log.salesQuantity + (log.wasteQuantity ?? 0) + (log.compQuantity ?? 0)
                  : log.totalStock - closingNumber
                const sales =
                  disappeared -
                  (Number.isNaN(wasteNumber) ? 0 : wasteNumber) -
                  (Number.isNaN(compNumber) ? 0 : compNumber)
                const unitPrice = log.beverage?.unitPrice ?? 0
                const salesAmount = sales * unitPrice
                const posQuantity = log.posQuantity ?? 0
                const variance = sales - posQuantity
                return (
                  <tr key={log._id} className="border-t">
                    <td className="p-2">{log.beverage?.name || 'Unknown'}</td>
                    <td className="p-2">{log.openingStock}</td>
                    <td className="p-2">{log.newStockReceived}</td>
                    <td className="p-2 font-semibold">{log.totalStock}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        className={qtyInputClassName}
                        value={closingValue}
                        disabled={log.isFinalized || savingId === log._id}
                        onChange={(event) =>
                          setClosingEdits((current) => ({
                            ...current,
                            [log._id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        className={qtyInputClassName}
                        value={wasteValue}
                        disabled={log.isFinalized || savingId === log._id}
                        onChange={(event) =>
                          setWasteEdits((current) => ({
                            ...current,
                            [log._id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        className={qtyInputClassName}
                        value={compValue}
                        disabled={log.isFinalized || savingId === log._id}
                        onChange={(event) =>
                          setCompEdits((current) => ({
                            ...current,
                            [log._id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className={`p-2 ${sales < 0 ? 'text-red-600' : ''}`}>{sales}</td>
                    <td className="p-2 whitespace-nowrap">
                      {formatPropertyMoney(salesAmount, selectedProperty?.currency)}
                    </td>
                    <td className="p-2">{posQuantity}</td>
                    <td
                      className={`p-2 ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-amber-700' : ''}`}
                    >
                      {variance}
                    </td>
                    <td className="p-2">{log.isFinalized ? 'Finalized' : 'Open'}</td>
                    <td className="p-2">
                      {!log.isFinalized && (
                        <Button
                          type="button"
                          size="sm"
                          variant="dark"
                          disabled={sales < 0 || savingId === log._id}
                          onClick={() => handleSave(log._id, log.closingStock)}
                        >
                          {savingId === log._id ? 'Saving…' : 'Save'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {visibleLogs.length > 0 && (
          <Pagination>
            <Pagination.Prev
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
            />
            {Array.from({ length: pageCount }, (_, index) => (
              <Pagination.Item
                key={index}
                active={safePage === index + 1}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              disabled={safePage >= pageCount}
            />
          </Pagination>
        )}
        </>
        )}
        </>
      )}

      {logs.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/bar-management/stock-requests">
            <Button type="button" variant="outline-dark">
              Request stock
            </Button>
          </Link>
          {logs.some((log) => !log.isFinalized) && (
            <Button type="button" variant="success" onClick={handleFinalize}>
              Finalize today
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <Link href="/admin/bar-management/stock-requests">
            <Button type="button" variant="outline-dark">
              Request stock
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
