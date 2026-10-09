'use client'

import { useMutation, useQuery } from 'convex/react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'sonner'
import { Button } from '../../../../../shared/button'
import InputComponent from '../../../../../shared/input'
import SelectComponent from '../../../../../shared/select'
import { Modal } from '../../../../../shared/modal'
import { Field } from '../../../../../shared/field'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { fieldRowClassName } from '../../../../../shared/field'
import { formSchema } from './validation'

type FormData = {
  menuItemId: string
  name: string
  servings: number
  instructions?: string
}

export function FormComponent({ propertyId }: { propertyId: string }) {
  const upsertRecipe = useMutation(api.recipes.upsertRecipeForMenuItem)
  const menuItems = useQuery(
    api.restaurantMenuItems.listMenuItems,
    propertyId ? { propertyId: propertyId as Id<'properties'>, isActive: true } : 'skip',
  )

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      menuItemId: '',
      name: '',
      servings: 1,
      instructions: '',
    },
  })

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!propertyId) {
      toast.error('Select a property first')
      return
    }
    try {
      const response = await upsertRecipe({
        propertyId: propertyId as Id<'properties'>,
        menuItemId: data.menuItemId as Id<'restaurantMenuItems'>,
        name: data.name,
        servings: data.servings,
        instructions: data.instructions?.trim() || undefined,
      })
      if (!response.success || !response.data?.recipeId) {
        toast.error(response.message)
        return
      }
      toast.success(response.message)
      const recipeId = response.data.recipeId
      setTimeout(() => {
        window.location.href = `/admin/restaurant/recipes/edit?recipe_id=${recipeId}`
      }, 1500)
    } catch (error) {
      console.error('Upsert recipe failed:', error)
      toast.error('Failed to save recipe. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createRecipeForm">
      <div className={fieldRowClassName}>
        <SelectComponent
          id="menuItemId"
          label="Menu item"
          selectWidth="w-1/2"
          defaultText="Select…"
          register={register('menuItemId')}
          error={errors.menuItemId}
          options={(menuItems?.data ?? []).map((item) => ({ value: item._id, label: item.name }))}
          onChange={(event) => {
            const item = (menuItems?.data ?? []).find((row) => row._id === event.target.value)
            if (item) setValue('name', item.name)
          }}
        />
        <InputComponent
          id="name"
          label="Recipe name"
          inputWidth="w-1/2"
          type="text"
          register={register('name')}
          error={errors.name}
        />
      </div>
      <div className={fieldRowClassName}>
        <InputComponent
          id="servings"
          label="Servings"
          inputWidth="w-1/3"
          type="number"
          step="any"
          register={register('servings', { valueAsNumber: true })}
          error={errors.servings}
        />
      </div>
      <div className={fieldRowClassName}>
        <Field id="instructions" label="Instructions (optional)" widthClass="w-full max-w-full min-w-0">
          <textarea
            id="instructions"
            rows={3}
            className="w-full border rounded p-2"
            {...register('instructions')}
          />
          {errors.instructions && (
            <span className="text-red-500 text-sm">{errors.instructions.message}</span>
          )}
        </Field>
      </div>
      <Modal.Footer>
        <Button type="submit" variant="dark">
          Submit
        </Button>
      </Modal.Footer>
    </form>
  )
}
