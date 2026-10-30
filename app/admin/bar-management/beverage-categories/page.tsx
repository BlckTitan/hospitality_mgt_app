'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { FcPlus } from 'react-icons/fc';
import { BackLink } from '../../../../shared/pageHeader';
import { Button } from '../../../../shared/button';
import BootstrapModal from '../../../../shared/modal';
import TableComponent, { TableColumn } from '../../../../shared/table';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { usePermissions } from '../../../../hooks/usePermissions';
import { BarManagementPageGuide } from '../components/barManagementPageGuide';
import { CreateBeverageCategoryForm } from './components/createCategoryForm';

type CategoryRow = {
  name: string;
  label: string;
  isSystem: boolean;
  isActive: boolean;
  categoryId: Id<'beverageCategories'> | null;
};

export default function BeverageCategoriesPage() {
  const [modalShow, setModalShow] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('fnb.create');
  const canUpdate = hasGranularPermission('fnb.update');
  const propertiesResponse = useQuery(api.property.listAccessibleProperties, {});
  const currentPropertyId = propertiesResponse?.data?.[0]?._id;
  const listed = useQuery(
    api.beverageCategories.listBeverageCategories,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );
  const setActive = useMutation(api.beverageCategories.setBeverageCategoryActive);

  if (!propertiesResponse?.data) {
    return <div className="w-full h-full flex justify-center items-center">Loading...</div>;
  }
  if (!currentPropertyId) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    );
  }

  const rows = listed?.data ?? [];
  const columns: TableColumn<CategoryRow>[] = [
    { label: 'Category', key: 'label' },
    {
      label: 'Source',
      key: 'isSystem',
      render: (_value, row) => (row.isSystem ? 'Built-in' : 'Custom'),
    },
    {
      label: 'Status',
      key: 'isActive',
      render: (_value, row) => (
        <span className={`inline-block px-2 py-1 text-white rounded-sm ${row.isActive ? 'bg-green-600' : 'bg-gray-400'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      label: 'Action',
      key: 'categoryId',
      render: (_value, row) => {
        if (row.isSystem || !row.categoryId || !canUpdate) return '—';
        return (
          <Button
            variant="white"
            size="sm"
            onClick={async () => {
              const next = !row.isActive;
              const response = await setActive({ categoryId: row.categoryId as Id<'beverageCategories'>, isActive: next });
              if (!response.success) {
                toast.error(response.message);
                return;
              }
              toast.success(response.message);
            }}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Beverage categories</h1>
          <BarManagementPageGuide page="beverage-categories" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/bar-management/beverages" className="text-sm font-medium text-blue-700 underline">
            Beverages
          </Link>
          <BackLink />
          {canCreate && (
            <Button variant="light" className="cursor-pointer" circle onClick={() => setModalShow(true)}>
              <FcPlus className="w-8 h-8" />
            </Button>
          )}
        </div>
      </header>
      <TableComponent columns={columns} data={rows} />
      <BootstrapModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        backdrop="static"
        keyboard={false}
        heading="Add beverage category"
        body={
          <CreateBeverageCategoryForm
            propertyId={currentPropertyId}
            onClose={() => setModalShow(false)}
          />
        }
      />
    </div>
  );
}
