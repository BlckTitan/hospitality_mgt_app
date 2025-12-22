import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";
import DatepickerComponent from "../../../../shared/datepicker";
import SelectComponent from "../../../../shared/select";
import { roles, states_lga } from "../../../../lib/data";
import { Button, Modal } from "react-bootstrap";

type FormData = {
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
    salary: number;
  };

  
export function FormComponent() {

  const createStaff = useMutation(api.staff.createStaff)

  const [staffState, setStaffState] = useState<string>('')

  const { control, register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: { 
      DoB: null,
      firstName: '',
      lastName: '',
      role: null,
      address: '',
      email: '',
      phone: '',
      stateOfOrigin: '',
      LGA: '',
      dateRecruited: null,
      salary: 0 
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => { 
    try {
      const response = await createStaff({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        DoB: data.DoB ? data.DoB.toISOString() : null,
        stateOfOrigin: data.stateOfOrigin,
        address: data.address,
        LGA: data.LGA,
        email: data.email,
        employmentStatus: 'employed',
        dateRecruited: new Date().toISOString(),
        salary: Number(data.salary),
        role: data.role
      })

      if(response.success === false){
        toast.error(response.message);
      }else{          

        toast.success("New staff created successfully!");
        console.log("Staff created with ID:", response);

        //reload page form on submission
        setTimeout(() => {
          // router.push('/admin/staff')
          window.location.href = "/admin/staff";
        }, 3000)

      }

    } catch (error: any) {
      console.error("Add new staff failed:", error);
      toast.error("Failed to add new staff. Please try again.");
    }
    
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createStaffForm'>
      
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

      </div>
      
      <Modal.Footer>
        
        <Button type="submit" variant='dark'>Submit</Button>
        {/* <Button onClick={props.onHide}>Cancel</Button> */}
      </Modal.Footer>
    </form>
  );
}