'use client'
import React from 'react';
import { UseFormRegisterReturn, FieldError } from 'react-hook-form'

interface FormInputProps{
    id: string
    label: string
    inputWidth: string
    register: UseFormRegisterReturn
    error?: FieldError
    type: string
}

export default function InputComponent({id, register, label, type, inputWidth, error}: FormInputProps) {
  return (
    <div className={`w-full lg:${inputWidth}`}>
        <label htmlFor={id}>{label}</label>
        <input id={id} type={type} {...register} />
        {error && <span className='text-red-500 text-sm'>{error.message}</span>}
    </div>

  )
}
