'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const DESK_ONLY = 'Only front-office staff on an open shift can change a reservation.'

export function useFrontOfficeDuty() {
  const duty = useQuery(api.attendance.getMyDuty, {})
  if (duty === undefined) {
    return { ready: false, blocked: true, message: null as string | null }
  }
  if (!duty.success || !duty.data) {
    return {
      ready: true,
      blocked: true,
      message: duty && duty.success === false ? duty.message : DESK_ONLY,
    }
  }
  const onDuty = Boolean(
    duty.data.activeShift &&
      !duty.data.activeShift.isFinalized &&
      duty.data.activeShift.department === 'front-office' &&
      duty.data.requiresFrontOfficeShift,
  )
  if (onDuty) {
    return {
      ready: true,
      blocked: false,
      message: `On duty: ${duty.data.staffName} · Front office`,
    }
  }
  const message = duty.data.requiresFrontOfficeShift
    ? duty.data.blockedReason || 'Start your front-office shift before working the desk.'
    : DESK_ONLY
  return { ready: true, blocked: true, message }
}
