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
    required?: boolean
}

export default function DatepickerComponent({control, error, label, dateWidth, id, name, required = true}: FormDateProps) {
  return (
    <Field id={id} label={label} widthClass={fieldWidthClass(dateWidth)}>
      <Controller
        name={name}
        control={control}
        rules={required ? { required: true } : undefined}
        render={({ field }) => {
          const selected = field.value instanceof Date && !Number.isNaN(field.value.getTime())
            ? field.value
            : null;
          return (
          <DatePicker
            id={id}
            selected={selected}
            onChange={(date: Date | null) => field.onChange(date)}
            onBlur={field.onBlur}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            isClearable={!required}
            ariaLabelClose="Clear date"
            wrapperClassName="w-full"
            className="w-full"
            calendarClassName="text-black rounded-md shadow-md border"
            popperClassName="!z-[9999]"
            popperPlacement="bottom-start"
            portalId="root"
          />
          );
        }}
      />
      {error && <span className="text-red-500 text-sm">{error.message}</span>}
    </Field>
  )
}
