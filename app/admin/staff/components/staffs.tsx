import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { TableColumn } from "../../../../shared/table";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import PaginationComponent from "../../../../shared/pagination";
import { Suspense } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

interface StaffProps {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    DoB: string;
    stateOfOrigin: string;
    LGA: string;
    employmentStatus: string;
    address: string;
    dateRecruited: string;
    dateTerminated?: string;
    role: string;
  }

  
const Staff = () =>{
    const removeStaffRecord = useMutation(api.staff.removeStaff);

    const handleDelete = async (id: string, name: string) =>{
      confirm('Are you sure you want to delete records for '+name)
      try {
        const response = await removeStaffRecord({id: id  as Id<'staffs'>})
        
        if(response.success === true){
          
            toast.success(response.message)
            //reload page form on submission
            setTimeout(() => {
              // router.push('/admin/staff')
              window.location.href = "/admin/staff";
            }, 3000)
            
        }else{
          return toast.error(response.message)
        }
      } catch (error) {
        console.log(`Failed to delete staff! ${error}`)
      }
    }

    const tableColumns: TableColumn <StaffProps>[] = [
      { label: 'First Name', key: 'firstName' },
      { label: 'Last Name', key: 'lastName' },
      { label: 'Phone', key: 'phone' },
      { label: 'Role', key: 'role' },
      { label: 'Employment Status', key: 'employmentStatus' },
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
