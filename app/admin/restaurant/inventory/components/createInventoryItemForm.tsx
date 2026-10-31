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
  sku: string
  name: string
  category: string
  unit: string
  openingQuantity: number
  reorderPoint?: number
  unitCost?: number
}

export function FormComponent({ propertyId }: { propertyId: string }) {
  const createItem = useMutation(api.restaurantInventory.createInventoryItem)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      sku: '',
      name: '',
      category: '',
      unit: '',
      openingQuantity: 0,
    },
  })

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!propertyId) {
      toast.error('Select a property first')
      return
    }
    try {
      const response = await createItem({
        propertyId: propertyId as Id<'properties'>,
        sku: data.sku,
        name: data.name,
        category: data.category,
        unit: data.unit,
        openingQuantity: data.openingQuantity,
        reorderPoint: Number.isFinite(data.reorderPoint) ? data.reorderPoint : undefined,
        unitCost: Number.isFinite(data.unitCost) ? data.unitCost : undefined,
      })
      if (response.success === false) {
        toast.error(response.message)
        return
      }
      toast.success(response.message || 'Ingredient added')
      setTimeout(() => {
        window.location.href = '/admin/restaurant/inventory'
      }, 1200)
    } catch (error) {
      console.error('Add restaurant ingredient failed:', error)
      toast.error('Failed to add ingredient. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createRestaurantInventoryForm">
      <div className={fieldRowClassName}>
        <InputComponent
          id="sku"
          label="SKU"
          inputWidth="w-1/2"
          type="text"
          register={register('sku')}
          error={errors.sku}
        />
        <InputComponent
          id="name"
          label="Name"
          inputWidth="w-1/2"
          type="text"
          register={register('name')}
          error={errors.name}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="category"
          label="Category"
          inputWidth="w-1/2"
          type="text"
          register={register('category')}
          error={errors.category}
        />
        <InputComponent
          id="unit"
          label="Unit"
          inputWidth="w-1/2"
          type="text"
          register={register('unit')}
          error={errors.unit}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="openingQuantity"
          label="Opening quantity"
          inputWidth="w-1/2"
          type="number"
          step="any"
          register={register('openingQuantity', { valueAsNumber: true })}
          error={errors.openingQuantity}
        />
        <InputComponent
          id="unitCost"
          label="Unit cost"
          inputWidth="w-1/2"
          type="number"
          step="0.01"
          register={register('unitCost', {
            setValueAs: (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
          })}
          error={errors.unitCost}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="reorderPoint"
          label="Reorder point"
          inputWidth="w-1/2"
          type="number"
          step="any"
          register={register('reorderPoint', {
            setValueAs: (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
          })}
          error={errors.reorderPoint}
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
