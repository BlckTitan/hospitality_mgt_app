'use client';

import { BackLink } from '../../../shared/pageHeader';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Button } from 'react-bootstrap';
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

const CATEGORY_FILTERS = [
  { value: '', label: 'All' },
  ...EXPENSE_CATEGORY_OPTIONS,
] as const;

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
          category: category
            ? (category as 'utilities' | 'supplies' | 'staff' | 'maintenance' | 'other')
            : undefined,
        }
      : 'skip',
  );

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

  const totals = summary?.data;

  return (
    <div className='w-full p-4 bg-white'>
      <header className='w-full border-b flex justify-between items-center mb-4'>
        <h3>Expense Tracker</h3>
        <div className='flex items-center gap-3'>
          <BackLink />
          {canCreate && (
            <Button
              variant='light'
              className='cursor-pointer'
              style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
              onClick={() => setRecordOpen(true)}
            >
              <FcPlus className='w-8 h-8' />
            </Button>
          )}
        </div>
      </header>
      <BillingPageGuide page='expenses' />

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
        <Button size='sm' variant='outline-secondary' onClick={() => setAnchor(Date.now())}>
          Today
        </Button>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-6 gap-2 mb-4'>
        {EXPENSE_CATEGORY_OPTIONS.map((item) => (
          <div key={item.value} className='border p-3'>
            <p className='text-sm text-gray-600 mb-1'>{item.label}</p>
            <p className='text-lg font-semibold'>{formatMoney(totals?.[item.value])}</p>
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
        {CATEGORY_FILTERS.map((item) => (
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
