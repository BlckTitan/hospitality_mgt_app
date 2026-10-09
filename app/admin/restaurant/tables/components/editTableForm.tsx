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

export function FormComponent(props: {
  id: Id<'restaurantTables'>
  tableNumber: string
  capacity: number
  section?: string
}) {
  const updateTable = useMutation(api.restaurantTables.updateTable)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      tableNumber: props.tableNumber,
      capacity: props.capacity,
      section: props.section ?? '',
    },
  })

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateTable({
        tableId: props.id,
        tableNumber: data.tableNumber,
        capacity: data.capacity,
        section: data.section?.trim() ? data.section : null,
      })
      if (response.success === false) {
        toast.error(response.message)
        return
      }
      toast.success(response.message || 'Table updated')
      setTimeout(() => {
        window.location.href = '/admin/restaurant/tables'
      }, 1500)
    } catch (error) {
      console.error('Edit table failed:', error)
      toast.error('Failed to update table. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editTableForm">
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
