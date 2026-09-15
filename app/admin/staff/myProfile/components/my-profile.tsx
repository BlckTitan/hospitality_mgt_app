'use client'

import { useQuery, useConvexAuth } from 'convex/react'
import React, { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import { Button, Spinner } from 'react-bootstrap'
import BootstrapModal from '../../../../../shared/modal'
import { OnboardingStepper } from '../../components/onboardingStepper'
import {
  BankChangeForm,
  ContactChangeForm,
  EmergencyChangeForm,
  TimeOffRequestForm,
} from './profileChangeForms'

type ProfileModal = 'contact' | 'emergency' | 'bank' | 'timeOff' | null

export default function MyProfileComponent() {
  const { isAuthenticated } = useConvexAuth()
  const detail = useQuery(api.staff.getMyStaffDetail, isAuthenticated ? {} : 'skip')
  const [modal, setModal] = useState<ProfileModal>(null)

  if (detail === undefined) {
    return (
      <div className='w-full h-full flex items-center justify-center'>
        <Spinner animation='border' variant='primary' />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className='w-full h-fit flex items-center justify-center'>
        <h3 className='text-xl font-bold'>No staff record is linked to your login. Ask HR to connect your user to Staff.</h3>
      </div>
    )
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className='flex gap-2 py-1 '>
      <p className='font-semibold min-w-40'>{label}:</p>
      <p>{value ?? '—'}</p>
    </div>
  )

  const closeModal = () => setModal(null)

  return (
    <div className='w-full h-full'>
      <section>
        <h4>{detail.lastName} {detail.firstName}</h4>
        <p className='text-sm text-slate-600'>
          {detail.employeeNumber} · {detail.role} · {detail.department}
          {detail.onLeave ? ' · On leave' : ''}
        </p>
        {row('Status', detail.employmentStatus)}
        {row('Employment type', detail.employmentType)}
        {row('Phone', detail.phone)}
        {row('Address', detail.address)}
        {row('Emergency', detail.emergencyName ? `${detail.emergencyName} (${detail.emergencyPhone})` : '—')}
        {row('Payment method', `${detail.paymentMethod || '—'} ${detail.accountNumber ? `(${detail.accountNumber})` : ''}`)}
        {row('Department shift', detail.shiftTemplateName || 'Not assigned')}
      </section>

      <section className='flex flex-wrap gap-2'>
        <Button variant='dark' size='sm' onClick={() => setModal('contact')}>Request a contact change</Button>
        <Button variant='dark' size='sm' onClick={() => setModal('emergency')}>Emergency contact change</Button>
        <Button variant='dark' size='sm' onClick={() => setModal('bank')}>Bank details change</Button>
        <Button variant='dark' size='sm' onClick={() => setModal('timeOff')}>Request time off</Button>
      </section>

      <section className='py-2'>
        <h5>Onboarding</h5>
        <OnboardingStepper compact items={detail.onboarding} />
      </section>

      <div className='flex flex-col lg:flex-row gap-4 items-start'>
        <section className='w-full lg:w-1/2 min-w-0'>
          <h5>Recent hours</h5>
          <table className='w-full text-sm border'>
            <thead>
              <tr className='bg-slate-50'>
                <th className='p-2 text-left'>Date</th>
                <th className='p-2 text-left'>Regular</th>
                <th className='p-2 text-left'>OT</th>
                <th className='p-2 text-left'>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.hours.map((item) => (
                <tr key={item._id} className='border-t'>
                  <td className='p-2'>{new Date(item.workDate).toISOString().slice(0, 10)}</td>
                  <td className='p-2'>{item.regularHours}</td>
                  <td className='p-2'>{item.overtimeHours}</td>
                  <td className='p-2'>{item.status}</td>
                </tr>
              ))}
              {detail.hours.length === 0 && (
                <tr><td className='p-2' colSpan={4}>None yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
        <section className='w-full lg:w-1/2 min-w-0'>
          <h5>Time off</h5>
          <table className='w-full text-sm border'>
            <thead>
              <tr className='bg-slate-50'>
                <th className='p-2 text-left'>Type</th>
                <th className='p-2 text-left'>Dates</th>
                <th className='p-2 text-left'>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.timeOff.map((item) => (
                <tr key={item._id} className='border-t'>
                  <td className='p-2'>{item.timeOffTypeName}</td>
                  <td className='p-2'>
                    {new Date(item.startDate).toISOString().slice(0, 10)} – {new Date(item.endDate).toISOString().slice(0, 10)}
                  </td>
                  <td className='p-2'>{item.status}</td>
                </tr>
              ))}
              {detail.timeOff.length === 0 && (
                <tr><td className='p-2' colSpan={3}>None yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div className='flex flex-col lg:flex-row gap-4 items-start'>
        <section className='w-full lg:w-1/2 min-w-0'>
          <h5>Payslips</h5>
          <table className='w-full text-sm border'>
            <thead>
              <tr className='bg-slate-50'>
                <th className='p-2 text-left'>Generated</th>
              </tr>
            </thead>
            <tbody>
              {detail.payslips.map((item) => (
                <tr key={item._id} className='border-t'>
                  <td className='p-2'>{new Date(item.generatedAt).toISOString().slice(0, 10)}</td>
                </tr>
              ))}
              {detail.payslips.length === 0 && (
                <tr><td className='p-2'>None yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
        <section className='w-full lg:w-1/2 min-w-0'>
          <h5>Your change requests</h5>
          <table className='w-full text-sm border'>
            <thead>
              <tr className='bg-slate-50'>
                <th className='p-2 text-left'>Kind</th>
                <th className='p-2 text-left'>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.changeRequests.map((item) => (
                <tr key={item._id} className='border-t'>
                  <td className='p-2'>{item.kind}</td>
                  <td className='p-2'>{item.status}</td>
                </tr>
              ))}
              {detail.changeRequests.length === 0 && (
                <tr><td className='p-2' colSpan={2}>None yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {modal === 'contact' && (
        <BootstrapModal
          show
          onHide={closeModal}
          backdrop='static'
          keyboard={false}
          heading='Request a contact change'
          body={<ContactChangeForm detail={detail} onDone={closeModal} />}
        />
      )}
      {modal === 'emergency' && (
        <BootstrapModal
          show
          onHide={closeModal}
          backdrop='static'
          keyboard={false}
          heading='Emergency contact change'
          body={<EmergencyChangeForm detail={detail} onDone={closeModal} />}
        />
      )}
      {modal === 'bank' && (
        <BootstrapModal
          show
          onHide={closeModal}
          backdrop='static'
          keyboard={false}
          heading='Bank details change'
          body={<BankChangeForm detail={detail} onDone={closeModal} />}
        />
      )}
      {modal === 'timeOff' && (
        <BootstrapModal
          show
          onHide={closeModal}
          backdrop='static'
          keyboard={false}
          heading='Request time off'
          body={<TimeOffRequestForm detail={detail} onDone={closeModal} />}
        />
      )}
    </div>
  )
}
