'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Button } from '../../../../../shared/button'
import { toast } from 'sonner'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'

export default function StoreCount({
  currentPropertyId,
}: {
  currentPropertyId: Id<'properties'>
}) {
  const active = useQuery(api.storeCounts.getActiveStoreCount, {
    propertyId: currentPropertyId,
  })
  const history = useQuery(api.storeCounts.listStoreCounts, {
    propertyId: currentPropertyId,
  })

  const startCount = useMutation(api.storeCounts.startStoreCount)
  const saveLines = useMutation(api.storeCounts.saveStoreCountLines)
  const postCount = useMutation(api.storeCounts.postStoreCount)

  const count = active?.data ?? null
  const isDraft = count?.status === 'draft'

  const [edits, setEdits] = useState<Record<string, { counted: string; notes: string }>>({})

  useEffect(() => {
    if (!count?.lines) return
    const next: Record<string, { counted: string; notes: string }> = {}
    for (const line of count.lines) {
      next[line._id] = {
        counted:
          line.countedQty !== undefined && line.countedQty !== null
            ? String(line.countedQty)
            : '',
        notes: line.notes ?? '',
      }
    }
    setEdits(next)
  }, [count?._id, count?.status, count?.lines?.length])

  const stats = useMemo(() => {
    if (!count?.lines) return { withVariance: 0, net: 0, counted: 0 }
    let withVariance = 0
    let net = 0
    let counted = 0
    for (const line of count.lines) {
      const edit = edits[line._id]
      const countedQty =
        edit?.counted === '' || edit?.counted === undefined
          ? line.countedQty
          : Number(edit.counted)
      if (countedQty === undefined || countedQty === null || Number.isNaN(countedQty)) continue
      counted += 1
      const variance = countedQty - line.bookQty
      net += variance
      if (variance !== 0) withVariance += 1
    }
    return { withVariance, net, counted }
  }, [count?.lines, edits])

  if (active === undefined) {
    return <p className="p-4">Loading</p>
  }

  const handleStart = async () => {
    try {
      const response = await startCount({ propertyId: currentPropertyId })
      if (response.success === false) toast.error(response.message)
      else toast.success(response.message)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start count')
    }
  }

  const handleSave = async () => {
    if (!count || !isDraft) return
    const lines = Object.entries(edits)
      .filter(([, value]) => value.counted !== '')
      .map(([lineId, value]) => ({
        lineId: lineId as Id<'storeCountLines'>,
        countedQty: Number(value.counted),
        notes: value.notes || undefined,
      }))
    if (lines.some((line) => Number.isNaN(line.countedQty) || line.countedQty < 0)) {
      toast.error('Counted qty must be a non-negative number')
      return
    }
    try {
      const response = await saveLines({ countId: count._id, lines })
      if (response.success === false) toast.error(response.message)
      else toast.success(response.message)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save count')
    }
  }

  const handlePost = async () => {
    if (!count || !isDraft) return
    if (!confirm('Post this count? Store on-hand will be set to counted quantities.')) return
    await handleSave()
    try {
      const response = await postCount({ countId: count._id })
      if (response.success === false) toast.error(response.message)
      else toast.success(`${response.message} (net variance ${response.netVarianceQty})`)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to post count')
    }
  }

  return (
    <div className="w-full h-full">
      {!count ? (
        <div className="space-y-3">
          <p className="text-gray-600">
            No store counts yet. Start a draft to snapshot book quantities.
          </p>
          <Button variant="dark" onClick={handleStart}>
            Start store count
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap justify-between gap-3 items-center">
            <div>
              <div className="font-medium">
                {count.countDateKey} · {count.status === 'draft' ? 'In progress' : 'Posted'}
              </div>
              <div className="text-sm text-gray-500">
                Counted by {count.countedBy?.name || 'Unknown'}
                {count.netVarianceQty != null ? ` · Net variance ${count.netVarianceQty}` : ''}
              </div>
            </div>
            <div className="flex gap-2">
              {!isDraft && (
                <Button variant="dark" onClick={handleStart}>
                  Start new count
                </Button>
              )}
              {isDraft && (
                <>
                  <Button variant="outline-secondary" onClick={handleSave}>
                    Save draft
                  </Button>
                  <Button variant="dark" onClick={handlePost}>
                    Post count
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border rounded p-3 bg-amber-50">
              <div className="text-sm text-amber-700">SKUs with variance</div>
              <div className="text-xl font-semibold">{stats.withVariance}</div>
            </div>
            <div
              className={`border rounded p-3 ${stats.net < 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}
            >
              <div className="text-sm text-gray-600">Net unit variance</div>
              <div className="text-xl font-semibold">{stats.net}</div>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <div className="text-sm text-gray-600">Lines counted</div>
              <div className="text-xl font-semibold">{stats.counted}</div>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Beverage</th>
                  <th className="p-2 text-right">Book qty</th>
                  <th className="p-2 text-right">Counted</th>
                  <th className="p-2 text-right">Variance</th>
                  <th className="p-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {count.lines.map((line) => {
                  const edit = edits[line._id] ?? { counted: '', notes: '' }
                  const countedNumber = edit.counted === '' ? NaN : Number(edit.counted)
                  const variance = Number.isNaN(countedNumber)
                    ? null
                    : countedNumber - line.bookQty
                  const tone =
                    variance === null
                      ? ''
                      : variance < 0
                        ? 'bg-rose-50'
                        : variance > 0
                          ? 'bg-emerald-50'
                          : ''
                  return (
                    <tr key={line._id} className={`border-t ${tone}`}>
                      <td className="p-2">{line.beverage?.name || 'Unknown'}</td>
                      <td className="p-2 text-right">{line.bookQty}</td>
                      <td className="p-2 text-right">
                        {isDraft ? (
                          <input
                            type="number"
                            min={0}
                            className="w-24 border rounded p-1 text-right"
                            value={edit.counted}
                            onChange={(event) =>
                              setEdits((current) => ({
                                ...current,
                                [line._id]: { ...edit, counted: event.target.value },
                              }))
                            }
                          />
                        ) : (
                          line.countedQty
                        )}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {variance === null ? '—' : variance > 0 ? `+${variance}` : variance}
                      </td>
                      <td className="p-2">
                        {isDraft ? (
                          <input
                            className="w-full border rounded p-1"
                            value={edit.notes}
                            onChange={(event) =>
                              setEdits((current) => ({
                                ...current,
                                [line._id]: { ...edit, notes: event.target.value },
                              }))
                            }
                          />
                        ) : (
                          line.notes || ''
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(history?.data?.length ?? 0) > 0 && (
        <div>
          <h4 className="font-medium mb-2">Recent counts</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {history!.data!.slice(0, 8).map((row) => (
              <li key={row._id}>
                {row.countDateKey} · {row.status}
                {row.netVarianceQty != null ? ` · net ${row.netVarianceQty}` : ''}
                {row.countedBy?.name ? ` · ${row.countedBy.name}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
