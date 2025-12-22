import { useMutation } from "convex/react";
import { Button } from "react-bootstrap";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import DatepickerComponent from "../../../../shared/datepicker";
import SelectComponent from "../../../../shared/select";
import { roles, states_lga } from "../../../../lib/data";

type FormData = {
    id: Id<'staffs'>;
    DoB: Date | null;
    dateRecruited: Date | null;
    firstName: string;
    lastName: string;
    role: "Manager" | "Assistant Manager" | "Supervisor" | "Griller" | "Housekeeper" | "Laundry Attendant" | "Security" | 'Receptionist' | null;
    address: string;
    phone: string;
    email: string
    stateOfOrigin: string;
    LGA: string;
    dateTerminated?: Date | null;
    employmentStatus: string
    salary: number;
  };

export function FormComponent(
    {
      firstName, lastName, phone, DoB, LGA,
      email, employmentStatus, address,
      dateTerminated, dateRecruited,
      stateOfOrigin, role, salary, id
    }) {
  
    const updateStaff = useMutation(api.staff.updateStaff)
  
    const [staffState, setStaffState] = useState<string>('')
  
    const { control, register, handleSubmit, formState: { errors } } = useForm<FormData>({
      resolver: yupResolver(formSchema) as any,
      defaultValues: { 
        dateTerminated: dateTerminated,
        email: email,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        DoB: DoB,
        stateOfOrigin: stateOfOrigin,
        LGA: LGA,
        address: address,
        salary: salary,
        employmentStatus: employmentStatus,
        dateRecruited: dateRecruited,
        role: role
      },
    });
  
    const onSubmit: SubmitHandler<FormData | FieldValues> = async (data) => { 
      try {
        const response = await updateStaff({
          id: id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          DoB: data.DoB ? data.DoB.toISOString() : null,
          stateOfOrigin: data.stateOfOrigin,
          address: data.address,
          LGA: data.LGA,
          email: data.email,
          employmentStatus: data.employmentStatus,
          dateRecruited: new Date().toISOString(),
          salary: Number(data.salary),
          role: data.role,
          dateTerminated: (data.employmentStatus === 'terminated') ? new Date().toISOString() : ''
        })
  
        if(response.success === false){
          toast.error(response.message);
        }else{          
  
          toast.success("New staff updated successfully!");
          console.log("Staff updated with ID:", response);
  
          //redirect to staff page form on submission
          setTimeout(() => {
            window.location.href = "/admin/staff";
          }, 3000)
  
        }
  
      } catch (error: any) {
        console.error("Edit staff failed:", error);
        toast.error("Failed to update staff. Please try again.");
      }
      
    }
  
    return (
      <>
        {/*"handleSubmit" will validate your inputs before invoking "onSubmit"*/}
        <form onSubmit={handleSubmit(onSubmit)} className='mt-4'>
          
          <div 
            className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
            [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
          >
    
            <InputComponent
              id='firstName' label='First Name'
              type='string' inputWidth='w-1/2'
              register={register("firstName", { required: true })} error={errors.firstName}
            /> 
    
            <InputComponent
              id='lastName' label='Last Name'
              type='string' inputWidth='w-1/2'
              register={register("lastName", { required: true })} error={errors.firstName}
            />
    
          </div>
    
          <div 
            className='w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 
            [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4
            '
          >
    
            <InputComponent
              id='phone' label='Phone'
              inputWidth='w-1/3' type='tel'
              register={register("phone", { required: true })} error={errors.phone}
            />
    
            <DatepickerComponent
              id='DoB'
              label="Date of Birth"
              dateWidth='w-1/3'
              name='DoB'
              control={control}
              error={errors.DoB}
            />
    
            <InputComponent
              id='email' label='Email'
              inputWidth='w-1/3' type='email'
              register={register("email", { required: true })} error={errors.email}
            />
    
          </div>
    
          <div 
            className='w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 
            [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4'
          >
    
            <SelectComponent
              id='stateOfOrigin' label='State of Origin' defaultText='select state of origin'
              data={states_lga}
              setStaffState={setStaffState} selectWidth='w-1/3' 
              register={register("stateOfOrigin", { required: true })}
              error={errors.stateOfOrigin}
            />
    
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
    
            <InputComponent
              id='address' label='Address'
              inputWidth='w-1/3' type='address'
              register={register("address", { required: true })} error={errors.address}
            />
    
          </div>
    
          <div 
            className='w-full h-fit flex flex-col items-start justify-center lg:flex-row lg:justify-start lg:items-center gap-1 
            [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-4'
          >
    
            <InputComponent
              id='salary' label='Salary'
              inputWidth='w-1/3' type='number'
              register={register("salary", { required: true })} error={errors.salary}
            />
    
            <div className='w-full lg:w-1/3'>
              <label htmlFor="role">Role</label>
              <select className="border rounded p-2" defaultValue='' {...register("role", { required: true })} >
                <option disabled value=''>- select role -</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
    
              {errors.role && <span className='text-red-500 text-sm'>This field is required</span>}
            </div>
  
            <div className='w-full lg:w-1/3'>
              <label htmlFor="employmentStatus">Employment status</label>
              <select className="border rounded p-2" defaultValue='employed' {...register("employmentStatus", { required: true })} >
                <option value='employed'>Employed</option>
                <option value='terminated'>
                  Terminated
                </option>
              </select>
    
              {errors.employmentStatus && <span className='text-red-500 text-sm'>This field is required</span>}
            </div>
    
          </div>
          
            
            <Button type="submit" variant='dark'>Submit</Button>
            {/* <Button onClick={props.onHide}>Cancel</Button> */}
        </form>
      </>
    );
  }
  