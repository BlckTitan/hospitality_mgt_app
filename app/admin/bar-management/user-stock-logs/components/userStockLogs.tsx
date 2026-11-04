'use client'
import { goToList } from '../../../../../shared/goToList';

import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from '../../../../../shared/button';
import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import { formatPropertyMoney, propertyCurrencyCode, usePropertyCurrency } from "../../../inventory-management/components/money";

interface UserStockLogProps {
  _id: string;
  propertyId: string;
  shiftId: string;
  userId: string;
  barId: string;
  beverageId: string;
  logDate: string;
  openingStock: number;
  newStockReceived: number;
  totalStock: number;
  closingStock: number;
  salesQuantity: number;
  salesValue: number;
  wasteQuantity?: number;
  compQuantity?: number;
  unitCostAtSale?: number;
  cogsValue?: number;
  isFinalized: boolean;
  lastUpdatedAt: number;
  shift?: {
    _id: string;
    userId: string;
    barId: string;
    shiftDate: string;
    startTime: string;
    endTime?: string;
    isFinalized: boolean;
  };
  beverage?: {
    _id: string;
    name: string;
    category: string;
    unitOfMeasure: string;
    unitPrice: number;
    isActive: boolean;
  };
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  dutyUsers?: Array<{
    name: string;
    userId?: string;
  }>;
  bar?: {
    _id: string;
    name: string;
    location: string;
    barType: string;
    isActive: boolean;
  };
}

function dutyLabel(row: UserStockLogProps) {
  const names = (row.dutyUsers ?? []).map((person) => person.name).filter(Boolean);
  if (names.length > 0) return names.join(', ');
  if (!row.barId) return row.user?.name || 'N/A';
  return 'No one on duty';
}

const FINALIZE_BATCH = 15;

