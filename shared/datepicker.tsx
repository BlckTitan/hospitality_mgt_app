'use client'

import React from 'react'
import DatePicker from 'react-datepicker'
import { Control, Controller, FieldError } from 'react-hook-form'
import 'react-datepicker/dist/react-datepicker.css'
import { Field, fieldWidthClass } from './field'

interface FormDateProps{
    control: Control<any>
    error?: FieldError
    label: string
    dateWidth: string
    id: string
    name: string
}

export default function DatepickerComponent({control, error, label, dateWidth, id, name}: FormDateProps) {
  return (
    <Field id={id} label={label} widthClass={fieldWidthClass(dateWidth)}>
      <Controller
        name={name}
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <DatePicker
            id={id}
            selected={field.value as Date | null}
            onChange={(date: Date | null) => field.onChange(date)}
            onBlur={field.onBlur}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            wrapperClassName="w-full"
            className="w-full"
            calendarClassName="text-black rounded-md shadow-md border"
            popperClassName="!z-[9999]"
            popperPlacement="bottom-start"
            portalId="root"
          />
        )}
      />
      {error && <span className="text-red-500 text-sm">{error.message}</span>}
    </Field>
  )
}
