import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { TableColumn } from "../../../../shared/table";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import PaginationComponent from "../../../../shared/pagination";
import { Suspense } from "react";

interface StaffProps {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    DoB: string;
    state_of_origin: string;
    LGA: string;
    employment_status: string;
    address: string;
    date_recruited: string;
    date_terminated?: string;
    role: string;
  }

  
const Staff = () =>{
    // fetches all the data from user table to display it in a table

    const handleDelete = (id: string, name: string) =>{
      confirm('Are you sure you want to delete records for '+name)
      console.log(id);
    }

    const tableColumns: TableColumn <StaffProps>[] = [
      { label: 'First Name', key: 'firstName' },
      { label: 'Last Name', key: 'lastName' },
      { label: 'Phone', key: 'phone' },
      { label: 'Role', key: 'role' },
      { label: 'Employment Status', key: 'employment_status' },
      { 
        label: 'Action', 
        key: '_id',
        render: (value, row) => (
          <div className='flex justify-evenly lg:justify-start items-center gap-1'>

            <a 
              href={`/admin/staff/view?staff_id=${row._id}`} 
              className='!mr-2 !no-underline' 
            >
              <i className='icon'><FcDocument /></i>
            </a>

            <a 
              href={`/admin/staff/edit?staff_id=${row._id}`} 
              className='!no-underline !text-amber-400'
            >
              <i className='icon'><MdEditDocument /></i>
            </a>

            <Button 
              variant='white'
              onClick={() => handleDelete(row._id, row.firstName)} 
            >
              <i className='icon'>
                <FcEmptyTrash />
              </i>
            </Button>
          </div>
        ),
      },
    ]

    return(
        <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
          <Suspense>
            <PaginationComponent collectionName='staffs' columns={tableColumns}/>
          </Suspense>
        </div>
    )
    
 }

 export default Staff
