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
import { BillingPageGuide } from '../../billing/components/billingPageGuide';
import { CreateExpenseCategoryForm } from './components/createCategoryForm';

type CategoryRow = {
  name: string;
  label: string;
  isSystem: boolean;
  isActive: boolean;
  categoryId: Id<'expenseCategories'> | null;
};

export default function ExpenseCategoriesPage() {
  const [modalShow, setModalShow] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('expenses.create');
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id;
  const listed = useQuery(
    api.expenseCategories.listExpenseCategories,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );
  const setActive = useMutation(api.expenseCategories.setExpenseCategoryActive);

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
        if (row.isSystem || !row.categoryId || !canCreate) return '—';
        return (
          <Button
            variant="white"
            size="sm"
            onClick={async () => {
              const next = !row.isActive;
              const response = await setActive({ categoryId: row.categoryId as Id<'expenseCategories'>, isActive: next });
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
          <h1 className="text-2xl font-bold text-gray-800">Expense categories</h1>
          <BillingPageGuide page="expense-categories" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/expenses" className="text-sm font-medium text-blue-700 underline">
            Expenses
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
        heading="Add expense category"
        body={
          <CreateExpenseCategoryForm
            propertyId={currentPropertyId}
            onClose={() => setModalShow(false)}
          />
        }
      />
    </div>
  );
}
