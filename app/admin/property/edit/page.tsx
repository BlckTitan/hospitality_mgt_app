'use client'

import { useQuery } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import React from 'react'
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Spinner } from 'react-bootstrap';
import { FormComponent } from '../components/editPropertyForm';


export default function Page() {

  const searchParams = useSearchParams();
  const id = searchParams.get("property_id") ?? null
  // const [id, setId] = useState<Id<"staffs">>(null)
  const response = useQuery(api.property.getProperty, {property_id: id as Id<'properties'>})

  // check response for data
  if(response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>
  if(!response) return <div>No data available!</div>
  
  return (
    <div className='w-full p-4 bg-white'>
      
      <header className='w-full border-b flex justify-between items-center'>
        <h3>Update {`${response?.name}`}</h3>
      </header>

      <FormComponent 
        id={response._id}
        name={response.name}
        address={response.address}
        phone={response.phone}
        email={response.email}
        timezone={response.timezone}
        currency={response.currency}
        taxId={response.taxId}
        isActive={response.isActive}
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