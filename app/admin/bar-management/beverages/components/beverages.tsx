'use client'

import { FcDocument, FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from '../../../../../shared/button';
import { Suspense, useLayoutEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";
import PaginationComponent from "../../../../../shared/pagination";
import Spinner from "../../../../../shared/spinner";
import { Id } from "../../../../../convex/_generated/dataModel";
import ImageThumbnail from "../../../../../shared/imageThumbnail";
import { usePermissions } from "../../../../../hooks/usePermissions";

interface BeverageProps {
  _id: string;
  propertyId: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  size?: string;
  unitPrice: number;
  unitCost?: number;
  resolvedUnitCost?: number;
  costSource?: string;
  inventoryItem?: { name?: string } | null;
  recipeLines?: unknown[];
  reorderLevel: number;
  isActive: boolean;
  imageUrl?: string;
  _creationTime: number;
}

const Beverages = ({
  currentPropertyId,
  searchResetKey = 0,
}: {
  currentPropertyId: Id<"properties">;
  searchResetKey?: number;
}) => {
  const { hasGranularPermission } = usePermissions();
  const canOperate = hasGranularPermission('fnb.read');
  const categoryKey = `beverage-category:${currentPropertyId}`;
  const [category, setCategory] = useState('all');
  const [categoryReady, setCategoryReady] = useState(false);
  useLayoutEffect(() => {
    const saved = window.sessionStorage.getItem(categoryKey);
    setCategory(saved || 'all');
    setCategoryReady(true);
  }, [categoryKey]);
  const beverageData = useQuery(
    api.beverages.getBeverages,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );
  const propertyData = useQuery(
    api.beverages.getPropertyWithCurrency,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );
  const categoryCatalog = useQuery(api.beverageCategories.listBeverageCategories, {
    propertyId: currentPropertyId,
  });
  const removeBeverage = useMutation(api.beverages.deleteBeverage);

  const getCurrencySymbol = (currency?: string) => {
    switch (currency?.toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'NGN': return '₦';
      default: return '$';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete beverage: ' + name + '?')) return;
    try {
      const response = await removeBeverage({ beverageId: id as Id<'beverages'> });

      if (response.success === true) {
        toast.success(response.message);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete beverage! ${error}`);
      toast.error("Failed to delete beverage. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

  const tableColumns: TableColumn<BeverageProps>[] = [
    {
      label: '',
      key: 'imageUrl',
      render: (_value, row) => (
        <ImageThumbnail src={row.imageUrl} alt={row.name} size={40} />
      ),
    },
    { label: 'Name', key: 'name' },
    { label: 'Category', key: 'category' },
    { label: 'Unit', key: 'unitOfMeasure' },
    {
      label: 'Size',
      key: 'size',
      render: (value) => <span>{value ? String(value) : '—'}</span>,
    },
    {
      label: 'Unit Price',
      key: 'unitPrice',
      render: (value) => {
        const currency = propertyData?.success ? propertyData.data?.currency : 'USD';
        const symbol = getCurrencySymbol(currency);
        return <span>{symbol}{Number(value).toFixed(2)}</span>;
      }
    },
    ...(canOperate
      ? [{
      label: 'Unit Cost',
      key: 'resolvedUnitCost' as const,
      render: (_value, row) => {
        const currency = propertyData?.success ? propertyData.data?.currency : 'USD';
        const symbol = getCurrencySymbol(currency);
        const cost = row.resolvedUnitCost ?? row.unitCost;
        if (cost === undefined || cost === null || Number.isNaN(Number(cost))) {
          return <span className="text-gray-400">—</span>;
        }
        const source = row.costSource === 'recipe'
          ? 'recipe'
          : row.costSource === 'purchase'
            ? 'purchase'
            : row.costSource === 'inventory'
            ? row.inventoryItem?.name || 'inventory'
            : row.costSource === 'manual'
              ? 'manual'
              : '';
        return <span>{symbol}{Number(cost).toFixed(2)}{source ? <span className="text-xs text-gray-500"> · {source}</span> : null}</span>;
      }
    } satisfies TableColumn<BeverageProps>]
      : []),
    ...(canOperate
      ? [{
      label: 'Reorder Level',
      key: 'reorderLevel' as const,
    } satisfies TableColumn<BeverageProps>]
      : []),
    {
      label: 'Active',
      key: 'isActive',
      render: (value, row) => (
        <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </p>
      )
    },
    {
      label: 'Created At',
      key: '_creationTime',
      render: (value, row) => <span>{formatDate(row._creationTime)}</span>
    },
    ...(canOperate
      ? [{
      label: 'Action',
      key: '_id' as const,
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a href={`/admin/bar-management/beverages/edit?beverage_id=${row._id}`} className='!mr-2 !no-underline !text-amber-400'>
            <i className='icon'><MdEditDocument /></i>
          </a>
          <Button variant='white' onClick={() => handleDelete(row._id, row.name)} title='Delete beverage'>
            <i className='icon'><FcEmptyTrash /></i>
          </Button>
        </div>
      )
    } satisfies TableColumn<BeverageProps>]
      : []),
  ];

  const rows = beverageData?.success === true ? beverageData.data ?? [] : [];
  const categoryOptions = useMemo(() => {
    const labels = new Map((categoryCatalog?.data ?? []).map((item) => [item.name, item.label]));
    const used = [...new Set(rows.map((row) => row.category).filter(Boolean))];
    return used
      .map((name) => ({
        name,
        label: labels.get(name) || name.charAt(0).toUpperCase() + name.slice(1),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [categoryCatalog?.data, rows]);
  const activeCategory = category !== 'all' && categoryOptions.some((item) => item.name === category)
    ? category
    : 'all';
  const visibleRows = activeCategory === 'all'
    ? rows
    : rows.filter((row) => row.category === activeCategory);

  if (beverageData === undefined || !categoryReady) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Spinner size="sm" />
      </div>
    );
  }

  const chooseCategory = (next: string) => {
    setCategory(next);
    window.sessionStorage.setItem(categoryKey, next);
  };

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <div className="flex flex-wrap gap-2 py-2">
        <CategoryButton active={activeCategory === 'all'} onClick={() => chooseCategory('all')}>
          All
        </CategoryButton>
        {categoryOptions.map((item) => (
          <CategoryButton
            key={item.name}
            active={activeCategory === item.name}
            onClick={() => chooseCategory(item.name)}
          >
            {item.label}
          </CategoryButton>
        ))}
      </div>
      <Suspense>
        <PaginationComponent
          collectionName='beverages'
          columns={tableColumns}
          jointTableData={visibleRows}
          searchResetKey={searchResetKey}
          filterKey={activeCategory}
        />
      </Suspense>
    </div>
  );
};

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm ${active ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300'}`}
    >
      {children}
    </button>
  );
}

export default Beverages;

// Use the currency specified in the property table for the unit price. The category  should be a predifined option list, of union(literal). The category change should also be effected in the schema and database function.

// @file:beverages @file:convex/beverages  