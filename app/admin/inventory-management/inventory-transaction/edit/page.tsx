'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditInventoryTransactionForm } from '../components/editInventoryTransactionForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditInventoryTransactionPage() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const [modalShow, setModalShow] = useState(true);

  const transactionResponse = useQuery(
    api.inventoryTransactions.getInventoryTransaction, 
    transactionId ? { transactionId: transactionId as Id<'inventoryTransactions'> } : null
  );

  if (!transactionId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Transaction not found</h3>
          <a href="/admin/inventory-management/inventory-transaction" className="text-blue-600 hover:underline">
            Go back to Inventory Transactions
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
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Inventory Transaction</h3>
        <a href="/admin/inventory-management/inventory-transaction" className="text-blue-600 hover:underline">
          ← Back
        </a>
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
      heading="Edit Inventory Transaction"
      body={
        <EditInventoryTransactionForm
          transactionData={props.transactionData}
          transactionId={props.transactionId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
