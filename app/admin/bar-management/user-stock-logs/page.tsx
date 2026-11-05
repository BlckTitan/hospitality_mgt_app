'use client';

import { BackLink } from '../../../../shared/pageHeader';
import React, { useEffect, useState } from 'react';
import { Button } from '../../../../shared/button';
import { FcPlus } from 'react-icons/fc';
import UserStockLogs from './components/userStockLogs';
import { FormComponent } from './components/createUserStockLogForm';
import { FilterComponent } from './components/filterComponent';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../shared/modal';
import { BarManagementPageGuide } from '../components/barManagementPageGuide';

function dateKeyInTimeZone(timeZone: string | undefined, now = Date.now()) {
  const zone = timeZone?.trim() || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(now));
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid timezone falls through to UTC.
  }
  return new Date(now).toISOString().slice(0, 10);
}

type StockLogFilters = {
  userId?: string;
  barId?: string;
  logDate?: string;
};

const FILTER_STORAGE_KEY = 'user-stock-logs:filters';
let handledDocumentLoad = false;

function readStockLogFilters(): StockLogFilters | null {
  if (typeof window === 'undefined') return null;
  if (!handledDocumentLoad) {
    handledDocumentLoad = true;
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (entry?.type === 'reload') {
      sessionStorage.removeItem(FILTER_STORAGE_KEY);
      return null;
    }
  }
  try {
    const parsed = JSON.parse(sessionStorage.getItem(FILTER_STORAGE_KEY) ?? 'null') as StockLogFilters | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      userId: typeof parsed.userId === 'string' && parsed.userId ? parsed.userId : undefined,
      barId: typeof parsed.barId === 'string' && parsed.barId ? parsed.barId : undefined,
      logDate: typeof parsed.logDate === 'string' && parsed.logDate ? parsed.logDate : undefined,
    };
  } catch {
    return null;
  }
}

function writeStockLogFilters(filters: StockLogFilters | null) {
  if (typeof window === 'undefined') return;
  if (!filters) {
    sessionStorage.removeItem(FILTER_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
}

export default function UserStockLogPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const [modalShow, setModalShow] = useState(false);
  const [propertyId, setPropertyId] = useState<string>('');
  const [filtersReady, setFiltersReady] = useState(false);
  const [activeFilters, setActiveFilters] = useState<StockLogFilters | null>(null);

  useEffect(() => {
    setActiveFilters(readStockLogFilters());
    setFiltersReady(true);
  }, []);

  // Fetch properties to get the current property
  const propertiesResponse = useQuery(
    api.property.listAccessibleProperties,
    isAuthenticated ? {} : 'skip',
  );
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';
  const currentProperty = properties.find((property) => property._id === currentPropertyId) ?? properties[0];
  const todayKey = dateKeyInTimeZone(currentProperty?.timezone);
  const appliedFilters: StockLogFilters = {
    userId: activeFilters?.userId,
    barId: activeFilters?.barId,
    logDate: activeFilters?.logDate || todayKey,
  };

  if (authLoading || !isAuthenticated || !filtersReady || !propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  const handleFilter = (filters: StockLogFilters) => {
    setActiveFilters(filters);
    writeStockLogFilters(filters);
  };

  const handleClearFilter = () => {
    setActiveFilters(null);
    writeStockLogFilters(null);
  };

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">User Stock Logs</h1>
        <BarManagementPageGuide page="user-stock-logs" />
      </div>
        <div className="flex items-center gap-3">
          <BackLink />
        <Button
          variant="light"
          className="cursor-pointer"
          circle
          onClick={() => setModalShow(true)}
        >
          <FcPlus className="w-8 h-8" />
        </Button>
      
        </div>
      </header>
      <FilterComponent
        propertyId={currentPropertyId as Id<'properties'>}
        defaultLogDate={todayKey}
        initialFilters={activeFilters}
        onFilter={handleFilter}
        onClear={handleClearFilter}
      />

      <UserStockLogs 
        currentPropertyId={currentPropertyId as Id<'properties'>}
        currency={currentProperty?.currency}
        filters={appliedFilters}
      />

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
        propertyId={currentPropertyId}
      />
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
  propertyId: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Add New User Stock Log"
      body={
        <FormComponent
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
          propertyId={props.propertyId}
        />
      }
    />
  );
}
