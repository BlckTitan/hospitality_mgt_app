'use client'

import { useMutation, useQuery, useConvexAuth } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import React, { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import { Button, Spinner } from 'react-bootstrap'
import Image from 'next/image'
import { Id } from '../../../../../convex/_generated/dataModel';
import Avatar from '../../../../../public/profileAvatar.webp'
import { toast } from 'sonner'
import { usePermissions } from '../../../../../hooks/usePermissions'
import { fieldWidthClass } from '../../../../../shared/field'
import { OnboardingStepper } from '../../components/onboardingStepper'

const TABS = ['Profile', 'Hours', 'Time off', 'Pay', 'Documents', 'Onboarding'] as const

export default function StaffViewComponent() {
  const { isAuthenticated } = useConvexAuth()
  const query = useSearchParams()
  const id = query.get('staff_id')
  const { hasGranularPermission } = usePermissions()
  const canPay = hasGranularPermission('staff.compensation.read')
  const canPayUpdate = hasGranularPermission('staff.compensation.update')
  const canUpdate = hasGranularPermission('staff.update')
  const [tab, setTab] = useState<(typeof TABS)[number]>('Profile')
  const [documentKind, setDocumentKind] = useState<'contract' | 'id' | 'tax_form' | 'bank_letter' | 'policy' | 'other'>('contract')
  const [payItemTypeId, setPayItemTypeId] = useState('')
  const [payItemAmount, setPayItemAmount] = useState('')
  const upsertPayItem = useMutation(api.staff.upsertStaffPayItem)
  const staffData = useQuery(
    api.staff.getStaffDetail,
    isAuthenticated && id ? { staff_id: id as Id<'staffs'> } : 'skip'
  )
  const completeItem = useMutation(api.staff.completeOnboardingItem)
  const reviewRequest = useMutation(api.staff.reviewChangeRequest)
  const generateUploadUrl = useMutation(api.staff.generateStaffDocumentUploadUrl)
  const attachDocument = useMutation(api.staff.attachStaffDocument)
  const deleteDocument = useMutation(api.staff.deleteStaffDocument)

  if (staffData === undefined) {
    return (
      <div className='w-full h-full flex items-center justify-center'>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }
  if (!staffData) {
    return (
      <div className='w-full h-fit flex items-center justify-center'>
        <h3 className='text-xl font-bold'>No data available</h3>
      </div>
    )
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className='flex gap-2 py-1'>
      <p className='font-semibold min-w-40'>{label}:</p>
      <p>{value ?? '—'}</p>
    </div>
  )

  return (
    <div className='w-full h-full'>
      <div className='flex items-center gap-4 mb-4'>
        <Image
          src={Avatar}
          alt='profile avatar'
          width={100}
          height={100}
          className='w-24 h-24 rounded-full object-cover'
        />
        <div>
          <h4>{staffData.lastName} {staffData.firstName}</h4>
          <p className='text-sm text-slate-600'>{staffData.employeeNumber} · {staffData.role} · {staffData.department}</p>
          {staffData.onLeave ? <span className='text-xs bg-amber-100 px-2 py-1 rounded'>On leave</span> : null}
        </div>
      </div>

      <div className='flex flex-wrap gap-2 mb-4'>
        {TABS.filter((item) => item !== 'Pay' || canPay).map((item) => (
          <Button key={item} size='sm' variant={tab === item ? 'dark' : 'outline-secondary'} onClick={() => setTab(item)}>
            {item}
          </Button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div>
          {row('Hire date', staffData.dateRecruited?.substring(0, 10))}
          {row('Employment type', staffData.employmentType)}
          {row('Status', staffData.employmentStatus)}
          {row('Manager', staffData.managerName)}
          {row('Department shift', staffData.shiftTemplateName)}
          {row('Linked login', staffData.linkedLogin ? `${staffData.linkedLogin.name} — ${staffData.linkedLogin.email}` : 'Not linked')}
          {row('Phone', staffData.phone)}
          {row('Address', staffData.address)}
          {row('Emergency', staffData.emergencyName ? `${staffData.emergencyName} (${staffData.emergencyPhone})` : '—')}
          {canPay && row('Salary', staffData.salary != null ? `#${staffData.salary}` : '—')}
          {canPay && row('Payment method', staffData.paymentMethod)}
          {staffData.changeRequests?.filter((item) => item.status === 'pending').length > 0 && (
            <div className='mt-4'>
              <h5>Pending change requests</h5>
              {staffData.changeRequests.filter((item) => item.status === 'pending').map((item) => (
                <div key={item._id} className='border rounded p-2 mb-2'>
                  <p className='font-semibold'>{item.kind}</p>
                  <pre className='text-xs overflow-x-auto'>{JSON.stringify(item.payload, null, 2)}</pre>
                  {canUpdate && (
                    <div className='flex gap-2 mt-2'>
                      <Button size='sm' onClick={async () => {
                        const result = await reviewRequest({ requestId: item._id, status: 'approved' })
                        result.success ? toast.success(result.message) : toast.error(result.message)
                      }}>Approve</Button>
                      <Button size='sm' variant='outline-danger' onClick={async () => {
                        const result = await reviewRequest({ requestId: item._id, status: 'rejected' })
                        result.success ? toast.success(result.message) : toast.error(result.message)
                      }}>Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Hours' && (
        <table className='w-full text-sm border'>
          <thead><tr className='bg-slate-50'><th className='p-2'>Date</th><th className='p-2'>Regular</th><th className='p-2'>OT</th><th className='p-2'>Status</th></tr></thead>
          <tbody>
            {staffData.hours.map((item) => (
              <tr key={item._id} className='border-t'>
                <td className='p-2'>{new Date(item.workDate).toISOString().slice(0, 10)}</td>
                <td className='p-2'>{item.regularHours}</td>
                <td className='p-2'>{item.overtimeHours}</td>
                <td className='p-2'>{item.status}</td>
              </tr>
            ))}
            {staffData.hours.length === 0 && <tr><td className='p-2' colSpan={4}>No hours yet.</td></tr>}
          </tbody>
        </table>
      )}

      {tab === 'Time off' && (
        <table className='w-full text-sm border'>
          <thead><tr className='bg-slate-50'><th className='p-2'>Type</th><th className='p-2'>Dates</th><th className='p-2'>Status</th></tr></thead>
          <tbody>
            {staffData.timeOff.map((item) => (
              <tr key={item._id} className='border-t'>
                <td className='p-2'>{item.timeOffTypeName}</td>
                <td className='p-2'>{new Date(item.startDate).toISOString().slice(0, 10)} – {new Date(item.endDate).toISOString().slice(0, 10)}</td>
                <td className='p-2'>{item.status}</td>
              </tr>
            ))}
            {staffData.timeOff.length === 0 && <tr><td className='p-2' colSpan={3}>No time off.</td></tr>}
          </tbody>
        </table>
      )}

      {tab === 'Pay' && (
        canPay ? (
          <div className='space-y-4'>
            <div className='flex flex-col lg:flex-row gap-4 items-start'>
              <div className='w-full lg:w-1/2 min-w-0'>
                <h5>Pay history</h5>
                <table className='w-full text-sm border'>
                  <thead><tr className='bg-slate-50'><th className='p-2 text-left'>From</th><th className='p-2 text-left'>Type</th><th className='p-2 text-left'>Salary</th><th className='p-2 text-left'>Hourly</th></tr></thead>
                  <tbody>
                    {staffData.payHistory.map((item) => (
                      <tr key={item._id} className='border-t'>
                        <td className='p-2'>{new Date(item.effectiveFrom).toISOString().slice(0, 10)}</td>
                        <td className='p-2'>{item.payType}</td>
                        <td className='p-2'>{item.baseSalary ?? '—'}</td>
                        <td className='p-2'>{item.hourlyRate ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className='w-full lg:w-1/2 min-w-0'>
                <h5>Recent staff pay</h5>
                <table className='w-full text-sm border'>
                  <thead><tr className='bg-slate-50'><th className='p-2 text-left'>Gross</th><th className='p-2 text-left'>Net</th></tr></thead>
                  <tbody>
                    {staffData.staffPay.map((item: { _id: string; grossPay?: number; netPay?: number }) => (
                      <tr key={item._id} className='border-t'>
                        <td className='p-2'>{item.grossPay ?? '—'}</td>
                        <td className='p-2'>{item.netPay ?? '—'}</td>
                      </tr>
                    ))}
                    {staffData.staffPay.length === 0 && (
                      <tr><td className='p-2' colSpan={2}>None yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h5>Pay items</h5>
              <ul className='mb-3'>
                {staffData.payItems.map((item) => (
                  <li key={item._id}>
                    {item.name ?? item.code} · {item.kind ?? 'item'} · {item.isEnabled ? 'On' : 'Off'}
                    {item.amount != null ? ` · ${item.amount}` : ''}
                  </li>
                ))}
                {staffData.payItems.length === 0 && <li>No pay items assigned.</li>}
              </ul>
              {canPayUpdate && (
                <div className='w-full h-fit flex flex-col lg:flex-row justify-start items-stretch lg:items-end gap-2 mb-2 lg:mb-4'>
                  <label className={`${fieldWidthClass('w-3/12')} flex flex-col items-start text-sm`}>
                    Pay item
                    <select value={payItemTypeId} onChange={(e) => setPayItemTypeId(e.target.value)}>
                      <option value=''>Select pay item</option>
                      {staffData.availablePayItemTypes?.map((item) => (
                        <option key={item._id} value={item._id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className={`${fieldWidthClass('w-3/12')} flex flex-col items-start text-sm`}>
                    Amount
                    <input
                      placeholder='Amount'
                      value={payItemAmount}
                      onChange={(e) => setPayItemAmount(e.target.value)}
                    />
                  </label>
                  <div className={`${fieldWidthClass('w-3/12')} flex items-end justify-start`}>
                    <Button
                      variant='dark'
                      className='h-10'
                      onClick={async () => {
                        if (!id || !payItemTypeId) return
                        const result = await upsertPayItem({
                          employeeId: id as Id<'staffs'>,
                          payItemTypeId: payItemTypeId as Id<'payItemTypes'>,
                          amount: payItemAmount ? Number(payItemAmount) : undefined,
                          isEnabled: true,
                        })
                        result.success ? toast.success(result.message) : toast.error(result.message)
                      }}
                    >
                      Save item
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p>You do not have permission to view compensation.</p>
        )
      )}

      {tab === 'Documents' && (
        <div>
          {canUpdate && (
            <label className='block mb-3 text-sm'>
              Upload
              <select
                className='border rounded p-2 block mt-1 mb-2'
                value={documentKind}
                onChange={(e) => setDocumentKind(e.target.value as typeof documentKind)}
              >
                <option value='contract'>Contract</option>
                <option value='id'>ID</option>
                <option value='tax_form'>Tax form</option>
                <option value='bank_letter'>Bank letter</option>
                <option value='policy'>Policy</option>
                <option value='other'>Other</option>
              </select>
              <input
                type='file'
                className='block mt-1'
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file || !id) return
                  const postUrl = await generateUploadUrl()
                  const result = await fetch(postUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': file.type },
                    body: file,
                  })
                  const { storageId } = await result.json()
                  const attached = await attachDocument({
                    employeeId: id as Id<'staffs'>,
                    kind: documentKind,
                    storageId,
                    fileName: file.name,
                    mimeType: file.type,
                    fileSize: file.size,
                  })
                  attached.success ? toast.success(attached.message) : toast.error(attached.message)
                  event.target.value = ''
                }}
              />
            </label>
          )}
          <ul className='space-y-2'>
            {staffData.documents.map((doc) => (
              <li key={doc._id} className='flex gap-3 items-center'>
                <a href={doc.url ?? '#'} target='_blank' rel='noreferrer'>{doc.fileName}</a>
                <span className='text-xs text-slate-500'>{doc.kind}</span>
                {canUpdate && (
                  <Button size='sm' variant='outline-danger' onClick={async () => {
                    const result = await deleteDocument({ documentId: doc._id })
                    result.success ? toast.success(result.message) : toast.error(result.message)
                  }}>Remove</Button>
                )}
              </li>
            ))}
            {staffData.documents.length === 0 && <li>No documents yet.</li>}
          </ul>
        </div>
      )}

      {tab === 'Onboarding' && (
        <OnboardingStepper
          items={staffData.onboarding}
          actions={canUpdate ? (item) => (
            !item.completedAt && !item.skipped ? (
              <div className='flex flex-col gap-1 items-center'>
                <Button size='sm' variant='dark' onClick={async () => {
                  const result = await completeItem({ itemId: item._id })
                  result.success ? toast.success(result.message) : toast.error(result.message)
                }}>Complete</Button>
                <Button size='sm' variant='outline-secondary' onClick={async () => {
                  const result = await completeItem({ itemId: item._id, skipped: true })
                  result.success ? toast.success(result.message) : toast.error(result.message)
                }}>Skip</Button>
              </div>
            ) : null
          ) : undefined}
        />
      )}
    </div>
  )
}
