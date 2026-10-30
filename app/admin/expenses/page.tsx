'use client';

import { BackLink } from '../../../shared/pageHeader';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Button } from '../../../shared/button';
import { FcPlus } from 'react-icons/fc';
import { api } from '../../../convex/_generated/api';
import { usePermissions } from '../../../hooks/usePermissions';
import { ExpenseCharts } from './components/expenseCharts';
import { ExpensesTable } from './components/expensesTable';
import { RecordExpenseForm } from './components/recordExpenseForm';
import { BillingPageGuide } from '../billing/components/billingPageGuide';
import BootstrapModal from '../../../shared/modal';
import { formatMoney } from '../billing/components/labels';
import {
  CASH_PERIOD_KINDS,
  cashPeriodBounds,
  cashPeriodLabel,
  shiftCashPeriodAnchor,
  type CashPeriodKind,
} from '../../../lib/cashPeriod';
import { EXPENSE_CATEGORY_OPTIONS } from './components/categoryLabels';
import { isSystemExpenseCategory } from '../../../convex/lib/expenseCategoryCatalog';

export default function ExpensesPage() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentProperty = propertiesResponse?.data?.[0];
  const currentPropertyId = currentProperty?._id;
  const timeZone = currentProperty?.timezone?.trim() || 'UTC';

  const [kind, setKind] = useState<CashPeriodKind>('day');
  const [anchor, setAnchor] = useState(() => Date.now());
  const [category, setCategory] = useState('');
  const [recordOpen, setRecordOpen] = useState(false);
  const { hasGranularPermission } = usePermissions();
  const canCreate = hasGranularPermission('expenses.create');
  const listedCategories = useQuery(
    api.expenseCategories.listExpenseCategories,
    currentPropertyId ? { propertyId: currentPropertyId } : 'skip',
  );

  const range = useMemo(
    () => cashPeriodBounds(anchor, kind, timeZone),
    [anchor, kind, timeZone],
  );
  const label = useMemo(
    () => cashPeriodLabel(anchor, kind, timeZone),
    [anchor, kind, timeZone],
  );

  const summary = useQuery(
    api.expenses.summarizeExpensesInRange,
    currentPropertyId ? { propertyId: currentPropertyId, start: range.start, end: range.end } : 'skip',
  );
  const expenses = useQuery(
    api.expenses.listExpensesInRange,
    currentPropertyId
      ? {
          propertyId: currentPropertyId,
          start: range.start,
          end: range.end,
          category: category || undefined,
        }
      : 'skip',
  );

  const totals = summary?.data;
  const categoryChoices = useMemo(() => {
    const fromServer = (listedCategories?.data ?? [])
      .filter((item) => item.isActive)
      .map((item) => ({ value: item.name, label: item.label }));
    const base = fromServer.length > 0
      ? fromServer
      : EXPENSE_CATEGORY_OPTIONS.map((item) => ({ value: item.value, label: item.label }));
    const known = new Set(base.map((item) => item.value));
    const extras = (totals?.custom ?? [])
      .filter((item) => item.amount > 0 && !known.has(item.name))
      .map((item) => ({ value: item.name, label: item.name }));
    return [...base, ...extras];
  }, [listedCategories?.data, totals?.custom]);

  const amountFor = (name: string) => {
    if (!totals) return undefined;
    if (isSystemExpenseCategory(name)) return totals[name];
    return totals.custom?.find((item) => item.name === name)?.amount ?? 0;
  };

  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>Loading...</div>
    );
  }

  if (!currentPropertyId) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className='w-full p-4 bg-white'>
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Expense Tracker</h1>
        <BillingPageGuide page='expenses' />
      </div>
        <div className='flex items-center gap-3'>
          <BackLink />
          <Link href='/admin/expenses/categories' className='text-sm font-medium text-blue-700 underline'>
            Categories
          </Link>
          {canCreate && (
            <Button
              variant='light'
              className='cursor-pointer'
              circle
              onClick={() => setRecordOpen(true)}
            >
              <FcPlus className='w-8 h-8' />
            </Button>
          )}
        </div>
      </header>
      <div className='flex flex-wrap items-center gap-2 mb-3'>
        {CASH_PERIOD_KINDS.map((periodKind) => (
          <Button
            key={periodKind}
            size='sm'
            variant={kind === periodKind ? 'dark' : 'outline-dark'}
            onClick={() => {
              setKind(periodKind);
              setAnchor(Date.now());
            }}
          >
            {periodKind.charAt(0).toUpperCase() + periodKind.slice(1)}
          </Button>
        ))}
        <Button
          size='sm'
          variant='outline-dark'
          onClick={() => setAnchor(shiftCashPeriodAnchor(anchor, kind, timeZone, -1))}
        >
          Previous
        </Button>
        <span className='px-2 font-medium'>{label}</span>
        <Button
          size='sm'
          variant='outline-dark'
          onClick={() => setAnchor(shiftCashPeriodAnchor(anchor, kind, timeZone, 1))}
        >
          Next
        </Button>
        <Button
          size='sm'
          variant='outline-secondary'
          onClick={() => {
            setKind('day');
            setAnchor(Date.now());
          }}
        >
          Today
        </Button>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4'>
        {categoryChoices.map((item) => (
          <div key={item.value} className='border p-3'>
            <p className='text-sm text-gray-600 mb-1'>{item.label}</p>
            <p className='text-lg font-semibold'>{formatMoney(amountFor(item.value))}</p>
          </div>
        ))}
        <div className='border p-3'>
          <p className='text-sm text-gray-600 mb-1'>Total</p>
          <p className='text-lg font-semibold'>{formatMoney(totals?.total)}</p>
        </div>
      </div>

      <ExpenseCharts
        propertyId={currentPropertyId}
        kind={kind}
        anchor={anchor}
        timeZone={timeZone}
        periodLabel={label}
        totals={totals}
      />

      <div className='flex flex-wrap items-center gap-2 mb-3'>
        {[{ value: '', label: 'All' }, ...categoryChoices].map((item) => (
          <Button
            key={item.value || 'all'}
            size='sm'
            variant={category === item.value ? 'dark' : 'outline-dark'}
            onClick={() => setCategory(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <ExpensesTable rows={expenses?.data ?? []} />

      <BootstrapModal
        show={recordOpen}
        onHide={() => setRecordOpen(false)}
        heading='Record expense'
        body={
          <RecordExpenseForm
            propertyId={currentPropertyId}
            timeZone={timeZone}
            onClose={() => setRecordOpen(false)}
          />
        }
      />
    </div>
  );
}
