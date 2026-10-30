import type { FunctionArgs } from 'convex/server';
import { useQuery } from 'convex/react';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import TableComponent, { TableColumn } from './table';
import Spinner from './spinner';
import Pagination from './ui-pagination';
import { FcSearch } from 'react-icons/fc';
import { useDebounce } from 'use-debounce';

type PaginatedArgs = FunctionArgs<typeof api.functions.paginated.getPaginatedData>;

const PEOPLE_SEARCH_TABLES = new Set(['staffs', 'guests']);
const LOGIN_SEARCH_TABLES = new Set(['users']);
const CLIENT_SEARCH_TABLES = new Set(['beverages']);
const CLIENT_PAGE_TABLES = new Set(['beverages', 'beverageCategories']);
const CLIENT_DATA_TABLES = new Set(['housekeepingTasks', 'maintenanceOrders', 'inventoryTasks']);

function searchPlaceholder(collectionName: string) {
  if (PEOPLE_SEARCH_TABLES.has(collectionName)) {
    return 'Search by first or last name';
  }
  if (LOGIN_SEARCH_TABLES.has(collectionName)) {
    return 'Search by name or email';
  }
  if (collectionName === 'beverages') {
    return 'Search by name or category';
  }
  return '';
}

function supportsNameSearch(collectionName: string) {
  return (
    PEOPLE_SEARCH_TABLES.has(collectionName) ||
    LOGIN_SEARCH_TABLES.has(collectionName) ||
    CLIENT_SEARCH_TABLES.has(collectionName)
  );
}

function matchesClientSearch(row: Record<string, unknown>, term: string) {
  const haystack = [row.name, row.category, row.unitOfMeasure, row.size]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
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
  searchResetKey = 0,
}: {
  collectionName: string;
  columns: TableColumn<any>[];
  jointTableData?: any;
  propertyId?: string;
  /** Bump this after dismissing a create dialog so a leftover search cannot hide the list. */
  searchResetKey?: number;
}) {
  const limit = 10;
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCache, setPageCache] = useState<Record<number, any[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [query] = useDebounce(searchQuery, 300);
  const debouncedQuery = typeof query === 'string' ? query.trim() : '';
  const searchTerm = debouncedQuery.length >= 2 ? debouncedQuery : undefined;
  const showSearch = supportsNameSearch(collectionName);
  const usesClientData = Array.isArray(jointTableData);
  const pagesClientRows = usesClientData && CLIENT_PAGE_TABLES.has(collectionName);
  const clientQuery = !pagesClientRows || searchQuery.trim() === ''
    ? ''
    : debouncedQuery.toLowerCase();
  const filteredClientRows = useMemo(() => {
    if (!pagesClientRows) return [];
    if (!clientQuery) return jointTableData;
    return jointTableData.filter((row) => matchesClientSearch(row, clientQuery));
  }, [pagesClientRows, jointTableData, clientQuery]);
  const clientPageCount = pagesClientRows ? Math.ceil(filteredClientRows.length / limit) : 0;
  const activePage =
    pagesClientRows && clientPageCount > 0 ? Math.min(currentPage, clientPageCount) : currentPage;
  const skipPaginated =
    usesClientData || CLIENT_DATA_TABLES.has(collectionName) || !collectionName;
  const currentCursor = cursorHistory[currentPage - 1] ?? undefined;

  const response = useQuery(
    api.functions.paginated.getPaginatedData,
    skipPaginated
      ? 'skip'
      : {
          table: collectionName as PaginatedArgs['table'],
          limit,
          cursor: currentCursor,
          ...(searchTerm ? { searchTerm } : {}),
          ...(propertyId ? { propertyId: propertyId as Id<'properties'> } : {}),
        },
  );

  useEffect(() => {
    setSearchQuery('');
  }, [searchResetKey]);

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

  const hasNextPage = pagesClientRows
    ? activePage < clientPageCount
    : Boolean(response) &&
      !response.isDone &&
      Boolean(response.continueCursor) &&
      cursorHistory.length > currentPage;

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrev = () => {
    if (activePage > 1) setCurrentPage(activePage - 1);
  };

  const handleNext = () => {
    if (hasNextPage) setCurrentPage(activePage + 1);
  };

  const currentData = pagesClientRows
    ? filteredClientRows.slice((activePage - 1) * limit, activePage * limit)
    : usesClientData
      ? jointTableData
      : pageCache[currentPage] || [];
  const pageIndexes = pagesClientRows
    ? Array.from({ length: clientPageCount }, (_, index) => index)
    : cursorHistory.map((_, index) => index);
  const emptyMessage = (pagesClientRows ? clientQuery : searchTerm)
    ? 'No matching results were found.'
    : 'No data available!';

  if (!usesClientData && (skipPaginated || response === undefined)) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner size="sm" />
      </div>
    );
  }

  const isEmpty = pagesClientRows
    ? filteredClientRows.length === 0
    : usesClientData
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
          data={currentData}
          columns={columns}
        />
      )}

      {!isEmpty && (
        <Pagination className="justify-content-left mt-3">
          <Pagination.Prev onClick={handlePrev} disabled={activePage === 1} />
          {pageIndexes.map((index) => (
            <Pagination.Item
              key={index}
              active={activePage === index + 1}
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;

    // The clear button on type="search" fires `search`, which is not on the DOM typings.
    const handleSearch = () => setSearchQuery(node.value);
    node.addEventListener('search', handleSearch);
    return () => node.removeEventListener('search', handleSearch);
  }, [setSearchQuery]);

  return (
    <div className="w-full h-fit py-2 flex items-start justify-end">
      <div className="w-full lg:w-1/3 h-fit flex flex-col items-end">
        <div className="w-full h-full flex justify-start items-center gap-2">
          <span className="icon">
            <FcSearch />
          </span>
          <input
            ref={inputRef}
            type="search"
            name="tableSearch"
            autoComplete="off"
            value={value}
            placeholder={placeholder}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
