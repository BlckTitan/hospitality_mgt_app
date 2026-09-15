'use client'

import { useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Button } from 'react-bootstrap'
import { useState } from 'react'
import { toast } from 'sonner'
import { Id } from '../../../../../convex/_generated/dataModel'

type ProfileDetail = {
  phone?: string
  address?: string
  emergencyName?: string
  emergencyPhone?: string
  emergencyRelationship?: string
  bankName?: string
  accountName?: string
  timeOffTypes?: Array<{ _id: Id<'timeOffTypes'>; name: string }>
}

export function ContactChangeForm({
  detail,
  onDone,
}: {
  detail: ProfileDetail
  onDone: () => void
}) {
  const createChangeRequest = useMutation(api.staff.createChangeRequest)
  const [phone, setPhone] = useState(detail.phone ?? '')
  const [address, setAddress] = useState(detail.address ?? '')

  return (
    <div className='space-y-3'>
      <label className='flex flex-col items-start text-sm w-full'>
        Phone
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label className='flex flex-col items-start text-sm w-full'>
        Address
        <input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <Button
        variant='dark'
        size='sm'
        onClick={async () => {
          const result = await createChangeRequest({
            kind: 'contact',
            payload: { phone: phone || detail.phone, address: address || detail.address },
          })
          if (result.success) {
            toast.success(result.message)
            onDone()
          } else {
            toast.error(result.message)
          }
        }}
      >
        Submit
      </Button>
    </div>
  )
}

export function EmergencyChangeForm({
  detail,
  onDone,
}: {
  detail: ProfileDetail
  onDone: () => void
}) {
  const createChangeRequest = useMutation(api.staff.createChangeRequest)
  const [emergencyName, setEmergencyName] = useState(detail.emergencyName ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(detail.emergencyPhone ?? '')
  const [emergencyRelationship, setEmergencyRelationship] = useState(detail.emergencyRelationship ?? '')

  return (
    <div className='space-y-3'>
      <label className='flex flex-col items-start text-sm w-full'>
        Name
        <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
      </label>
      <label className='flex flex-col items-start text-sm w-full'>
        Phone
        <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
      </label>
      <label className='flex flex-col items-start text-sm w-full'>
        Relationship
        <input value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} />
      </label>
      <Button
        variant='dark'
        size='sm'
        onClick={async () => {
          const result = await createChangeRequest({
            kind: 'emergency',
            payload: { emergencyName, emergencyPhone, emergencyRelationship },
          })
          if (result.success) {
            toast.success(result.message)
            onDone()
          } else {
            toast.error(result.message)
          }
        }}
      >
        Submit
      </Button>
    </div>
  )
}

export function BankChangeForm({
  detail,
  onDone,
}: {
  detail: ProfileDetail
  onDone: () => void
}) {
  const createChangeRequest = useMutation(api.staff.createChangeRequest)
  const [bankName, setBankName] = useState(detail.bankName ?? '')
  const [accountName, setAccountName] = useState(detail.accountName ?? '')
  const [accountNumber, setAccountNumber] = useState('')

  return (
    <div className='space-y-3'>
      <label className='flex flex-col items-start text-sm w-full'>
        Bank name
        <input value={bankName} onChange={(e) => setBankName(e.target.value)} />
      </label>
      <label className='flex flex-col items-start text-sm w-full'>
        Account name
        <input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
      </label>
      <label className='flex flex-col items-start text-sm w-full'>
        Account number
        <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
      </label>
      <Button
        variant='dark'
        size='sm'
        onClick={async () => {
          const result = await createChangeRequest({
            kind: 'bank',
            payload: { paymentMethod: 'bank', bankName, accountName, accountNumber },
          })
          if (result.success) {
            toast.success(result.message)
            onDone()
          } else {
            toast.error(result.message)
          }
        }}
      >
        Submit
      </Button>
    </div>
  )
}

export function TimeOffRequestForm({
  detail,
  onDone,
}: {
  detail: ProfileDetail
  onDone: () => void
}) {
  const requestTimeOff = useMutation(api.staff.requestOwnTimeOff)
  const [timeOffTypeId, setTimeOffTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  return (
    <div className='space-y-3'>
      <label className='flex flex-col items-start text-sm w-full'>
        Type
        <select value={timeOffTypeId} onChange={(e) => setTimeOffTypeId(e.target.value)}>
          <option value=''>Select type</option>
          {detail.timeOffTypes?.map((type) => (
            <option key={type._id} value={type._id}>{type.name}</option>
          ))}
        </select>
      </label>
      <label className='flex flex-col items-start text-sm w-full'>
        Start
        <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>
      <label className='flex flex-col items-start text-sm w-full'>
        End
        <input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>
      <Button
        variant='dark'
        size='sm'
        onClick={async () => {
          if (!timeOffTypeId || !startDate || !endDate) {
            toast.error('Select a type and dates')
            return
          }
          const result = await requestTimeOff({
            timeOffTypeId: timeOffTypeId as Id<'timeOffTypes'>,
            startDate: new Date(startDate).getTime(),
            endDate: new Date(endDate).getTime(),
          })
          if (result.success) {
            toast.success(result.message)
            onDone()
          } else {
            toast.error(result.message)
          }
        }}
      >
        Request
      </Button>
    </div>
  )
}
