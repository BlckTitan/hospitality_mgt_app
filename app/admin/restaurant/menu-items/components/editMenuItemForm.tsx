'use client'

import { useMutation } from 'convex/react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'sonner'
import { Button } from '../../../../../shared/button'
import InputComponent from '../../../../../shared/input'
import SelectComponent from '../../../../../shared/select'
import { Modal } from '../../../../../shared/modal'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { fieldRowClassName } from '../../../../../shared/field'
import { formSchema, STATION_OPTIONS } from './validation'

type Station = 'kitchen' | 'grill' | 'other'

type FormData = {
  name: string
  category: string
  station: Station
  price: number
  isAvailable: boolean
}

export function FormComponent(props: {
  id: Id<'restaurantMenuItems'>
  name: string
  category: string
  station: Station
  price: number
  isAvailable: boolean
}) {
  const updateMenuItem = useMutation(api.restaurantMenuItems.updateMenuItem)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: props.name,
      category: props.category,
      station: props.station,
      price: props.price,
      isAvailable: props.isAvailable,
    },
  })

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateMenuItem({
        menuItemId: props.id,
        name: data.name,
        category: data.category,
        station: data.station,
        price: data.price,
        isAvailable: data.isAvailable,
      })
      if (response.success === false) {
        toast.error(response.message)
        return
      }
      toast.success(response.message || 'Menu item updated')
      setTimeout(() => {
        window.location.href = '/admin/restaurant/menu-items'
      }, 1500)
    } catch (error) {
      console.error('Edit menu item failed:', error)
      toast.error('Failed to update menu item. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editMenuItemForm">
      <div className={fieldRowClassName}>
        <InputComponent
          id="name"
          label="Name"
          inputWidth="w-1/2"
          type="text"
          register={register('name')}
          error={errors.name}
        />
        <InputComponent
          id="category"
          label="Category"
          inputWidth="w-1/2"
          type="text"
          register={register('category')}
          error={errors.category}
        />
      </div>
      <div className={fieldRowClassName}>
        <SelectComponent
          id="station"
          label="Station"
          selectWidth="w-1/2"
          register={register('station')}
          options={STATION_OPTIONS}
          error={errors.station}
        />
        <InputComponent
          id="price"
          label="Price"
          inputWidth="w-1/2"
          type="number"
          step="0.01"
          register={register('price', { valueAsNumber: true })}
          error={errors.price}
        />
      </div>
      <div className={fieldRowClassName}>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isAvailable')} />
          Available on POS
        </label>
      </div>
      <Modal.Footer>
        <Button type="submit" variant="dark">
          Submit
        </Button>
      </Modal.Footer>
    </form>
  )
}
