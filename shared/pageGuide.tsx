'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function GuideIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 sm:hidden" aria-hidden="true" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function placeGuideButton(button: HTMLButtonElement) {
  const header = button.closest('header')
  if (!(header instanceof HTMLElement)) {
    button.classList.remove('absolute')
    return
  }

  header.classList.add('relative')
  const guides = Array.from(header.querySelectorAll<HTMLButtonElement>('[data-page-guide]'))
  const actions = Array.from(header.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement && !child.contains(button))
    .pop()
  const anchor = actions ?? header
  const headerRect = header.getBoundingClientRect()
  const anchorRect = anchor.getBoundingClientRect()
  const top = anchorRect.top - headerRect.top + (anchorRect.height - button.offsetHeight) / 2
  button.style.top = `${top}px`

  const actionsWidth = actions?.offsetWidth ?? 0
  const index = Math.max(0, guides.indexOf(button))
  let right = actionsWidth + 12
  for (let i = guides.length - 1; i > index; i -= 1) {
    right += guides[i].offsetWidth + 12
  }
  button.style.right = `${right}px`

  const titleCol = button.parentElement
  if (titleCol instanceof HTMLElement && titleCol.parentElement === header) {
    const guidesWidth = guides.reduce((sum, guide) => sum + guide.offsetWidth + 12, 0)
    titleCol.style.paddingRight = `${guidesWidth}px`
  }
}

export function PageGuide({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [placed, setPlaced] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const dialogId = useId()
  const label = open ? 'Hide guide' : 'Show guide'

  useLayoutEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const update = () => placeGuideButton(button)
    update()
    setPlaced(true)
    const header = button.closest('header')
    const observer = new ResizeObserver(update)
    observer.observe(header ?? button)
    observer.observe(button)
    if (header?.lastElementChild && header.lastElementChild !== button.parentElement) {
      observer.observe(header.lastElementChild)
    }
    const media = window.matchMedia('(min-width: 640px)')
    media.addEventListener('change', update)

    return () => {
      observer.disconnect()
      media.removeEventListener('change', update)
      button.style.top = ''
      button.style.right = ''
      const titleCol = button.parentElement
      const remaining = header?.querySelectorAll('[data-page-guide]').length ?? 0
      if (titleCol instanceof HTMLElement && remaining <= 1) {
        titleCol.style.paddingRight = ''
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      buttonRef.current?.focus()
    }
  }, [open])

  const sheet = (
    <div className="fixed inset-0 z-[1050] flex items-end" role="presentation">
      <button
        type="button"
        aria-label="Close page guide"
        className="absolute inset-0 bg-black/45"
        onClick={() => setOpen(false)}
      />
      <div
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[78dvh] w-full overflow-y-auto rounded-t-xl border-t border-gray-200 bg-white px-4 py-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-gray-900">
            Page guide
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="text-sm font-medium text-blue-600 hover:underline"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{text}</p>
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-page-guide=""
        className={`absolute inline-flex appearance-none items-center justify-center border-0 bg-transparent p-0 text-sm font-medium leading-5 whitespace-nowrap text-blue-600 hover:underline ${placed ? '' : 'invisible'}`}
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        <GuideIcon />
        <span className="hidden sm:inline">{label}</span>
      </button>
      {open ? createPortal(sheet, document.body) : null}
    </>
  )
}
