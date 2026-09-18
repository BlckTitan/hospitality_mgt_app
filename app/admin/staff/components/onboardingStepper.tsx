'use client'

import { type ReactNode } from 'react'
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md'

type OnboardingItem = {
  _id: string
  label: string
  code?: string
  createdAt?: number
  completedAt?: number
  skipped?: boolean
}

const STEP_ORDER = [
  'personal_details',
  'emergency_contact',
  'id_document',
  'contract',
  'payment_method',
  'tax_id',
  'login_linked',
  'department_shift',
]

function isDone(item: OnboardingItem) {
  return Boolean(item.completedAt || item.skipped)
}

function sortItems(items: OnboardingItem[]) {
  return [...items].sort((a, b) => {
    const aIndex = a.code ? STEP_ORDER.indexOf(a.code) : -1
    const bIndex = b.code ? STEP_ORDER.indexOf(b.code) : -1
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
    }
    return (a.createdAt ?? 0) - (b.createdAt ?? 0)
  })
}

function HorizontalList({
  ordered,
  compact,
  actions,
}: {
  ordered: OnboardingItem[]
  compact: boolean
  actions?: (item: OnboardingItem) => ReactNode
}) {
  return (
    <ol className="flex flex-wrap justify-start list-none p-0 m-0">
      {ordered.map((item, index) => {
        const done = isDone(item)
        const previousDone = index === 0 || isDone(ordered[index - 1])
        const isFirst = index === 0
        const isLast = index === ordered.length - 1
        return (
          <li
            key={item._id}
            className={
              compact
                ? 'flex flex-col items-center flex-[1_1_2.75rem] min-w-[2.5rem] sm:min-w-[3rem]'
                : 'flex flex-col items-center flex-[1_1_8rem] min-w-[7rem] max-w-[10rem]'
            }
          >
            <div className="flex items-center w-full">
              <div
                className={`${compact ? 'h-0.5' : 'h-0.5'} flex-1 ${isFirst ? 'bg-transparent' : previousDone ? 'bg-green-600' : 'bg-slate-200'}`}
              />
              <span className="relative z-[1] bg-white px-0.5 shrink-0">
                {done ? (
                  <MdCheckCircle
                    className={`${compact ? 'text-lg' : 'text-2xl'} text-green-600`}
                    aria-label={`${item.label} complete`}
                  />
                ) : (
                  <MdRadioButtonUnchecked
                    className={`${compact ? 'text-lg' : 'text-2xl'} text-slate-400`}
                    aria-label={`${item.label} open`}
                  />
                )}
              </span>
              <div
                className={`${compact ? 'h-0.5' : 'h-0.5'} flex-1 ${isLast ? 'bg-transparent' : done ? 'bg-green-600' : 'bg-slate-200'}`}
              />
            </div>
            <p
              className={`${compact ? 'text-xs' : 'text-xs'} mt-1.5 px-1 leading-tight text-center w-full ${done ? 'text-green-700' : 'text-slate-600'}`}
            >
              {item.label}
            </p>
            {actions ? <div className="mt-2 mb-3">{actions(item)}</div> : null}
          </li>
        )
      })}
    </ol>
  )
}

function CircularProgress({ done, total }: { done: number; total: number }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const progress = total === 0 ? 0 : done / total
  const offset = circumference * (1 - progress)

  return (
    <span className="relative inline-flex items-center justify-center w-16 h-16">
      <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 56 56" aria-hidden>
        <circle cx="28" cy="28" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="#16a34a"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="relative text-xs font-semibold text-green-700">{done}/{total}</span>
    </span>
  )
}

export function OnboardingStepper({
  items,
  actions,
  compact = false,
}: {
  items: OnboardingItem[]
  actions?: (item: OnboardingItem) => ReactNode
  compact?: boolean
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No checklist items.</p>
  }

  const ordered = sortItems(items)
  const doneCount = ordered.filter(isDone).length
  const remaining = ordered.filter((item) => !isDone(item))

  return (
    <div className={compact ? 'w-full lg:w-4/12 py-2' : 'w-full py-2'}>
      <details className="lg:hidden">
        <summary className="flex size-16 list-none items-center justify-center rounded-full bg-white shadow-md border border-slate-200 overflow-hidden cursor-pointer [&::-webkit-details-marker]:hidden">
          <CircularProgress done={doneCount} total={ordered.length} />
          <span className="sr-only">Onboarding progress. Show remaining steps.</span>
        </summary>
        <ul className="list-none p-0 mt-3 mb-0 space-y-2">
          {remaining.length === 0 ? (
            <li className="text-sm text-green-700">All steps complete.</li>
          ) : (
            remaining.map((item) => (
              <li key={item._id} className="flex items-start justify-between gap-2 text-sm text-slate-700">
                <span className="flex items-center gap-2">
                  <MdRadioButtonUnchecked className="text-base text-slate-400 shrink-0 mt-0.5" />
                  {item.label}
                </span>
                {actions ? <div className="shrink-0">{actions(item)}</div> : null}
              </li>
            ))
          )}
        </ul>
      </details>

      <div className="hidden lg:block">
        <HorizontalList ordered={ordered} compact={compact} actions={actions} />
      </div>
    </div>
  )
}
