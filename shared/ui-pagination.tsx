'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

function PageButton({
  active,
  disabled,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center border border-neutral-300 px-3 text-sm',
        active
          ? 'bg-neutral-900 text-white border-neutral-900'
          : 'bg-white text-neutral-800 hover:bg-neutral-50',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function Prev({
  onClick,
  disabled,
}: {
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <PageButton onClick={onClick} disabled={disabled} aria-label="Previous page">
      ‹
    </PageButton>
  )
}

function Next({
  onClick,
  disabled,
}: {
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <PageButton onClick={onClick} disabled={disabled} aria-label="Next page">
      ›
    </PageButton>
  )
}

function Item({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children?: ReactNode
}) {
  return (
    <PageButton active={active} onClick={onClick}>
      {children}
    </PageButton>
  )
}

function PaginationBar({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  return <div className={cn('mt-3 flex flex-wrap items-center gap-1', className)}>{children}</div>
}

PaginationBar.Prev = Prev
PaginationBar.Next = Next
PaginationBar.Item = Item

export default PaginationBar