const UserStockLogs = ({ 
  currentPropertyId, 
  currency: propertyCurrency,
  filters 
}: { 
  currentPropertyId: Id<"properties">;
  currency?: string;
  filters?: any;
}) => {
  const queriedCurrency = usePropertyCurrency(currentPropertyId);
  const currency = propertyCurrencyCode(propertyCurrency || queriedCurrency);
  const [finalizingAll, setFinalizingAll] = useState(false);

  // Use different queries based on active filters
  let stockLogData;
  
  if (filters?.barId && filters?.logDate) {
    // Use bar daily stock logs query
    stockLogData = useQuery(api.userStockLogs.getBarDailyStockLogs, {
      barId: filters.barId as Id<'bars'>,
      logDate: filters.logDate,
    });
  } else if (filters?.logDate) {
    stockLogData = useQuery(api.userStockLogs.getPropertyDailyStockLogs, {
      propertyId: currentPropertyId,
      logDate: filters.logDate,
    });
  } else {
    // Use default query for all stock logs
    stockLogData = useQuery(api.userStockLogs.getAllUserStockLogs, { propertyId: currentPropertyId });
  }
  
  const removeUserStockLog = useMutation(api.userStockLogs.deleteUserStockLog);
  const finalizeUserStockLog = useMutation(api.userStockLogs.finalizeUserStockLog);
  const finalizeUserStockLogs = useMutation(api.userStockLogs.finalizeUserStockLogs);

  const handleDelete = async (id: string, beverageName: string) => {
    if (!confirm('Are you sure you want to delete stock log for: ' + beverageName + '?')) return;
    try {
      const response = await removeUserStockLog({ stockLogId: id as Id<'userStockLogs'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        goToList("/admin/bar-management/user-stock-logs");
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete user stock log! ${error}`);
      toast.error("Failed to delete user stock log. Please try again.");
    }
  };

  const handleFinalize = async (id: string, beverageName: string) => {
    if (!confirm('Are you sure you want to finalize this stock log for: ' + beverageName + '? This action cannot be undone.')) return;
    try {
      const response = await finalizeUserStockLog({ stockLogId: id as Id<'userStockLogs'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after finalization
        goToList("/admin/bar-management/user-stock-logs");
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to finalize user stock log! ${error}`);
      toast.error("Failed to finalize user stock log. Please try again.");
    }
  };

  const visibleLogs = () => {
    if (!stockLogData || stockLogData.success !== true) return [];
    const loaded = stockLogData.data ?? [];
    if (!filters?.userId) return loaded;
    return loaded.filter((row) =>
      (row.dutyUsers ?? []).some((person) => person.userId === filters.userId),
    );
  };

  const handleFinalizeAll = async () => {
    const openLogs = visibleLogs().filter((row) => !row.isFinalized);
    if (openLogs.length === 0) {
      toast.error('No open stock logs to finalize');
      return;
    }
    const noun = openLogs.length === 1 ? 'stock log' : 'stock logs';
    const dateLabel = filters?.logDate ? ` for ${filters.logDate}` : '';
    if (!confirm(`Finalize ${openLogs.length} open ${noun}${dateLabel}? This cannot be undone.`)) return;

    setFinalizingAll(true);
    let finalized = 0;
    try {
      for (let index = 0; index < openLogs.length; index += FINALIZE_BATCH) {
        const stockLogIds = openLogs
          .slice(index, index + FINALIZE_BATCH)
          .map((row) => row._id as Id<'userStockLogs'>);
        const response = await finalizeUserStockLogs({ stockLogIds });
        if (response.success !== true) {
          toast.error(
            finalized > 0
              ? `${response.message} ${finalized} already finalized.`
              : response.message,
          );
          return;
        }
        finalized += response.finalized ?? 0;
      }
      toast.success(finalized === 1 ? '1 stock log finalized' : `${finalized} stock logs finalized`);
    } catch (error) {
      console.log(`Failed to finalize user stock logs! ${error}`);
      toast.error(
        finalized > 0
          ? `Failed to finalize the remaining stock logs. ${finalized} already finalized.`
          : 'Failed to finalize user stock logs. Please try again.',
      );
    } finally {
      setFinalizingAll(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (amount: number) => formatPropertyMoney(amount, currency);

  const getStockLogStatusBadge = (isFinalized: boolean) => {
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${isFinalized ? 'bg-green-600' : 'bg-yellow-600'}`}>
        {isFinalized ? 'Finalized' : 'Active'}
      </p>
    );
  };

  const tableColumns: TableColumn<UserStockLogProps>[] = [
    {
      label: 'Date',
      key: 'logDate',
      render: (value, row) => (
        <span>{row.logDate || 'N/A'}</span>
      )
    },
    {
      label: 'User',
      key: 'user',
      render: (value, row) => <span>{dutyLabel(row)}</span>
    },
    {
      label: 'Bar',
      key: 'bar',
      render: (value, row) => (
        <span>{row.bar?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Beverage',
      key: 'beverage',
      render: (value, row) => (
        <span>{row.beverage?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Opening Stock',
      key: 'openingStock',
      render: (value, row) => (
        <span>{row.openingStock} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'New Stock',
      key: 'newStockReceived',
      render: (value, row) => (
        <span className="text-blue-600">{row.newStockReceived} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'Total Stock',
      key: 'totalStock',
      render: (value, row) => (
        <span className="font-semibold">{row.totalStock} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'Closing Stock',
      key: 'closingStock',
      render: (value, row) => (
        <span>{row.closingStock} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'Waste',
      key: 'wasteQuantity',
      render: (value, row) => (
        <span>{row.wasteQuantity ?? 0} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'Comps',
      key: 'compQuantity',
      render: (value, row) => (
        <span>{row.compQuantity ?? 0} {row.beverage?.unitOfMeasure || 'units'}</span>
      )
    },
    {
      label: 'Sales Quantity',
      key: 'salesQuantity',
      render: (value, row) => (
        <span className={row.salesQuantity > 0 ? 'text-green-600 font-semibold' : 'text-gray-600'}>
          {row.salesQuantity} {row.beverage?.unitOfMeasure || 'units'}
        </span>
      )
    },
    {
      label: 'Sales Value',
      key: 'salesValue',
      render: (value, row) => (
        <span className={row.salesValue > 0 ? 'text-green-600 font-semibold' : 'text-gray-600'}>
          {formatCurrency(row.salesValue)}
        </span>
      )
    },
    {
      label: 'COGS',
      key: 'cogsValue',
      render: (value, row) => (
        <span className="text-gray-700">
          {formatCurrency(row.cogsValue ?? 0)}
        </span>
      )
    },
    {
      label: 'Gross Profit',
      key: 'unitCostAtSale',
      render: (value, row) => {
        const profit = row.salesValue - (row.cogsValue ?? 0);
        return (
          <span className={profit > 0 ? 'text-green-600 font-semibold' : profit < 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
            {formatCurrency(profit)}
          </span>
        );
      }
    },
    {
      label: 'Status',
      key: 'isFinalized',
      render: (value, row) => (
        <span>{getStockLogStatusBadge(row.isFinalized)}</span>
      )
    },
    {
      label: 'Last Updated',
      key: 'lastUpdatedAt',
      render: (value, row) => (
        <span>{formatDate(row.lastUpdatedAt)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/bar-management/user-stock-logs/edit?stock_log_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
            title={row.isFinalized ? 'Cannot edit - record is finalized' : 'Edit stock log'}
          >
            <i className={`icon ${row.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <MdEditDocument />
            </i>
          </a>

          {!row.isFinalized && (
            <Button
              variant='success'
              size='sm'
              onClick={() => handleFinalize(row._id, row.beverage?.name || 'Unknown')}
              title='Finalize stock log'
              className='!text-white'
              disabled={finalizingAll}
            >
              <i className='icon'>
                <FcDocument />
              </i>
            </Button>
          )}

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.beverage?.name || 'Unknown')}
            title={row.isFinalized ? 'Cannot delete - record is finalized' : 'Delete stock log'}
            disabled={row.isFinalized}
          >
            <i className={`icon ${row.isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <FcEmptyTrash />
            </i>
          </Button>
        </div>
      ),
    },
  ];

  if (stockLogData === undefined) {
    return <p className="p-4">Loading</p>;
  }

  const rows = visibleLogs();
  const openCount = rows.filter((row) => !row.isFinalized).length;

  return (
    <div className="w-full h-full min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <DailyStockValueSummary
          logs={rows}
          currency={currency}
          logDate={filters?.logDate}
        />
        {openCount > 0 && (
          <Button
            variant="success"
            onClick={handleFinalizeAll}
            disabled={finalizingAll}
            className="shrink-0"
          >
            {finalizingAll ? 'Finalizing…' : `Finalize all (${openCount})`}
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
      <Suspense>
        <PaginationComponent
          key={`${filters?.logDate ?? ''}:${filters?.barId ?? ''}:${filters?.userId ?? ''}`}
          collectionName="userStockLogs"
          columns={tableColumns}
          jointTableData={rows}
          filterKey={`${filters?.logDate ?? ''}:${filters?.barId ?? ''}:${filters?.userId ?? ''}`}
        />
      </Suspense>
      </div>
    </div>
  );
};

function DailyStockValueSummary({
  logs,
  currency,
  logDate,
}: {
  logs: UserStockLogProps[];
  currency?: string;
  logDate?: string;
}) {
  const summary = useMemo(() => {
    let openingValue = 0;
    let salesValue = 0;
    let stockLeftValue = 0;

    for (const log of logs) {
      const unitPrice = log.beverage?.unitPrice ?? 0;
      openingValue += (log.openingStock ?? 0) * unitPrice;
      salesValue += log.salesValue ?? 0;
      stockLeftValue += (log.closingStock ?? 0) * unitPrice;
    }

    return { openingValue, salesValue, stockLeftValue };
  }, [logs]);

  const money = (value: number) => formatPropertyMoney(value, currency);

  return (
    <section className="mb-4 flex-1">
      <h2 className="text-base font-semibold text-gray-800 mb-2">
        Daily stock value{logDate ? ` · ${logDate}` : ''}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ValueCard label="Opening stock value" value={money(summary.openingValue)} />
        <ValueCard label="Total sales value" value={money(summary.salesValue)} tone="green" />
        <ValueCard label="Stock left value" value={money(summary.stockLeftValue)} tone="blue" />
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Opening and stock left use each drink&apos;s selling price. Sales is the amount recorded on this day&apos;s logs.
      </p>
    </section>
  );
}

function ValueCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'green' | 'blue';
}) {
  const tones = {
    green: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    default: 'bg-gray-50 border-gray-200',
  };
  const labelTones = {
    green: 'text-emerald-700',
    blue: 'text-blue-700',
    default: 'text-gray-600',
  };
  const valueTones = {
    green: 'text-emerald-900',
    blue: 'text-blue-900',
    default: 'text-gray-900',
  };
  const key = tone ?? 'default';

  return (
    <div className={`border rounded-lg p-3 ${tones[key]}`}>
      <div className={`text-xs font-medium ${labelTones[key]}`}>{label}</div>
      <div className={`text-lg font-bold ${valueTones[key]}`}>{value}</div>
    </div>
  );
}

export default UserStockLogs;
