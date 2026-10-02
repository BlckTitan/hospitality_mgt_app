'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../../shared/button';
import { useSearchParams } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { EditStoreTransactionForm } from '../components/editStoreTransactionForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditStoreTransactionPage() {
  const { isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const [modalShow, setModalShow] = useState(true);

  const transactionResponse = useQuery(
    api.storeTransactions.getStoreTransaction,
    isAuthenticated && transactionId ? { transactionId: transactionId as Id<'storeTransactions'> } : 'skip'
  );

  if (!transactionId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Store transaction not found</h3>
          <a href="/admin/bar-management/store-transactions" className="text-blue-600 hover:underline">
            Go back to Store Transactions
          </a>
        </div>
      </div>
    );
  }

  if (!transactionResponse?.success || !transactionResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const transaction = transactionResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Edit Store Transaction</h1>
        <p className="text-gray-600">Correct this store movement. Saving updates the central store quantity and, for an issue, the waiter’s float.</p>
      </div>
        <BackLink />
      </header>

      <ModalComponent
        transactionData={transaction}
        transactionId={transactionId}
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
      />
    </div>
  );
}

function ModalComponent(props: {
  transactionData: any;
  transactionId: string;
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Edit Store Transaction"
      body={
        <EditStoreTransactionForm
          transactionData={props.transactionData}
          transactionId={props.transactionId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
