import { useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import Pagination from 'react-bootstrap/Pagination';
import { api } from '../convex/_generated/api';
import TableComponent from './table';
import { Spinner } from 'react-bootstrap';

interface PaginationProps{
  collectionName: string,
  columns: Record<string, any> | []
}

export default function PaginationComponent({collectionName, columns}) {
  
  const limit = 10;

  // Keeps the cursor history in order: [null, "cursor_1", "cursor_2", ...]
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCache, setPageCache] = useState<Record<number, any[]>>({});

  const currentCursor = cursorHistory[currentPage - 1] ?? undefined;

  // Query current page
  const response = useQuery(api.functions.paginated.getPaginatedData, {
    table: collectionName,
    limit,
    cursor: currentCursor,
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
      setCurrentPage((prev) => prev + 1);
    }
  };

  const currentData = pageCache[currentPage] || [];

  if(response === undefined) return <div className='w-full h-full flex items-center justify-center'><Spinner animation="border" variant="primary" /></div>
  if(response.page.length === 0) return <div>No data available!</div>
  
  return (
    //Pagination Buttons
    <>
      {/* Data Table */}
      <TableComponent data={currentData} columns={columns}/>

      {/* Table Pagination */}
      <Pagination className="justify-content-center mt-3">

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
