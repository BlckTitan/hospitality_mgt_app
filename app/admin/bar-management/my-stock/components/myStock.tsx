'use client'

import { useConvexAuth, useMutation, useQuery } from 'convex/react'
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
import { useCanSelectProperty } from '../../../../../hooks/useCanSelectProperty'
import { DailySalesSummary } from './dailySalesSummary'

const selectClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md';
const qtyInputClassName = 'w-20! max-w-[1.75rem] border rounded p-1 text-right';
const PAGE_SIZE = 10;

export default function MyStock() {
  const { isAuthenticated } = useConvexAuth()
  const propertiesResponse = useQuery(
    api.property.listAccessibleProperties,
    isAuthenticated ? {} : 'skip',
  )
  const properties = propertiesResponse?.data || []
  const [propertyId, setPropertyId] = useState<string>('')
  const [barId, setBarId] = useState<string>('')
  const [beverageId, setBeverageId] = useState<string>('')
  const [closingEdits, setClosingEdits] = useState<Record<string, string>>({})
  const [wasteEdits, setWasteEdits] = useState<Record<string, string>>({})
  const [compEdits, setCompEdits] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const canSelectProperty = useCanSelectProperty()
  const [beverageQuery, setBeverageQuery] = useState('')
  const [debouncedBeverageQuery] = useDebounce(beverageQuery, 300)

  const currentPropertyId = propertyId || properties[0]?._id || ''
  const today = useQuery(
    api.userStockLogs.getMyTodayStock,
    isAuthenticated && currentPropertyId
      ? { propertyId: currentPropertyId as Id<'properties'> }
      : 'skip',
  )

  const addBeverage = useMutation(api.userStockLogs.addMyTodayBeverage)
  const autofillToday = useMutation(api.userStockLogs.autofillMyToday)
  const saveClosing = useMutation(api.userStockLogs.saveMyClosingStock)
  const saveClosings = useMutation(api.userStockLogs.saveMyClosingStocks)
  const finalizeToday = useMutation(api.userStockLogs.finalizeMyToday)
  const finalizePriorDay = useMutation(api.userStockLogs.finalizeMyPriorDay)

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
  const priorForBar = useMemo(() => {
    return (data?.priorLogs ?? [])
      .filter((log) => !selectedBarId || log.barId === selectedBarId)
      .slice()
      .sort((a, b) =>
        (a.beverage?.name ?? '').localeCompare(b.beverage?.name ?? '', undefined, {
          sensitivity: 'base',
          numeric: true,
        }),
      )
  }, [data?.priorLogs, selectedBarId])
  const priorOperatorNames = useMemo(() => {
    const names: string[] = []
    for (const log of priorForBar) {
      if (!names.includes(log.operatorName)) names.push(log.operatorName)
    }
    return names
  }, [priorForBar])
  const priorBarName = priorForBar[0]?.bar?.name || 'this bar'
  const priorWho =
    priorOperatorNames.length === 0
      ? 'the previous shift'
      : priorOperatorNames.length === 1
        ? priorOperatorNames[0]
        : priorOperatorNames.length === 2
          ? `${priorOperatorNames[0]} and ${priorOperatorNames[1]}`
          : `${priorOperatorNames.slice(0, -1).join(', ')}, and ${priorOperatorNames[priorOperatorNames.length - 1]}`
  const priorCloseMessage = `Finalize yesterday's ${priorBarName} stock for ${priorWho} before the next shift sells it.`
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

  const carryKey = useRef('')
  const carryRun = useRef(0)
  const todayLogs = data?.logs
  const priorLogs = data?.priorLogs
  useEffect(() => {
    if (!currentPropertyId || !selectedBarId || !data?.logDate) return
    if ((priorLogs ?? []).some((log) => log.barId === selectedBarId)) return
    const barLogs = (todayLogs ?? []).filter((log) => log.barId === selectedBarId)
    if (barLogs.some((log) => log.isFinalized)) return
    const key = `${currentPropertyId}:${selectedBarId}:${data.logDate}`
    if (carryKey.current === key) return
    carryKey.current = key
    const run = carryRun.current + 1
    carryRun.current = run
    let added = 0
    ;(async () => {
      setAutofilling(true)
      try {
        for (let pass = 0; pass < 20; pass += 1) {
          const response = await autofillToday({
            propertyId: currentPropertyId as Id<'properties'>,
            barId: selectedBarId as Id<'bars'>,
          })
          added += response.added ?? 0
          if (response.success === false) {
            const quiet =
              response.message.startsWith('No carry-over') ||
              response.message.startsWith('No active carry-over') ||
              response.message.includes('already finalized')
            if (!quiet && carryRun.current === run) toast.error(response.message)
            break
          }
          if ((response.remaining ?? 0) === 0) break
        }
        if (carryRun.current === run && added > 0) {
          toast.success(
            added === 1
              ? "Today's opening stock is yesterday's close"
              : `Today's opening stock is yesterday's close for ${added} drinks`,
          )
        }
      } catch (error: any) {
        if (carryRun.current === run) {
          carryKey.current = ''
          toast.error(error?.message || "Failed to open today's stock from yesterday")
        }
      } finally {
        if (carryRun.current === run) setAutofilling(false)
      }
    })()
  }, [autofillToday, currentPropertyId, data?.logDate, priorLogs, selectedBarId, todayLogs])

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
        'Fill any drinks still missing from today using yesterday\'s closing stock? Drinks already on today\'s log stay as they are.',
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

  const clearSavedEdits = (ids: string[]) => {
    const drop = (current: Record<string, string>) => {
      const next = { ...current }
      for (const id of ids) delete next[id]
      return next
    }
    setClosingEdits(drop)
    setWasteEdits(drop)
    setCompEdits(drop)
  }

  const handleSaveAll = async () => {
    const openLogs = logs.filter((log) => !log.isFinalized)
    if (openLogs.length === 0) {
      toast.error('No open stock to save')
      return
    }
    const lines: Array<{
      stockLogId: Id<'userStockLogs'>
      closingStock: number
      wasteQuantity: number
      compQuantity: number
    }> = []
    for (const log of openLogs) {
      const closingRaw = closingEdits[log._id]
      const wasteRaw = wasteEdits[log._id]
      const compRaw = compEdits[log._id]
      const closingStock = closingRaw === undefined || closingRaw === '' ? log.closingStock : Number(closingRaw)
      const wasteQuantity = wasteRaw === undefined || wasteRaw === '' ? (log.wasteQuantity ?? 0) : Number(wasteRaw)
      const compQuantity = compRaw === undefined || compRaw === '' ? (log.compQuantity ?? 0) : Number(compRaw)
      const name = log.beverage?.name || 'A drink'
      if ([closingStock, wasteQuantity, compQuantity].some((value) => Number.isNaN(value))) {
        toast.error(`Enter numbers for ${name}`)
        return
      }
      const disappeared = log.totalStock - closingStock
      if (disappeared < 0 || wasteQuantity + compQuantity > disappeared) {
        toast.error(`${name} has closing, waste, or comps that do not fit the stock`)
        return
      }
      lines.push({
        stockLogId: log._id as Id<'userStockLogs'>,
        closingStock,
        wasteQuantity,
        compQuantity,
      })
    }

    setSavingAll(true)
    const savedIds: string[] = []
    try {
      for (let index = 0; index < lines.length; index += 10) {
        const batch = lines.slice(index, index + 10)
        const response = await saveClosings({ lines: batch })
        if (response.success !== true) {
          clearSavedEdits(savedIds)
          toast.error(
            savedIds.length > 0
              ? `${response.message} ${savedIds.length} already saved.`
              : response.message,
          )
          return
        }
        savedIds.push(...batch.map((line) => line.stockLogId))
      }
      clearSavedEdits(savedIds)
      toast.success(savedIds.length === 1 ? '1 stock row saved' : `${savedIds.length} stock rows saved`)
    } catch (error: any) {
      clearSavedEdits(savedIds)
      toast.error(error?.message || 'Failed to save stock')
    } finally {
      setSavingAll(false)
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

  const handleFinalizePrior = async () => {
    if (!currentPropertyId || !selectedBarId) {
      toast.error('Select a bar first')
      return
    }
    if (!confirm(`${priorCloseMessage} Close yesterday now?`)) return
    try {
      const response = await finalizePriorDay({
        propertyId: currentPropertyId as Id<'properties'>,
        barId: selectedBarId as Id<'bars'>,
      })
      if (response.success === false) toast.error(response.message)
      else toast.success(response.message)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to close yesterday')
    }
  }

  return (
    <div className="w-full h-full">
      {canSelectProperty && properties.length > 1 && (
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
          <Button
            variant="dark"
            type="submit"
            disabled={!selectedBarId || autofilling || priorForBar.length > 0}
            title={priorForBar.length > 0 ? priorCloseMessage : undefined}
          >
            Add to today
          </Button>
          <Button
            variant="outline-dark"
            type="button"
            disabled={!selectedBarId || barFinalized || autofilling || priorForBar.length > 0}
            title={
              priorForBar.length > 0
                ? priorCloseMessage
                : barFinalized
                ? 'Today is already finalized for this bar'
                : 'Add any drinks still missing from yesterday\'s close'
            }
            onClick={handleAutofill}
          >
            {autofilling ? 'Autofilling…' : 'Autofill'}
          </Button>
        </div>
        {data?.logDate && (
          <p className="text-sm text-gray-500 mt-2">
            Date: {data.logDate}. Opening stock is yesterday&apos;s closing count for this bar.
          </p>
        )}
      </form>

      {priorForBar.length > 0 && (
        <section className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4">
          <h3 className="text-base font-semibold">Close yesterday first</h3>
          <p className="mt-1 text-sm text-gray-700">
            {priorCloseMessage} Anyone linked to {priorBarName} can save the count and close it.
            The next shift cannot start or sell until this is done.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left text-sm">Beverage</th>
                  <th className="p-2 text-left text-sm">Opening</th>
                  <th className="p-2 text-left text-sm">Received</th>
                  <th className="p-2 text-left text-sm">Total</th>
                  <th className="p-2 text-left text-sm">Closing</th>
                  <th className="p-2 text-left text-sm">Waste</th>
                  <th className="p-2 text-left text-sm">Comps</th>
                  <th className="p-2 text-left text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {priorForBar.map((log) => {
                  const closingValue = closingEdits[log._id] ?? String(log.closingStock)
                  const wasteValue = wasteEdits[log._id] ?? String(log.wasteQuantity ?? 0)
                  const compValue = compEdits[log._id] ?? String(log.compQuantity ?? 0)
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
                          disabled={savingAll || savingId === log._id}
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
                          disabled={savingAll || savingId === log._id}
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
                          disabled={savingAll || savingId === log._id}
                          onChange={(event) =>
                            setCompEdits((current) => ({
                              ...current,
                              [log._id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="dark"
                          disabled={savingAll || savingId === log._id}
                          onClick={() => handleSave(log._id, log.closingStock)}
                        >
                          {savingId === log._id ? 'Saving…' : 'Save'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="success" className="mt-3" onClick={handleFinalizePrior}>
            Finalize yesterday
          </Button>
        </section>
      )}

      {today === undefined || (autofilling && logs.length === 0) ? (
        <p className="text-gray-500">
          {autofilling ? 'Opening today from yesterday\'s close…' : 'Loading today\'s stock…'}
        </p>
      ) : logs.length === 0 ? (
        <p className="text-gray-600">
          {priorForBar.length > 0
            ? 'Today stays closed until yesterday is finalized.'
            : 'No drinks carried over from yesterday. Add a beverage, wait for a store issue, or request stock.'}
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
          leading={
            logs.some((log) => !log.isFinalized) ? (
              <Button
                type="button"
                variant="success"
                onClick={handleSaveAll}
                disabled={savingAll || autofilling}
              >
                {savingAll ? 'Saving…' : `Save all (${logs.filter((log) => !log.isFinalized).length})`}
              </Button>
            ) : null
          }
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
                        disabled={log.isFinalized || savingAll || savingId === log._id}
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
                        disabled={log.isFinalized || savingAll || savingId === log._id}
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
                        disabled={log.isFinalized || savingAll || savingId === log._id}
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
                          disabled={sales < 0 || savingAll || savingId === log._id}
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
