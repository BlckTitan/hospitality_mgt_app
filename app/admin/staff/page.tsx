'use client'

import React, { useState } from 'react'
import { Button } from 'react-bootstrap'
import { FcPlus} from "react-icons/fc";
import BootstrapModal from '../../../shared/modal'
import Staff from './components/staffs'
import { useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const roles = [
  { value: "manager", label: "Manager" },
  { value: "assistantManager", label: "Assistant Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "griller", label: "Griller" },
  { value: "houseKeeper", label: "Housekeeper" },
  { value: "laundryAttendant", label: "Laundry Attendant" },
  { value: "security", label: "Security" },
  { value: "waiter", label: "Waiter" },
  { value: "cook", label: "Cook" },
  { value: "kitchenAssistant", label: "Kitchen Assistant" },
];

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
        //  show={show}
        // onHide={handleClose}
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
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const onSubmit = data => console.log(data);

  console.log(watch("example")); // watch input value by passing the name of it

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <form onSubmit={handleSubmit(onSubmit)} className='createStaffForm'>
      
      <div 
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_input]:w-full [&_input]:h-10 [&_input]:rounded-md [&_input]:border [&_input]:p-2 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start mb-4 [&_div]:gap-1'
      >

        <div className='w-full lg:w-1/2'>
          <label htmlFor="firstName" className='text-left'>First name</label>
          <input id='firstName' className='' {...register("firstName", { required: true })} />
          {errors.firstName && <span>This field is required</span>}
        </div>

        <div className='w-full lg:w-1/2'>
          <label htmlFor="lastName">Last name</label>
          <input id='lastName' className='' {...register("lastName", { required: true })} />
          {errors.lastName && <span>This field is required</span>}
        </div>

      </div>

      <div 
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_input]:w-full [&_input]:h-10 [&_input]:rounded-md [&_input]:border [&_input]:p-2 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start mb-4
        [&_select]:w-full [&_select]:h-10 [&_select]:rounded-md [&_select]:border [&_div]:gap-1'
      >

        <div className='w-full lg:w-1/3'>
          <label htmlFor="phone">Phone</label>
          <input id='phone' className='' {...register("phone", { required: true })} />
          {errors.phone && <span>This field is required</span>}
        </div>

        <div className='w-full lg:w-1/3'>
          <label htmlFor="DoB">Date of Birth</label>
          <DatePicker
            id='DoB'
            // showIcon
            selected={selectedDate}
            onChange={(date: Date | null) => setSelectedDate(date)}
            className="!w-full"
            calendarClassName="!w-full !h-fit flex items-center gap-1 text-black rounded-md shadow-md border relative"
            popperClassName="!z-[9999] !w-[250px] !h-fit rounded-md"
            dateFormat="dd/MM/yyyy"
            fixedHeight
            popperPlacement='top-start'
            portalId="root"
          />
          {errors.DoB && <span>This field is required</span>}
        </div>

        <div className='w-full lg:w-1/3'>

          <label htmlFor="stateOfOrigin">State of Origin</label>

          <select {...register("stateOfOrigin")}>
            <option disabled defaultChecked>- select state of origin -</option>
            <option value="female">female</option>
            <option value="male">male</option>
            <option value="other">other</option>
          </select>

          {errors.stateOfOrigin && <span>This field is required</span>}

        </div>

      </div>

      <div 
        className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_input]:w-full [&_input]:h-10 [&_input]:rounded-md [&_input]:border [&_input]:p-2 
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:gap-1 mb-4'
      >

        <div className='w-full lg:w-2/3'>
          <label htmlFor="Address">Address</label>
          <input id='Address' className='' {...register("Address", { required: true })} />
          {errors.role && <span>This field is required</span>}
        </div>

        <div className='w-full lg:w-1/3'>
          <label htmlFor="salary">salary</label>
          <input id='salary' className='' {...register("salary", { required: true })} />
          {errors.salary && <span>This field is required</span>}
        </div>
      </div>

      <div 
        className='w-full h-fit flex flex-col items-start justify-center lg:flex-row lg:justify-between lg:items-center gap-1 
        [&_select]:w-full [&_select]:h-10 [&_select]:rounded-md [&_select]:border [&_label]:text-left
        [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start mb-4'
      >

        <div className='w-full lg:w-1/3'>
          <label htmlFor="role">Role</label>
          <select {...register("role")} className="border rounded p-2">
            <option key={0} disabled defaultChecked>- select role -</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {errors.role && <span>This field is required</span>}
        </div>

      </div>
      
      <Button type="submit" variant='primary'>Submit</Button>
    </form>
  );
}