import React, { Dispatch, SetStateAction } from 'react'
import { FieldError, UseFormRegisterReturn } from 'react-hook-form'

interface FormSelectProps{
    id: string
    label: string
    data?: { state?: string; lgas?: string[]; }[];
    setStaffState?: Dispatch<SetStateAction<string>>
    selectWidth: string
    defaultText: string
    register: UseFormRegisterReturn
    error?: FieldError
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function SelectComponent({data, error, setStaffState, register, label, id, selectWidth, defaultText}: FormSelectProps) {
  return (
    <div className={`w-full lg:${selectWidth}`}>

          <label htmlFor={id}>{label}</label>

          <select 
            {...register}
            onChange={(e) => setStaffState(e.target.value)}
            defaultValue=''
          >
            <option value='' disabled>{defaultText}</option>
            {
              data && data.map((items, index) => (
                <option 
                  key={index} 
                  value={items?.state}
                >
                  {items?.state}
                </option>
              ))
            }
          </select>

          {error && <span className='text-red-500 text-sm'>{error.message}</span>}

        </div>
  )
}
