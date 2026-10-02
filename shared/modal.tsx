'use client'

import { ReactNode, useEffect } from 'react'
import { cn } from '../lib/utils'

export function ModalFooter({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3', className)}>
      {children}
    </div>
  )
}

/** Compatibility with react-bootstrap Modal.Footer usage */
export const Modal = {
  Footer: ModalFooter,
}

export default function BootstrapModal({
  show,
  onHide,
  heading,
  body,
  children,
  className,
}: {
  show?: boolean
  onHide?: () => void
  heading?: ReactNode
  body?: ReactNode
  children?: ReactNode
  className?: string
  [key: string]: unknown
}) {
  useEffect(() => {
    if (!show) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onHide?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [show, onHide])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-black/50"
        onClick={onHide}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-lg bg-white shadow-lg',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <h2 id="contained-modal-title-vcenter" className="text-lg font-semibold text-neutral-900">
            {heading || 'Modal Heading'}
          </h2>
          <button
            type="button"
            onClick={onHide}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-4">{body || children || 'Modal Body'}</div>
      </div>
    </div>
  )
}
