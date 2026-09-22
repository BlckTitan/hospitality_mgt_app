import { useMutation, useQuery } from 'convex/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Pagination from 'react-bootstrap/Pagination';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import TableComponent, { TableColumn } from './table';
import { Spinner } from 'react-bootstrap';
import { FcSearch } from 'react-icons/fc';
import { useDebounce } from 'use-debounce';

const PEOPLE_SEARCH_TABLES = new Set(['staffs', 'guests']);
const LOGIN_SEARCH_TABLES = new Set(['users']);
const CLIENT_DATA_TABLES = new Set(['housekeepingTasks', 'maintenanceOrders', 'inventoryTasks']);

function searchPlaceholder(collectionName: string) {
  if (PEOPLE_SEARCH_TABLES.has(collectionName)) {
    return 'Search by first or last name';
  }
  if (LOGIN_SEARCH_TABLES.has(collectionName)) {
    return 'Search by name or email';
  }
  return '';
}

function supportsNameSearch(collectionName: string) {
  return PEOPLE_SEARCH_TABLES.has(collectionName) || LOGIN_SEARCH_TABLES.has(collectionName);
}

interface SearchComponentProps {
  setSearchQuery: Dispatch<SetStateAction<string>>;
  placeholder: string;
  value: string;
}

export default function PaginationComponent({
  collectionName,
  columns,
  jointTableData,
  propertyId,
}: {
  collectionName: string;
  columns: TableColumn<any>[];
  jointTableData?: any;
  propertyId?: string;
}) {
  const limit = 10;
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCache, setPageCache] = useState<Record<number, any[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [query] = useDebounce(searchQuery, 300);
  const searchTerm = query.trim().length >= 2 ? query.trim() : undefined;
  const showSearch = supportsNameSearch(collectionName);
  const usesClientData = Array.isArray(jointTableData);
  const skipPaginated =
    usesClientData || CLIENT_DATA_TABLES.has(collectionName) || !collectionName;
  const needsBackfill = useQuery(
    api.searchBackfill.needsSearchNameBackfill,
    showSearch ? {} : "skip",
  );
  const backfillSearchNames = useMutation(api.searchBackfill.backfillSearchNames);

  useEffect(() => {
    if (needsBackfill) {
      void backfillSearchNames({});
    }
  }, [needsBackfill, backfillSearchNames]);
  const currentCursor = cursorHistory[currentPage - 1] ?? undefined;

  const response = useQuery(
    api.functions.paginated.getPaginatedData,
    skipPaginated
      ? 'skip'
      : {
          table: collectionName,
          limit,
          cursor: currentCursor,
          ...(searchTerm ? { searchTerm } : {}),
          ...(propertyId ? { propertyId: propertyId as Id<'properties'> } : {}),
        },
  );

  useEffect(() => {
    setCursorHistory([null]);
    setCurrentPage(1);
    setPageCache({});
  }, [query, collectionName, propertyId]);

  useEffect(() => {
    if (!response?.page) return;

    setPageCache((prev) => ({
      ...prev,
      [currentPage]: response.page,
    }));

    setCursorHistory((prev) => {
      const knownPages = prev.slice(0, currentPage);
      if (response.isDone || !response.continueCursor) {
        return knownPages;
      }
      if (knownPages[currentPage] === response.continueCursor) {
        return prev;
      }
      return [...knownPages, response.continueCursor];
    });
  }, [response, currentPage]);

  const hasNextPage =
    Boolean(response) &&
    !response.isDone &&
    Boolean(response.continueCursor) &&
    cursorHistory.length > currentPage;

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const currentData = pageCache[currentPage] || [];
  const emptyMessage = searchTerm ? 'No matching results were found.' : 'No data available!';

  if (!usesClientData && (skipPaginated || response === undefined)) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner animation="border" size="sm" variant="dark" />
      </div>
    );
  }

  const isEmpty = usesClientData
    ? jointTableData.length === 0
    : !response?.page || response.page.length === 0;

  return (
    <>
      {showSearch && (
        <SearchComponent
          value={searchQuery}
          placeholder={searchPlaceholder(collectionName)}
          setSearchQuery={setSearchQuery}
        />
      )}
      {isEmpty ? (
        <div className="w-full h-full flex justify-center items-center">
          {emptyMessage}
        </div>
      ) : (
        <TableComponent
          data={usesClientData ? jointTableData : currentData}
          columns={columns}
        />
      )}

      {!isEmpty && (
        <Pagination className="justify-content-left mt-3">
          <Pagination.Prev onClick={handlePrev} disabled={currentPage === 1} />
          {cursorHistory.map((_, index) => (
            <Pagination.Item
              key={index}
              active={currentPage === index + 1}
              onClick={() => handlePageClick(index + 1)}
            >
              {index + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next onClick={handleNext} disabled={!hasNextPage} />
        </Pagination>
      )}
    </>
  );
}

function SearchComponent({ setSearchQuery, placeholder, value }: SearchComponentProps) {
  return (
    <div className="w-full h-fit py-2 flex items-start justify-end">
      <div className="w-full lg:w-1/3 h-fit flex flex-col items-end">
        <div className="w-full h-full flex justify-start items-center gap-2">
          <span className="icon">
            <FcSearch />
          </span>
          <input
            type="search"
            value={value}
            placeholder={placeholder}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
