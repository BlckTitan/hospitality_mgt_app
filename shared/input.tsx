'use client'
import React from 'react';
import { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { Field, fieldWidthClass } from './field'

interface FormInputProps{
    id: string
    label: string
    inputWidth: string
    register: UseFormRegisterReturn
    error?: FieldError
    type: string
    placeholder?: string
    maxLength?: number
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
    step?: number | string
}

export default function InputComponent({
  id,
  register,
  label,
  type,
  inputWidth,
  error,
  placeholder,
  maxLength,
  inputMode,
  step,
}: FormInputProps) {
  return (
    <Field id={id} label={label} widthClass={fieldWidthClass(inputWidth)}>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        step={step}
        {...register}
      />
      {error && <span className="text-red-500 text-sm">{error.message}</span>}
    </Field>
  )
}
