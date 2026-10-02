'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Button } from '../../../../../shared/button'
import { toast } from 'sonner'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { usePermissions } from '../../../../../hooks/usePermissions'

export default function StockRequests({
  currentPropertyId,
}: {
  currentPropertyId: Id<'properties'>
}) {
  const { hasGranularPermission } = usePermissions()
  const canApprove = hasGranularPermission('inventory.update')

  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending')

  const requestsPending = useQuery(
    api.stockRequests.listStockRequests,
    statusFilter === 'pending'
      ? {
          propertyId: currentPropertyId,
          status: 'pending',
          mineOnly: !canApprove,
        }
      : 'skip',
  )
  const requestsPartial = useQuery(
    api.stockRequests.listStockRequests,
    statusFilter === 'pending' && canApprove
      ? {
          propertyId: currentPropertyId,
          status: 'partial',
          mineOnly: false,
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

  const rows =
    statusFilter === 'all'
      ? (requestsAll?.data ?? [])
      : [...(requestsPending?.data ?? []), ...(requestsPartial?.data ?? [])]

  const pendingLineCount = useMemo(
    () =>
      rows.reduce(
        (sum, request) => sum + request.lines.filter((line) => line.status === 'pending').length,
        0,
      ),
    [rows],
  )

  const formatAge = (requestedAt: number) => {
    const minutes = Math.max(0, Math.floor((Date.now() - requestedAt) / 60_000))
    if (minutes < 60) return `${minutes}m`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  const loading =
    statusFilter === 'all'
      ? requestsAll === undefined
      : requestsPending === undefined || (canApprove && requestsPartial === undefined)

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
        <p className="text-gray-600">No stock requests yet.</p>
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
                    {request.note ? ` · ${request.note}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!canApprove && request.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={async () => {
                        const response = await cancelRequest({ requestId: request._id })
                        if (response.success === false) toast.error(response.message)
                        else toast.success(response.message)
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  {canApprove &&
                    (request.status === 'pending' || request.status === 'partial') && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={async () => {
                          const response = await rejectRequest({ requestId: request._id })
                          if (response.success === false) toast.error(response.message)
                          else toast.success(response.message)
                        }}
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
                                  onClick={async () => {
                                    const response = await approveLine({ lineId: line._id })
                                    if (response.success === false) toast.error(response.message)
                                    else toast.success(response.message)
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={async () => {
                                    const response = await rejectLine({ lineId: line._id })
                                    if (response.success === false) toast.error(response.message)
                                    else toast.success(response.message)
                                  }}
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
