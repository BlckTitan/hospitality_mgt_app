'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import { Spinner } from 'react-bootstrap';
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
        <header className="w-full border-b flex justify-between items-center mb-4">
          <h3>Edit stock movement</h3>
          <BackLink />
        </header>
        <p>Transaction not found.</p>
      </div>
    );
  }

  if (transactionResponse === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner animation="border" size="sm" variant="dark" />
      </div>
    );
  }

  if (!transactionResponse.success || !transactionResponse.data) {
    return <div>No data available!</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Update stock movement</h3>
        <BackLink />
      </header>
      <InventoryPageGuide page="transactions-edit" />
      <EditInventoryTransactionForm
        transactionData={transactionResponse.data}
        transactionId={transactionId}
      />
    </div>
  );
}
