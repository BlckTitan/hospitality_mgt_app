import React from 'react'
import DatePicker from 'react-datepicker'
import { Control, Controller, FieldError } from 'react-hook-form'

interface FormDateProps{
    control: any;
    error?: FieldError
    label: string
    dateWidth: string
    id: string
    name: any
}
export default function DatepickerComponent({control, error, label, dateWidth, id, name}: FormDateProps) {
  return (
    <div className={`w-full lg:${dateWidth}`}>
          <label htmlFor={id}>{label}</label>
          <Controller
            name={name}
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <DatePicker
                id={id}
                selected={field.value as Date | null}
                onChange={(date: Date | null) => field.onChange(date)}
                dateFormat="dd/MM/yyyy"
                className="!w-full"
                calendarClassName="!w-full !h-fit flex items-center gap-1 text-black rounded-md shadow-md border relative"
                popperClassName="!z-[9999] !w-[250px] !h-fit rounded-md"
                fixedHeight
                popperPlacement="top-start"
                portalId="root"
              />
            )}
          />

          {error && <span className='text-red-500 text-sm'>{error.message}</span>}
        </div>
  )
}
