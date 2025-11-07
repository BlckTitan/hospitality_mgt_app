'use client'

import React, { useState } from 'react'
import { Button } from 'react-bootstrap'
import { FcPlus} from "react-icons/fc";
import BootstrapModal from '../../../shared/modal'
import Staff from './components/staffs'
import { Controller, useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { states_lga } from '../../../data/nigeria_states_lgas'
import { roles } from '../../../data/roles'

type FormData = {
  DoB: Date | null;
  firstName: string;
  lastName: string;
  role: string;
  address: string;
  phone: string;
  stateOfOrigin: string;
  LGA: string;
  salary: string;
};

 export default function Page() {
  
  const [modalShow, setModalShow] = useState(false);

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b mb-4 flex justify-between items-center'>
        <h3>Staffs</h3>
        <Button 
          variant='light' 
          className='cursor-pointer' 
          style={{width: 'fit', height: 'fit', padding: '0', borderRadius: '100%'}}
          onClick={() => setModalShow(true)}
        >
          <FcPlus className='w-8 h-8'/>
        </Button>
      </header>
      
      <Staff/> 
      
      <ModalComponent modalShow={modalShow} setModalShow={setModalShow}/>

    </div>
  )

}

 
function ModalComponent(props: any) {

  return (
    <>
      <BootstrapModal
        show={props.modalShow}
        onHide={() => props.setModalShow(false)}
        backdrop="static"
        keyboard={false}
        heading="Add New Staff"
        body={
          FormComponent()
        }
      />
    </>
  );
}


function FormComponent() {

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [staffState, setStaffState] = useState<string>('')
  const [LGA, setLGA] = useState<string>('')

  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { DoB: null },
  });
  const onSubmit = data => console.log(data); // watch input value by passing the name of it

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <form onSubmit={handleSubmit(onSubmit)} className='createStaffForm'>
      
      <div 
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_input]:w-full [&_input]:h-10 [&_input]:rounded-md [&_input]:border [&_input]:p-2 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
      >

        <div className='w-full lg:w-1/2'>
          <label htmlFor="firstName" className='text-left'>First name</label>
          <input id='firstName' className='' {...register("firstName", { required: true })} />
          {errors.firstName && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>

        <div className='w-full lg:w-1/2'>
          <label htmlFor="lastName">Last name</label>
          <input id='lastName' className='' {...register("lastName", { required: true })} />
          {errors.lastName && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>

      </div>

      <div 
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
        [&_input]:w-full [&_input]:h-10 [&_input]:rounded-md [&_input]:border [&_input]:p-2 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4
        [&_select]:w-full [&_select]:h-10 [&_select]:rounded-md [&_select]:border
        '
      >

        <div className='w-full lg:w-1/3'>
          <label htmlFor="phone">Phone</label>
          <input id='phone' className='' {...register("phone", { required: true })} />
          {errors.phone && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>

        <div className='w-full lg:w-1/3'>
          <label htmlFor="DoB">Date of Birth</label>
          <Controller
            name="DoB"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <DatePicker
                id="DoB"
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

          
          {errors.DoB && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>

        <div className='w-full lg:w-1/3'>

          <label htmlFor="stateOfOrigin">State of Origin</label>

          <select 
            {...register("stateOfOrigin", { required: true })}
            onChange={(e) => setStaffState(e.target.value)}
            defaultValue=''
          >
            <option value='' disabled>- select state of origin -</option>
            {
              states_lga && states_lga.map((items, index) => (
                <option 
                  key={index} 
                  value={items?.state}
                >
                  {items?.state}
                </option>
              ))
            }
          </select>

          {errors.stateOfOrigin && <span className='text-red-500 text-sm'>This field is required</span>}

        </div>

      </div>

      <div 
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4
        [&_select]:w-full [&_select]:h-10 [&_select]:rounded-md [&_select]:border [&_label]:text-left
        [&_input]:w-full [&_input]:h-10 [&_input]:rounded-md [&_input]:border [&_input]:p-2'
      >

        <div className='w-full lg:w-1/3'>

          <label htmlFor="LGA">Local Government Area</label>

          <select defaultValue='' {...register("LGA", { required: true })}>
            <option disabled value=''>- select local government area -</option>
            {
              (states_lga && (staffState !== '')) && states_lga
              .filter((item) => item.state === staffState)
              .map((item) => (
                item.lgas.map((lga, index) => (
                  <option key={index} value={lga}>{lga}</option>
                ))
              ))
            }
          </select>

          {errors.LGA && <span className='text-red-500 text-sm'>This field is required</span>}

        </div>
        
        <div className='w-full lg:w-2/3'>
          <label htmlFor="Address">Address</label>
          <input id='Address' className='' {...register("address", { required: true })} />
          {errors.address && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>


      </div>

      <div 
        className='w-full h-fit flex flex-col items-start justify-center lg:flex-row lg:justify-start lg:items-center gap-1 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-4
        [&_input]:w-full [&_input]:h-10 [&_input]:rounded-md [&_input]:border [&_input]:p-2
        [&_select]:w-full [&_select]:h-10 [&_select]:rounded-md [&_select]:border [&_label]:text-left'
      >

        <div className='w-full lg:w-1/3'>
          <label htmlFor="salary">Salary</label>

          <input 
            id='salary' 
            type='number' 
            {...register("salary", { required: true, minLength: 5 })} 
          />

          {errors.salary && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>

        <div className='w-full lg:w-1/3'>
          <label htmlFor="role">Role</label>
          <select className="border rounded p-2"  {...register("role", { required: true })} >
            <option key={0} disabled defaultChecked>- select role -</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {errors.role && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>

      </div>
      
      <Button type="submit" variant='primary'>Submit</Button>
    </form>
  );
}