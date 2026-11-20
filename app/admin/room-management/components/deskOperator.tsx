'use client'

import { useQuery } from 'convex/react'
import { createContext, useContext, useEffect, useId, useMemo, useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'

type Receptionist = {
  userId: Id<'users'>
  staffId: Id<'staffs'>
  shiftId?: Id<'shifts'>
  name: string
}

type DeskOperatorValue = {
  ready: boolean
  blocked: boolean
  message: string | null
  mode: 'self' | 'admin' | null
  mustChoose: boolean
  receptionists: Receptionist[]
  deskUserId: string
  setDeskUserId: (userId: string) => void
  userArgs: { deskUserId?: Id<'users'> }
}

const DeskOperatorContext = createContext<DeskOperatorValue | null>(null)

export function DeskOperatorProvider({ children }: { children: React.ReactNode }) {
  const properties = useQuery(api.property.getAllProperties)
  const propertyId = properties?.data?.[0]?._id
  const roster = useQuery(
    api.deskDuty.listOnDutyReceptionists,
    propertyId ? { propertyId } : 'skip',
  )
  const [deskUserId, setDeskUserId] = useState('')

  useEffect(() => {
    if (!roster || roster.mode !== 'admin') return
    if (deskUserId && !roster.receptionists.some((person) => person.userId === deskUserId)) {
      setDeskUserId('')
    }
  }, [roster, deskUserId])

  const value = useMemo<DeskOperatorValue>(() => {
    if (properties === undefined || (propertyId && roster === undefined)) {
      return {
        ready: false,
        blocked: true,
        message: null,
        mode: null,
        mustChoose: false,
        receptionists: [],
        deskUserId,
        setDeskUserId,
        userArgs: {},
      }
    }
    if (!roster) {
      return {
        ready: true,
        blocked: true,
        message: null,
        mode: null,
        mustChoose: false,
        receptionists: [],
        deskUserId,
        setDeskUserId,
        userArgs: {},
      }
    }

    const selected = roster.receptionists.find((person) => person.userId === deskUserId)
    const only = roster.receptionists.length === 1 ? roster.receptionists[0] : undefined
    const active = roster.mode === 'admin' ? selected ?? only : roster.receptionists[0]
    const blocked = roster.mode === 'self'
      ? roster.receptionists.length === 0
      : !active
    const message = roster.mode === 'admin' && active
      ? `Bookings for ${active.name}`
      : roster.message

    return {
      ready: true,
      blocked,
      message,
      mode: roster.mode,
      mustChoose: roster.mustChoose,
      receptionists: roster.receptionists,
      deskUserId,
      setDeskUserId,
      userArgs: roster.mode === 'admin' && active ? { deskUserId: active.userId } : {},
    }
  }, [deskUserId, properties, propertyId, roster])

  return <DeskOperatorContext.Provider value={value}>{children}</DeskOperatorContext.Provider>
}

export function useDeskOperator() {
  const value = useContext(DeskOperatorContext)
  if (!value) {
    throw new Error('useDeskOperator must be used under DeskOperatorProvider')
  }
  return value
}

export function DeskOperatorBar() {
  const desk = useDeskOperator()
  const selectId = useId()
  if (!desk.ready) return null
  const showChoice = desk.mode === 'admin' && desk.mustChoose
  if (!showChoice && !desk.message) return null
  return (
    <div className="mt-2 space-y-2">
      {showChoice ? (
        <label className="block text-sm text-gray-800" htmlFor={selectId}>
          Receptionist *
          <select
            id={selectId}
            className="mt-1 w-full max-w-sm rounded border p-2"
            value={desk.deskUserId}
            onChange={(event) => desk.setDeskUserId(event.target.value)}
          >
            <option value="">Choose the receptionist</option>
            {desk.receptionists.map((person) => (
              <option key={person.userId} value={person.userId}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {desk.message ? (
        <p className={`mb-0 text-sm ${desk.blocked ? 'text-amber-800' : 'text-gray-700'}`}>{desk.message}</p>
      ) : null}
    </div>
  )
}
