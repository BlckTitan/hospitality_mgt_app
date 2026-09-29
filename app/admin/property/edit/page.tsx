'use client'

import { BackLink } from '../../../../shared/pageHeader';
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
  const response = useQuery(api.property.getProperty, {property_id: id as Id<'properties'>})

  if(response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>
  if(!response) return <div>No data available!</div>
  
  return (
    <div className='w-full min-w-0 max-w-full overflow-x-hidden p-4 bg-white'>
      
      <header className='w-full min-w-0 border-b flex justify-between items-center gap-3'>
        <h3 className='min-w-0 truncate m-0'>
          Update {`${response && 'name' in response ? response.name : undefined}`}
        </h3>
        <BackLink />
      </header>

      <FormComponent 
        id={response && '_id' in response ? response._id : undefined}
        name={response && '_id' in response ? response.name : undefined}
        address={response && '_id' in response ? response.address : undefined}
        phone={response && '_id' in response ? response.phone : undefined}
        email={response && '_id' in response ? response.email : undefined}
        timezone={response && '_id' in response ? response.timezone : undefined}
        currency={response && '_id' in response ? response.currency : undefined}
        taxId={response && '_id' in response ? response.taxId : undefined}
        country={response && '_id' in response ? response.country : undefined}
        isActive={response && '_id' in response ? response.isActive : undefined}
        logoUrl={response && '_id' in response ? response.logoUrl : undefined}
        coverImageUrl={response && '_id' in response ? response.coverImageUrl : undefined}
      />

    </div>
  )
}
