import { useQuery } from 'convex/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Pagination from 'react-bootstrap/Pagination';
import { api } from '../convex/_generated/api';
import TableComponent from './table';
import { Spinner } from 'react-bootstrap';
import { FcSearch } from 'react-icons/fc';
import { yupResolver } from '@hookform/resolvers/yup';
import { searchFormSchema } from './search-form-validation';
import { useForm, Watch } from 'react-hook-form';
import { useDebounce } from 'use-debounce';

interface PaginationProps{
  collectionName: string,
  columns: Record<string, any>[] | []
}
interface FormData{
  search: string
}
interface SearchComponentProps{
  setSearchQuery: Dispatch<SetStateAction<string>>
}

export default function PaginationComponent({collectionName, columns}) {

  const limit = 10;

  // Keeps the cursor history in order: [null, "cursor_1", "cursor_2", ...]
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCache, setPageCache] = useState<Record<number, any[]>>({});
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [query] = useDebounce(searchQuery, 300);

  const currentCursor = cursorHistory[currentPage - 1] ?? undefined;

  // Query current page
  const response = useQuery(api.functions.paginated.getPaginatedData, {
    table: collectionName,
    limit,
    cursor: currentCursor,
    searchTerm: query
  });

  // Update local cache + cursor list when a new page is loaded
  useEffect(() => {
    if (response?.page) {
      setPageCache((prev) => ({
        ...prev,
        [currentPage]: response.page,
      }));

      // Store next cursor if not already known
      if (response.continueCursor && !cursorHistory.includes(response.continueCursor)) {
        setCursorHistory((prev) => [...prev, response.continueCursor]);
      }
    }
  }, [response]);

  // Handle direct page number click
  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    // Only move forward if not done
    if (!response?.isDone && cursorHistory.length >= currentPage) {
      setCurrentPage((prev) => prev  + 1);
    }
  };

  const currentData = pageCache[currentPage] || [];

  // check response for data
  if(response === undefined) return <div className='w-full h-screen flex items-center justify-center'><Spinner animation="border" size='sm' variant="dark" /></div>
  if(!response || !response?.page) return <div className='w-full h-full flex justify-center items-center'>No data available!</div>

  console.log(response+' response here')

  return (
    //Pagination Buttons
    <>
      <SearchComponent setSearchQuery={setSearchQuery}/>
      {/* Data Table */}
      <TableComponent data={currentData} columns={columns}/>

      {/* Table Pagination */}
      <Pagination className="justify-content-left mt-3">

        <Pagination.Prev 
          onClick={handlePrev} 
          disabled={currentPage === 1} 
        />

        {cursorHistory.map((_, index) => (
          <Pagination.Item
            key={index}
            active={currentPage === index + 1}
            onClick={() => handlePageClick(index + 1)}
          >
            {index + 1}
          </Pagination.Item>
        ))}

        <Pagination.Next
          onClick={handleNext}
          disabled={response?.isDone || !response?.continueCursor}
        />

      </Pagination>

    </>
  );
}

// search form component
const SearchComponent = ({setSearchQuery}: SearchComponentProps) =>{

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(searchFormSchema) as any,
    defaultValues: { 
      search: ''
    }
  })

  const onSubmit = (data: FormData) => {

    setSearchQuery(data.search);

  }
  
  return (
    <form 
      action="" 
      className='w-full h-fit py-2 flex items-start justify-end'
      onSubmit={handleSubmit(onSubmit)}
    >

      <div className='w-full lg:w-1/3 h-fit flex flex-col items-end'>

        <div className='w-full h-full flex justify-start items-center gap-2'>

          <button type='submit' className='icon'>
            <FcSearch/>
          </button>

          <input 
            type="text"
            placeholder='search by firstname, lastname, employment status or role'
            {...register("search", { required: true })}
          />

        </div>

        <div>
          {errors.search && <span className='text-red-500 text-sm'>This field is required</span>}
        </div>
      </div>
    </form>
  )
} 