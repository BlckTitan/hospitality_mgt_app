'use client'

import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Button } from '../../../../../shared/button'
import { toast } from 'sonner'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { usePermissions } from '../../../../../hooks/usePermissions'
import { isFloorServiceOnly } from '../../../../../lib/staff-scope'

export default function StockRequests({
  currentPropertyId,
}: {
  currentPropertyId: Id<'properties'>
}) {
  const { hasGranularPermission, roles } = usePermissions()
  const canApprove = hasGranularPermission('inventory.update') && !isFloorServiceOnly(roles)

  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending')
  const inflight = useRef(new Set<string>())
  const [inflightIds, setInflightIds] = useState<string[]>([])

  const requestsOpen = useQuery(
    api.stockRequests.listStockRequests,
    statusFilter === 'pending'
      ? {
          propertyId: currentPropertyId,
          openOnly: true,
          mineOnly: !canApprove,
        }
      : 'skip',
  )
  const requestsAll = useQuery(
    api.stockRequests.listStockRequests,
    statusFilter === 'all'
      ? {
          propertyId: currentPropertyId,
          mineOnly: !canApprove,
        }
      : 'skip',
  )

  const cancelRequest = useMutation(api.stockRequests.cancelStockRequest)
  const approveLine = useMutation(api.stockRequests.approveStockRequestLine)
  const rejectLine = useMutation(api.stockRequests.rejectStockRequestLine)
  const rejectRequest = useMutation(api.stockRequests.rejectStockRequest)

  const rows = useMemo(() => {
    const source = statusFilter === 'all' ? (requestsAll?.data ?? []) : (requestsOpen?.data ?? [])
    const seenRequests = new Set<string>()
    const next = []
    for (const request of source) {
      if (seenRequests.has(request._id)) continue
      seenRequests.add(request._id)
      const seenLines = new Set<string>()
      const lines = []
      for (const line of request.lines) {
        if (seenLines.has(line._id)) continue
        seenLines.add(line._id)
        if (statusFilter === 'pending' && line.status !== 'pending') continue
        lines.push(line)
      }
      if (statusFilter === 'pending' && lines.length === 0) continue
      next.push({ ...request, lines, reviewedCount: request.lines.length - lines.length })
    }
    return next
  }, [requestsAll?.data, requestsOpen?.data, statusFilter])

  const pendingLineCount = useMemo(
    () =>
      rows.reduce(
        (sum, request) => sum + request.lines.filter((line) => line.status === 'pending').length,
        0,
      ),
    [rows],
  )

  const runAction = async (id: string, action: () => Promise<{ success: boolean; message: string }>) => {
    if (inflight.current.has(id)) return
    inflight.current.add(id)
    setInflightIds([...inflight.current])
    try {
      const response = await action()
      if (response.success === false) toast.error(response.message)
      else toast.success(response.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Request failed')
    } finally {
      inflight.current.delete(id)
      setInflightIds([...inflight.current])
    }
  }

  const formatAge = (requestedAt: number) => {
    const minutes = Math.max(0, Math.floor((Date.now() - requestedAt) / 60_000))
    if (minutes < 60) return `${minutes}m`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  const loading = statusFilter === 'all' ? requestsAll === undefined : requestsOpen === undefined

  if (loading) {
    return <p className="p-4">Loading</p>
  }

  return (
    <div className="w-full h-full">
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <Button
          size="sm"
          variant={statusFilter === 'pending' ? 'dark' : 'outline-secondary'}
          onClick={() => setStatusFilter('pending')}
        >
          Pending ({pendingLineCount})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'all' ? 'dark' : 'outline-secondary'}
          onClick={() => setStatusFilter('all')}
        >
          All recent
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-600">
          {statusFilter === 'pending' ? 'No open stock requests.' : 'No stock requests yet.'}
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((request) => (
            <div key={request._id} className="border rounded p-4">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div>
                  <div className="font-medium">
                    {request.requester?.name || 'Unknown'} · {request.bar?.name || 'Unknown bar'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatAge(request.requestedAt)} ago · {request.status}
                    {request.reviewedCount > 0 ? ` · ${request.reviewedCount} already reviewed` : ''}
                    {request.note ? ` · ${request.note}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!canApprove && request.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={inflightIds.includes(request._id)}
                      onClick={() =>
                        runAction(request._id, () => cancelRequest({ requestId: request._id }))
                      }
                    >
                      Cancel
                    </Button>
                  )}
                  {canApprove &&
                    (request.status === 'pending' || request.status === 'partial') && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        disabled={inflightIds.includes(request._id)}
                        onClick={() =>
                          runAction(request._id, () => rejectRequest({ requestId: request._id }))
                        }
                      >
                        Reject all pending
                      </Button>
                    )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-right">Requested</th>
                      <th className="p-2 text-right">Store qty</th>
                      <th className="p-2 text-left">Status</th>
                      {canApprove && <th className="p-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {request.lines.map((line) => (
                      <tr key={line._id} className="border-t">
                        <td className="p-2">{line.beverage?.name || 'Unknown'}</td>
                        <td className="p-2 text-right">{line.qtyRequested}</td>
                        <td className="p-2 text-right">{line.qtyInStore}</td>
                        <td className="p-2">
                          {line.status}
                          {line.qtyApproved != null ? ` (${line.qtyApproved})` : ''}
                        </td>
                        {canApprove && (
                          <td className="p-2 text-right">
                            {line.status === 'pending' && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="dark"
                                  disabled={inflightIds.includes(line._id)}
                                  onClick={() =>
                                    runAction(line._id, () => approveLine({ lineId: line._id }))
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  disabled={inflightIds.includes(line._id)}
                                  onClick={() =>
                                    runAction(line._id, () => rejectLine({ lineId: line._id }))
                                  }
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
