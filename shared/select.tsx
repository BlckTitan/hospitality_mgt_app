import React, { Dispatch, SetStateAction } from 'react'
import { FieldError, UseFormRegisterReturn } from 'react-hook-form'
import { Field, fieldWidthClass } from './field'

export type SelectOption = {
  value: string
  label: string
}

interface FormSelectProps{
    id: string
    label: string
    data?: { state?: string; lgas?: string[]; }[];
    options?: SelectOption[]
    setStaffState?: Dispatch<SetStateAction<string>>
    selectWidth: string
    defaultText?: string
    register: UseFormRegisterReturn
    error?: FieldError
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function SelectComponent({
  data,
  options,
  error,
  setStaffState,
  register,
  label,
  id,
  selectWidth,
  defaultText,
  onChange,
}: FormSelectProps) {
  return (
    <Field id={id} label={label} widthClass={fieldWidthClass(selectWidth)}>
      <select
        id={id}
        className="w-full max-w-full min-w-0"
        defaultValue={defaultText ? '' : undefined}
        {...register}
        onChange={(e) => {
          void register.onChange(e)
          setStaffState?.(e.target.value)
          onChange?.(e)
        }}
      >
        {defaultText && (
          <option value="" disabled>{defaultText}</option>
        )}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {data?.map((items, index) => (
          <option key={index} value={items?.state}>
            {items?.state}
          </option>
        ))}
      </select>
      {error && <span className="text-red-500 text-sm">{error.message}</span>}
    </Field>
  )
}
