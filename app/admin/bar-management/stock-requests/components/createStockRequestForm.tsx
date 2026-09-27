'use client'

import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Button } from 'react-bootstrap'
import { toast } from 'sonner'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'

type LineDraft = { beverageId: string; qtyRequested: string }

export function FormComponent({
  onSuccess,
  onClose,
  propertyId,
}: {
  onSuccess: () => void
  onClose: () => void
  propertyId: string
}) {
  const createRequest = useMutation(api.stockRequests.createStockRequest)
  const beveragesResponse = useQuery(
    api.beverages.getAllBeverages,
    propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip',
  )
  const barsResponse = useQuery(
    api.bars.getAllBars,
    propertyId ? { propertyId: propertyId as Id<'properties'> } : 'skip',
  )

  const beverages = (beveragesResponse?.data || []).filter((b: any) => b.isActive)
  const bars = (barsResponse?.data || []).filter((b: any) => b.isActive)

  const [barId, setBarId] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([{ beverageId: '', qtyRequested: '' }])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!propertyId || !barId) {
      toast.error('Select a bar')
      return
    }
    const payload = lines
      .filter((line) => line.beverageId && line.qtyRequested)
      .map((line) => ({
        beverageId: line.beverageId as Id<'beverages'>,
        qtyRequested: Number(line.qtyRequested),
      }))
    if (
      payload.length === 0 ||
      payload.some((line) => Number.isNaN(line.qtyRequested) || line.qtyRequested <= 0)
    ) {
      toast.error('Add valid beverage lines')
      return
    }
    try {
      const response = await createRequest({
        propertyId: propertyId as Id<'properties'>,
        barId: barId as Id<'bars'>,
        note: note || undefined,
        lines: payload,
      })
      if (response.success === false) toast.error(response.message)
      else {
        toast.success(response.message)
        setLines([{ beverageId: '', qtyRequested: '' }])
        setNote('')
        setBarId('')
        onSuccess()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit request')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Bar</label>
        <select
          className="border rounded p-2 w-full"
          value={barId}
          onChange={(e) => setBarId(e.target.value)}
        >
          <option value="">Select bar</option>
          {bars.map((bar: any) => (
            <option key={bar._id} value={bar._id}>
              {bar.name}
            </option>
          ))}
        </select>
      </div>
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          <div>
            <label className="block text-sm mb-1">Beverage</label>
            <select
              className="border rounded p-2 w-full"
              value={line.beverageId}
              onChange={(e) =>
                setLines((current) =>
                  current.map((row, i) =>
                    i === index ? { ...row, beverageId: e.target.value } : row,
                  ),
                )
              }
            >
              <option value="">Select beverage</option>
              {beverages.map((beverage: any) => (
                <option key={beverage._id} value={beverage._id}>
                  {beverage.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Qty</label>
            <input
              type="number"
              min={1}
              className="border rounded p-2 w-full"
              value={line.qtyRequested}
              onChange={(e) =>
                setLines((current) =>
                  current.map((row, i) =>
                    i === index ? { ...row, qtyRequested: e.target.value } : row,
                  ),
                )
              }
            />
          </div>
          <div className="flex gap-2">
            {lines.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline-danger"
                onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline-secondary"
        onClick={() => setLines((current) => [...current, { beverageId: '', qtyRequested: '' }])}
      >
        + Add line
      </Button>
      <div>
        <label className="block text-sm mb-1">Note</label>
        <input
          className="border rounded p-2 w-full"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note for the store"
        />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="dark">
          Submit request
        </Button>
      </div>
    </form>
  )
}
