'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { FieldError } from 'react-hook-form'
import { api } from '../convex/_generated/api'
import { Id } from '../convex/_generated/dataModel'
import { Field, fieldWidthClass } from './field'

export type LinkableUser = {
  _id: Id<'users'>
  name: string
  email: string
}

function displayUser(user: LinkableUser) {
  return `${user.name} — ${user.email}`
}

export function applyLinkedUserToStaff(
  user: LinkableUser,
  current: { email?: string },
  setValue: (name: 'email', value: string) => void,
) {
  if (!current.email) {
    setValue('email', user.email);
  }
}

export default function UserAutocomplete({
  value,
  onChange,
  excludeStaffId,
  error,
  inputWidth = 'w-1/2',
}: {
  value?: string
  onChange: (userId: string | undefined, user?: LinkableUser) => void
  excludeStaffId?: Id<'staffs'>
  error?: FieldError
  inputWidth?: string
}) {
  const users = useQuery(
    api.staff.listLinkableUsers,
    excludeStaffId ? { excludeStaffId } : {},
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => users?.find((user) => user._id === value),
    [users, value],
  )

  useEffect(() => {
    if (selected) {
      setQuery(displayUser(selected))
    }
  }, [selected])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = users ?? []
    if (!needle || (selected && needle === displayUser(selected).toLowerCase())) {
      return list
    }
    return list.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle),
    )
  }, [query, users, selected])

  const choose = (user: LinkableUser) => {
    onChange(user._id, user)
    setQuery(displayUser(user))
    setOpen(false)
  }

  const clear = () => {
    onChange(undefined)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlight((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && open && filtered[highlight]) {
      event.preventDefault()
      choose(filtered[highlight])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <Field
      id="linkedLogin"
      label="Linked login (optional)"
      widthClass={fieldWidthClass(inputWidth)}
    >
      <div ref={rootRef} className="relative w-full">
        <input
          id="linkedLogin"
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="linkedLogin-listbox"
          aria-autocomplete="list"
          placeholder="Search by name or email"
          value={query}
          onChange={(event) => {
            const next = event.target.value
            setQuery(next)
            setOpen(true)
            setHighlight(0)
            if (selected && next !== displayUser(selected)) {
              onChange(undefined)
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={value ? 'pr-14' : undefined}
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            onClick={clear}
          >
            Clear
          </button>
        )}
        {open && (
          <ul
            id="linkedLogin-listbox"
            role="listbox"
            className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-sm border bg-white p-0 shadow"
          >
            {users === undefined && (
              <li className="list-none px-2 py-2 text-sm text-gray-500">Loading logins...</li>
            )}
            {users && filtered.length === 0 && (
              <li className="list-none px-2 py-2 text-sm text-gray-500">
                No accepted login matches. Invite the person first.
              </li>
            )}
            {filtered.map((user, index) => (
              <li
                key={user._id}
                role="option"
                aria-selected={user._id === value}
                className={`list-none cursor-pointer px-2 py-2 text-sm ${
                  index === highlight || user._id === value ? 'bg-gray-100' : ''
                }`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(user)
                }}
                onMouseEnter={() => setHighlight(index)}
              >
                {displayUser(user)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Only needed if this person will use Attendance Tracker. Search users who already accepted an invite.
      </p>
      {error && <span className="text-red-500 text-sm">{error.message}</span>}
    </Field>
  )
}
