'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React, { useState } from 'react'
import { Button } from 'react-bootstrap'
import { FcPlus } from 'react-icons/fc'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import BootstrapModal from '../../../../shared/modal'
import { usePermissions } from '../../../../hooks/usePermissions'
import { BarManagementPageGuide } from '../components/barManagementPageGuide'
import StockRequests from './components/stockRequests'
import { FormComponent } from './components/createStockRequestForm'

export default function Page() {
  const [modalShow, setModalShow] = useState(false)
  const [propertyId, setPropertyId] = useState('')
  const { hasGranularPermission } = usePermissions()
  const canCreate = hasGranularPermission('fnb.create')

  const propertiesResponse = useQuery(api.property.getAllProperties)
  const properties = propertiesResponse?.data || []
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''

  if (propertiesResponse === undefined) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    )
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Stock requests</h3>
        <div className="flex items-center gap-3">
          <Link href="/admin/bar-management/my-stock" className="text-sm text-blue-700">
            My stock today
          </Link>
          <BackLink />
          {canCreate && (
            <Button
              variant="light"
              className="cursor-pointer"
              style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
              onClick={() => setModalShow(true)}
            >
              <FcPlus className="w-8 h-8" />
            </Button>
          )}
        </div>
      </header>

      <BarManagementPageGuide page="stock-requests" />

      {properties.length > 1 && (
        <div className="mb-4 w-full lg:w-3/12">
          <label className="block text-sm mb-1">Property</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={currentPropertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          >
            {properties.map((property: any) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <StockRequests currentPropertyId={currentPropertyId as Id<'properties'>} />

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => setModalShow(false)}
        propertyId={currentPropertyId}
      />
    </div>
  )
}

function ModalComponent(props: {
  modalShow: boolean
  setModalShow: (show: boolean) => void
  onSuccess: () => void
  propertyId: string
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Request stock"
      body={
        <FormComponent
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
          propertyId={props.propertyId}
        />
      }
    />
  )
}
