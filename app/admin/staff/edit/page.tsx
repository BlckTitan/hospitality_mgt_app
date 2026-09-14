'use client'

import React from 'react'
import { Spinner } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useSearchParams } from 'next/navigation';
import { FormComponent } from '../components/editEmployeeForm';

export default function Page() {

  const searchParams = useSearchParams();
  const id = searchParams.get("staff_id") ?? null
  // const [id, setId] = useState<Id<"staffs">>(null)
  const response = useQuery(api.staff.getStaff, {staff_id: id as Id<'staffs'>})

  // check response for data
  if(response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>
  if(!response) return <div>No data available!</div>

  return (
    <div className='w-full p-4 bg-white'>
      
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update {`${response.lastName}`}</h3>
      </header>

      <FormComponent 
        id={id}
        firstName={response.firstName}
        lastName={response.lastName}
        phone={response.phone}
        DoB={response.DoB}
        stateOfOrigin={response.stateOfOrigin}
        LGA={response.LGA}
        address={response.address}
        salary={response.salary}
        email={response.email}
        employmentStatus={response.employmentStatus}
        role={response.role}
        dateRecruited={response.dateRecruited}
        dateTerminated={response.dateTerminated}
        department={response.department}
      />

    </div>
  )
}


// const books = useQuery(api.getAllBooks);
//   const createBook = useMutation(api.createBook);
//   const updateBook = useMutation(api.updateBook);
//   const deleteBook = useMutation(api.deleteBook);

//   // Example create
//   const handleCreate = async () => {
//     await createBook({ title: "New Book", author: "Me" });
//   };

//   // Example update (toggle isCompleted)
//   const handleToggle = async (book) => {
//     await updateBook({
//       id: book._id,
//       patch: { isCompleted: !book.isCompleted },
//     });
//   };

// interface FormComponentProps{
//   dateTerminated?: Date | null;
//   email?: string;
//   firstName: string;
//   lastName: string;
//   phone: string;
//   DoB: Date | null;
//   stateOfOrigin: string;
//   LGA: string;
//   address: string;
//   salary: number;
//   employmentStatus: "employed" | "terminated";
//   dateRecruited: Date | null;
//   role: "Manager" | "Assistant Manager" | "Supervisor" | "Griller" | "Housekeeper" | "Laundry Attendant" | "Security" | 'Receptionist' | null;
// }