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
    placeholder?: string
}

export default function InputComponent({id, register, label, type, inputWidth, error, placeholder}: FormInputProps) {
  return (
    <div className={`w-full lg:${inputWidth}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} {...register}  placeholder={placeholder}/>
      {error && <span className='text-red-500 text-sm'>{error.message}</span>}
    </div>

  )
}
