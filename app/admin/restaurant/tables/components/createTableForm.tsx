'use client'

import { useMutation } from 'convex/react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'sonner'
import { Button } from '../../../../../shared/button'
import InputComponent from '../../../../../shared/input'
import { Modal } from '../../../../../shared/modal'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { fieldRowClassName } from '../../../../../shared/field'
import { formSchema } from './validation'

type FormData = {
  tableNumber: string
  capacity: number
  section?: string
}

export function FormComponent({ propertyId }: { propertyId: string }) {
  const createTable = useMutation(api.restaurantTables.createTable)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      tableNumber: '',
      capacity: 4,
      section: '',
    },
  })

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!propertyId) {
      toast.error('Select a property first')
      return
    }
    try {
      const response = await createTable({
        propertyId: propertyId as Id<'properties'>,
        tableNumber: data.tableNumber,
        capacity: data.capacity,
        section: data.section?.trim() || undefined,
      })
      if (response.success === false) {
        toast.error(response.message)
        return
      }
      toast.success(response.message || 'Table created')
      setTimeout(() => {
        window.location.href = '/admin/restaurant/tables'
      }, 1500)
    } catch (error) {
      console.error('Add table failed:', error)
      toast.error('Failed to add table. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createTableForm">
      <div className={fieldRowClassName}>
        <InputComponent
          id="tableNumber"
          label="Table number"
          inputWidth="w-1/2"
          type="text"
          register={register('tableNumber')}
          error={errors.tableNumber}
        />
        <InputComponent
          id="capacity"
          label="Capacity"
          inputWidth="w-1/2"
          type="number"
          register={register('capacity', { valueAsNumber: true })}
          error={errors.capacity}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="section"
          label="Section (optional)"
          inputWidth="w-1/2"
          type="text"
          register={register('section')}
          error={errors.section}
        />
      </div>
      <Modal.Footer>
        <Button type="submit" variant="dark">
          Submit
        </Button>
      </Modal.Footer>
    </form>
  )
}
