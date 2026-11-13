'use client'
import { goToList } from '../../../../../shared/goToList';

import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from '../../../../../shared/button';
import { Suspense, useLayoutEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { beverageCategoryLabel } from "../../../../../convex/lib/beverageCategoryCatalog";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import Spinner from "../../../../../shared/spinner";
import { Id } from "../../../../../convex/_generated/dataModel";
import { formatPropertyMoney, usePropertyCurrency } from "../../../inventory-management/components/money";

type StockLevel = 'low' | 'medium' | 'good';
type StockFilter = 'all' | StockLevel;

type InventoryFilters = {
  category: string;
  status: StockFilter;
  unit: string;
};

const DEFAULT_FILTERS: InventoryFilters = {
  category: 'all',
  status: 'all',
  unit: 'all',
};

const selectClassName = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white';

function stockLevel(qtyInStore: number, reorderThreshold: number): StockLevel {
  if (qtyInStore <= reorderThreshold) return 'low';
  if (qtyInStore <= reorderThreshold * 2) return 'medium';
  return 'good';
}

function readFilters(key: string): InventoryFilters {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) ?? 'null') as Partial<InventoryFilters> | null;
    const status = parsed?.status;
    return {
      category: typeof parsed?.category === 'string' && parsed.category ? parsed.category : 'all',
      status: status === 'low' || status === 'medium' || status === 'good' ? status : 'all',
      unit: typeof parsed?.unit === 'string' && parsed.unit ? parsed.unit : 'all',
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

interface StoreInventoryProps {
  _id: string;
  propertyId: string;
  beverageId: string;
  qtyInStore: number;
  reorderThreshold: number;
  unitCost?: number;
  stockValue?: number;
  lastUpdated: number;
  beverage?: {
    _id: string;
    name: string;
    category: string;
    unitOfMeasure: string;
    unitPrice: number;
    reorderLevel: number;
    isActive: boolean;
  };
}

const StoreInventories = ({ currentPropertyId }: { currentPropertyId: Id<"properties"> }) => {
  const filterStorageKey = `store-inventory-filters:${currentPropertyId}`;
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [filtersReady, setFiltersReady] = useState(false);
  useLayoutEffect(() => {
    setFilters(readFilters(filterStorageKey));
    setFiltersReady(true);
  }, [filterStorageKey]);

  const storeInventoryData = useQuery(api.storeInventories.getAllStoreInventories, { propertyId: currentPropertyId });
  const currency = usePropertyCurrency(currentPropertyId);
  const removeStoreInventory = useMutation(api.storeInventories.deleteStoreInventory);

  const handleDelete = async (id: string, beverageName: string) => {
    if (!confirm('Are you sure you want to delete store inventory for: ' + beverageName + '?')) return;
    try {
      const response = await removeStoreInventory({ id: id as Id<'storeInventories'> });

      if (response.success === true) {
        toast.success(response.message);
        // Reload page after deletion
        goToList("/admin/bar-management/store-inventory");
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete store inventory! ${error}`);
      toast.error("Failed to delete store inventory. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStockStatusBadge = (qtyInStore: number, reorderThreshold: number) => {
    const level = stockLevel(qtyInStore, reorderThreshold);
    const badge = {
      low: { label: 'Low Stock', className: 'bg-red-600' },
      medium: { label: 'Medium Stock', className: 'bg-yellow-600' },
      good: { label: 'Good Stock', className: 'bg-green-600' },
    }[level];
    return (
      <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${badge.className}`}>
        {badge.label}
      </p>
    );
  };

  const tableColumns: TableColumn<StoreInventoryProps>[] = [
    {
      label: 'Beverage',
      key: 'beverage',
      render: (value, row) => (
        <span>{row.beverage?.name || 'N/A'}</span>
      )
    },
    {
      label: 'Category',
      key: 'beverage',
      render: (value, row) => (
        <span>{row.beverage?.category || 'N/A'}</span>
      )
    },
    {
      label: 'Unit of Measure',
      key: 'beverage',
      render: (value, row) => (
        <span>{row.beverage?.unitOfMeasure || 'N/A'}</span>
      )
    },
    {
      label: 'Quantity in Store',
      key: 'qtyInStore',
      render: (value, row) => (
        <span className="font-semibold">{row.qtyInStore} {row.beverage?.unitOfMeasure || ''}</span>
      )
    },
    {
      label: 'Reorder Threshold',
      key: 'reorderThreshold',
      render: (value, row) => (
        <span>{row.reorderThreshold} {row.beverage?.unitOfMeasure || ''}</span>
      )
    },
    {
      label: 'Bottle cost',
      key: 'unitCost',
      render: (value, row) => (
        <span>{formatPropertyMoney(row.unitCost, currency)}</span>
      )
    },
    {
      label: 'Stock value',
      key: 'stockValue',
      render: (value, row) => (
        <span>{formatPropertyMoney(row.stockValue, currency)}</span>
      )
    },
    {
      label: 'Stock Status',
      key: 'qtyInStore',
      render: (value, row) => getStockStatusBadge(row.qtyInStore, row.reorderThreshold)
    },
    {
      label: 'Last Updated',
      key: 'lastUpdated',
      render: (value, row) => (
        <span>{formatDate(row.lastUpdated)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/bar-management/store-inventory/edit?inventory_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.beverage?.name || 'Unknown')}
            title='Delete store inventory'
          >
            <i className='icon'>
              <FcEmptyTrash />
            </i>
          </Button>
        </div>
      ),
    },
  ];

  const rows = storeInventoryData?.success === true ? storeInventoryData.data ?? [] : [];
  const categoryOptions = useMemo(() => {
    const used = [...new Set(rows.map((row) => row.beverage?.category).filter((name): name is string => Boolean(name)))];
    return used
      .map((name) => ({ name, label: beverageCategoryLabel(name) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [rows]);
  const unitOptions = useMemo(() => {
    return [...new Set(rows.map((row) => row.beverage?.unitOfMeasure).filter((unit): unit is string => Boolean(unit)))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [rows]);
  const activeCategory = filters.category !== 'all' && categoryOptions.some((item) => item.name === filters.category)
    ? filters.category
    : 'all';
  const activeUnit = filters.unit !== 'all' && unitOptions.includes(filters.unit) ? filters.unit : 'all';
  const activeStatus = filters.status;
  const filtersActive = activeCategory !== 'all' || activeStatus !== 'all' || activeUnit !== 'all';
  const visibleRows = rows.filter((row) => {
    if (activeCategory !== 'all' && row.beverage?.category !== activeCategory) return false;
    if (activeUnit !== 'all' && row.beverage?.unitOfMeasure !== activeUnit) return false;
    if (activeStatus !== 'all' && stockLevel(row.qtyInStore, row.reorderThreshold) !== activeStatus) return false;
    return true;
  });

  const chooseFilter = (next: InventoryFilters) => {
    setFilters(next);
    window.sessionStorage.setItem(filterStorageKey, JSON.stringify(next));
  };

  if (storeInventoryData === undefined || !filtersReady) {
    return (
      <div className="w-full h-full flex justify-center items-center py-16">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <div className="bg-gray-50 p-4 rounded-lg mb-2">
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3">
          <label className="w-full lg:w-52 text-sm font-medium text-gray-700">
            Category
            <select
              className={`${selectClassName} mt-1`}
              value={activeCategory}
              onChange={(event) => chooseFilter({ ...filters, category: event.target.value, status: activeStatus, unit: activeUnit })}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="w-full lg:w-44 text-sm font-medium text-gray-700">
            Stock status
            <select
              className={`${selectClassName} mt-1`}
              value={activeStatus}
              onChange={(event) => chooseFilter({
                ...filters,
                category: activeCategory,
                status: event.target.value as StockFilter,
                unit: activeUnit,
              })}
            >
              <option value="all">All statuses</option>
              <option value="low">Low stock</option>
              <option value="medium">Medium stock</option>
              <option value="good">Good stock</option>
            </select>
          </label>
          <label className="w-full lg:w-44 text-sm font-medium text-gray-700">
            Unit
            <select
              className={`${selectClassName} mt-1`}
              value={activeUnit}
              onChange={(event) => chooseFilter({ ...filters, category: activeCategory, status: activeStatus, unit: event.target.value })}
            >
              <option value="all">All units</option>
              {unitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3 pb-0.5">
            {filtersActive && (
              <Button
                variant="outline-secondary"
                onClick={() => chooseFilter(DEFAULT_FILTERS)}
              >
                Clear
              </Button>
            )}
            <span className="text-sm text-gray-500">
              {filtersActive
                ? `${visibleRows.length} of ${rows.length} items`
                : `${rows.length} ${rows.length === 1 ? 'item' : 'items'}`}
            </span>
          </div>
        </div>
      </div>
      <Suspense>
        <PaginationComponent
          collectionName='storeInventories'
          columns={tableColumns}
          jointTableData={visibleRows}
          propertyId={currentPropertyId}
          filterKey={`${activeCategory}:${activeStatus}:${activeUnit}`}
          emptyLabel={rows.length > 0 ? 'No inventory matches these filters.' : undefined}
        />
      </Suspense>
    </div>
  );
};

export default StoreInventories;
