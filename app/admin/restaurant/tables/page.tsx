'use client'

import { BackLink } from '../../../../shared/pageHeader'
import React, { useState } from 'react'
import { Button } from '../../../../shared/button'
import { FcPlus } from 'react-icons/fc'
import BootstrapModal from '../../../../shared/modal'
import Tables from './components/tables'
import { FormComponent } from './components/createTableForm'
import { usePermissions } from '../../../../hooks/usePermissions'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { RestaurantPageGuide } from '../components/restaurantPageGuide'

export default function Page() {
  const [modalShow, setModalShow] = useState(false)
  const [propertyId, setPropertyId] = useState('')
  const { hasGranularPermission } = usePermissions()
  const canCreate = hasGranularPermission('restaurant.create')
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {})
  const properties = propertiesResponse?.data ?? []
  const currentPropertyId = (propertyId || properties[0]?._id || '') as Id<'properties'> | ''

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Tables</h1>
          <RestaurantPageGuide page="tables" />
        </div>
        <div className="flex items-center gap-3">
          <BackLink />
          {canCreate && properties.length > 0 && (
            <Button
              variant="light"
              className="cursor-pointer"
              circle
              onClick={() => setModalShow(true)}
            >
              <FcPlus className="w-8 h-8" />
            </Button>
          )}
        </div>
      </header>

      {propertiesResponse === undefined ? (
        <p className="p-4">Loading</p>
      ) : properties.length === 0 ? (
        <p className="p-4 text-xl">No properties yet!</p>
      ) : (
        <Tables
          propertyId={currentPropertyId}
          properties={properties}
          onPropertyChange={setPropertyId}
        />
      )}

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        propertyId={currentPropertyId}
      />
    </div>
  )
}

function ModalComponent(props: {
  modalShow: boolean
  setModalShow: (show: boolean) => void
  propertyId: string
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Add New Table"
      body={<FormComponent propertyId={props.propertyId} />}
    />
  )
}
