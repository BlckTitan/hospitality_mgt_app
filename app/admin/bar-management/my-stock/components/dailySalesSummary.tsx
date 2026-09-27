'use client'

import { useMemo } from 'react'
import { formatPropertyMoney } from '../../../inventory-management/components/money'

type LogRow = {
  _id: string
  totalStock: number
  closingStock: number
  salesQuantity: number
  salesValue: number
  wasteQuantity?: number
  compQuantity?: number
  unitCostAtSale?: number
  cogsValue?: number
  isFinalized: boolean
  beverage?: { unitPrice?: number; name?: string } | null
}

export function DailySalesSummary({
  logs,
  closingEdits,
  wasteEdits,
  compEdits,
  currency,
}: {
  logs: LogRow[]
  closingEdits: Record<string, string>
  wasteEdits: Record<string, string>
  compEdits: Record<string, string>
  currency?: string
}) {
  const summary = useMemo(() => {
    let salesQty = 0
    let revenue = 0
    let wasteQty = 0
    let compsQty = 0
    let cogs = 0
    let openLines = 0
    let finalizedLines = 0

    for (const log of logs) {
      const closingRaw = closingEdits[log._id]
      const wasteRaw = wasteEdits[log._id]
      const compRaw = compEdits[log._id]

      const closing =
        closingRaw === undefined || closingRaw === ''
          ? log.closingStock
          : Number(closingRaw)
      const waste =
        wasteRaw === undefined || wasteRaw === ''
          ? (log.wasteQuantity ?? 0)
          : Number(wasteRaw)
      const comps =
        compRaw === undefined || compRaw === ''
          ? (log.compQuantity ?? 0)
          : Number(compRaw)

      const closingOk = !Number.isNaN(closing)
      const wasteOk = !Number.isNaN(waste)
      const compsOk = !Number.isNaN(comps)

      const safeClosing = closingOk ? closing : log.closingStock
      const safeWaste = wasteOk ? waste : (log.wasteQuantity ?? 0)
      const safeComps = compsOk ? comps : (log.compQuantity ?? 0)

      const disappeared = log.totalStock - safeClosing
      const lineSales = Math.max(0, disappeared - safeWaste - safeComps)
      const unitPrice = log.beverage?.unitPrice ?? 0
      const unitCost = log.unitCostAtSale ?? 0

      salesQty += lineSales
      revenue += lineSales * unitPrice
      wasteQty += Math.max(0, safeWaste)
      compsQty += Math.max(0, safeComps)
      cogs += Math.max(0, disappeared) * unitCost

      if (log.isFinalized) finalizedLines += 1
      else openLines += 1
    }

    return {
      skuCount: logs.length,
      salesQty,
      revenue,
      wasteQty,
      compsQty,
      cogs,
      grossProfit: revenue - cogs,
      openLines,
      finalizedLines,
    }
  }, [logs, closingEdits, wasteEdits, compEdits])

  if (logs.length === 0) return null

  const money = (value: number) => formatPropertyMoney(value, currency)

  return (
    <section className="mb-4">
      <h4 className="text-base font-semibold mb-2">Daily sales summary</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryCard label="Qty sold" value={summary.salesQty.toLocaleString()} />
        <SummaryCard label="Revenue" value={money(summary.revenue)} tone="blue" />
        <SummaryCard label="Gross profit" value={money(summary.grossProfit)} tone="green" />
        <SummaryCard
          label="Waste & comps"
          value={(summary.wasteQty + summary.compsQty).toLocaleString()}
          hint={`${summary.wasteQty} waste · ${summary.compsQty} comps`}
          tone="rose"
        />
        <SummaryCard label="SKUs on log" value={String(summary.skuCount)} />
        <SummaryCard
          label="Lines status"
          value={`${summary.finalizedLines}/${summary.skuCount}`}
          hint={summary.openLines > 0 ? `${summary.openLines} still open` : 'All finalized'}
        />
      </div>
    </section>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'blue' | 'green' | 'rose'
}) {
  const tones = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-emerald-50 border-emerald-200',
    rose: 'bg-rose-50 border-rose-200',
    default: 'bg-gray-50 border-gray-200',
  }
  const labelTones = {
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    rose: 'text-rose-700',
    default: 'text-gray-600',
  }
  const valueTones = {
    blue: 'text-blue-900',
    green: 'text-emerald-900',
    rose: 'text-rose-900',
    default: 'text-gray-900',
  }
  const key = tone ?? 'default'

  return (
    <div className={`border rounded-lg p-3 ${tones[key]}`}>
      <div className={`text-xs font-medium ${labelTones[key]}`}>{label}</div>
      <div className={`text-lg font-bold ${valueTones[key]}`}>{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
    </div>
  )
}
