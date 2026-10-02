'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import Spinner from '../../../../../shared/spinner';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditInventoryTransactionForm } from '../components/editInventoryTransactionForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { InventoryPageGuide } from '../../components/inventoryPageGuide';

export default function Page() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const transactionResponse = useQuery(
    api.inventoryTransactions.getInventoryTransaction,
    transactionId ? { transactionId: transactionId as Id<'inventoryTransactions'> } : 'skip'
  );

  if (!transactionId) {
    return (
      <div className="w-full p-4 bg-white">
        <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800">Edit stock movement</h1>
            <InventoryPageGuide page="transactions-edit" />
          </div>
          <BackLink />
        </header>
        <p>Transaction not found.</p>
      </div>
    );
  }

  if (transactionResponse === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner  size="sm"  />
      </div>
    );
  }

  if (!transactionResponse.success || !transactionResponse.data) {
    return <div>No data available!</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update stock movement</h1>
        <InventoryPageGuide page="transactions-edit" />
      </div>
        <BackLink />
      </header>
      <EditInventoryTransactionForm
        transactionData={transactionResponse.data}
        transactionId={transactionId}
      />
    </div>
  );
}
