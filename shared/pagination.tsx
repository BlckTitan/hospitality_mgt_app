import type { FunctionArgs } from 'convex/server';
import { useQuery } from 'convex/react';
import { Dispatch, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import TableComponent, { TableColumn } from './table';
import Spinner from './spinner';
import Pagination from './ui-pagination';
import { FcSearch } from 'react-icons/fc';
import { useDebounce } from 'use-debounce';
import { orderedRows } from './alphaSort';
import { useRememberedList } from './listPageState';
import { rowMatchesSearch } from '../convex/lib/rowSearch';

type PaginatedArgs = FunctionArgs<typeof api.functions.paginated.getPaginatedData>;

const CLIENT_DATA_TABLES = new Set(['housekeepingTasks', 'maintenanceOrders', 'inventoryTasks']);

const SEARCH_PLACEHOLDERS: Record<string, string> = {
  staffs: 'Search by name, phone, or role',
  guests: 'Search by name, email, or phone',
  users: 'Search by name, email, or phone',
  beverages: 'Search by name or category',
  roles: 'Search by role name',
  properties: 'Search by name, address, or email',
  pendingInvites: 'Search by email or role',
  roomTypes: 'Search by name or description',
  rooms: 'Search by room number or type',
  reservations: 'Search by confirmation, guest, or room',
  bars: 'Search by name or location',
  userRoles: 'Search by user, email, or role',
  storeInventories: 'Search by beverage',
  storeTransactions: 'Search by beverage or type',
  userStockLogs: 'Search by beverage',
  beverageCategories: 'Search by category',
  shiftTemplates: 'Search by name or department',
  shifts: 'Search by staff or department',
  hours: 'Search by staff or status',
  timeOff: 'Search by staff or type',
  payrolls: 'Search by status',
  expenses: 'Search by name, vendor, or category',
  billPeriods: 'Search by account, provider, or status',
  billAccounts: 'Search by name or provider',
  purchaseOrderLines: 'Search by item or order number',
};

function searchPlaceholder(collectionName: string) {
  return SEARCH_PLACEHOLDERS[collectionName] ?? 'Search';
}

interface SearchComponentProps {
  setSearchQuery: Dispatch<SetStateAction<string>>;
  placeholder: string;
  value: string;
  leading?: ReactNode;
}

export default function PaginationComponent({
  collectionName,
  columns,
  jointTableData,
  propertyId,
  searchResetKey = 0,
  filterKey = '',
  searchLeading,
  showSearch = true,
  showIndex = true,
}: {
  collectionName: string;
  columns: TableColumn<any>[];
  jointTableData?: any;
  propertyId?: string;
  /** Bump this after dismissing a create dialog so a leftover search cannot hide the list. */
  searchResetKey?: number;
  /** Changes the remembered page, for example a category filter. */
  filterKey?: string;
  /** Sits on the search row, at the left on large screens. */
  searchLeading?: ReactNode;
  showSearch?: boolean;
  showIndex?: boolean;
}) {
  const limit = 10;
  const listMemory = useRememberedList(
    `${collectionName}:${propertyId ?? ''}:${filterKey}`,
  );
  const { ready, currentPage, setCurrentPage, cursorHistory, setCursorHistory } = listMemory;
  const [pageCache, setPageCache] = useState<Record<number, any[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [query] = useDebounce(searchQuery, 300);
  const debouncedQuery = typeof query === 'string' ? query.trim() : '';
  const searchTerm = debouncedQuery.length >= 2 ? debouncedQuery : undefined;
  const searchVisible = showSearch && Boolean(collectionName);
  const usesClientData = Array.isArray(jointTableData);
  const pagesClientRows = usesClientData;
  const clientQuery = pagesClientRows && debouncedQuery.length >= 2 ? debouncedQuery.toLowerCase() : '';
  const filteredClientRows = useMemo(() => {
    if (!pagesClientRows) return [];
    const source = jointTableData as Record<string, unknown>[];
    const searched = clientQuery
      ? source.filter((row) => rowMatchesSearch(row, clientQuery))
      : source;
    return orderedRows(collectionName, searched);
  }, [pagesClientRows, jointTableData, clientQuery, collectionName]);
  const clientPageCount = pagesClientRows ? Math.ceil(filteredClientRows.length / limit) : 0;
  const activePage =
    pagesClientRows && clientPageCount > 0 ? Math.min(currentPage, clientPageCount) : currentPage;
  const skipPaginated =
    !ready || usesClientData || CLIENT_DATA_TABLES.has(collectionName) || !collectionName;
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
    setPageCache({});
  }, [collectionName, propertyId, filterKey]);

  const previousQuery = useRef(query);
  useEffect(() => {
    if (previousQuery.current === query) return;
    previousQuery.current = query;
    setCursorHistory([null]);
    setCurrentPage(1);
    setPageCache({});
  }, [query, setCursorHistory, setCurrentPage]);

  useEffect(() => {
    if (!pagesClientRows || clientPageCount === 0 || currentPage <= clientPageCount) return;
    setCurrentPage(clientPageCount);
  }, [pagesClientRows, clientPageCount, currentPage, setCurrentPage]);

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
    : pageCache[currentPage] || [];
  const pageIndexes = pagesClientRows
    ? Array.from({ length: clientPageCount }, (_, index) => index)
    : cursorHistory.map((_, index) => index);
  const emptyMessage = (pagesClientRows ? clientQuery : searchTerm)
    ? 'No matching results were found.'
    : 'No data available!';

  const loading = !ready || (!usesClientData && response === undefined);
  const isEmpty = pagesClientRows
    ? filteredClientRows.length === 0
    : !response?.page || response.page.length === 0;

  return (
    <>
      {searchVisible && (
        <SearchComponent
          value={searchQuery}
          placeholder={searchPlaceholder(collectionName)}
          setSearchQuery={setSearchQuery}
          leading={searchLeading}
        />
      )}
      {loading ? (
        <div className="w-full h-screen flex justify-center items-center">
          <Spinner size="sm" />
        </div>
      ) : isEmpty ? (
        <div className="w-full h-full flex justify-center items-center">
          {emptyMessage}
        </div>
      ) : (
        <TableComponent
          data={currentData}
          columns={columns}
          showIndex={showIndex}
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

export function TableSearch(props: SearchComponentProps) {
  return <SearchComponent {...props} />;
}

function SearchComponent({ setSearchQuery, placeholder, value, leading }: SearchComponentProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;

    // The clear button on type="search" fires `search`, which is not on the DOM typings.
    const handleSearch = () => setSearchQuery(node.value);
    node.addEventListener('search', handleSearch);
    return () => node.removeEventListener('search', handleSearch);
  }, [setSearchQuery]);

  const field = (
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
  );

  if (!leading) {
    return (
      <div className="w-full h-fit py-2 flex items-start justify-end">
        {field}
      </div>
    );
  }

  return (
    <div className="w-full h-fit py-2 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="shrink-0 self-start">{leading}</div>
      {field}
    </div>
  );
}
