'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditUserStockLogForm } from '../components/editUserStockLogForm';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../shared/modal';

export default function EditUserStockLogPage() {
  const searchParams = useSearchParams();
  const stockLogId = searchParams.get('stock_log_id');
  const [modalShow, setModalShow] = useState(true);

  const stockLogResponse = useQuery(
    api.userStockLogs.getUserStockLog, stockLogId ? { stockLogId: stockLogId as Id<'userStockLogs'> } : null
  );

  if (!stockLogId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">User stock log not found</h3>
          <a href="/admin/user-stock-logs" className="text-blue-600 hover:underline">
            Go back to User Stock Logs
          </a>
        </div>
      </div>
    );
  }

  if (!stockLogResponse?.success || !stockLogResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const stockLog = stockLogResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit User Stock Log</h3>
        <a href="/admin/user-stock-logs" className="text-blue-600 hover:underline">
          ← Back
        </a>
      </header>

      <ModalComponent
        stockLogData={stockLog}
        stockLogId={stockLogId}
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
  stockLogData: any;
  stockLogId: string;
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
      heading="Edit User Stock Log"
      body={
        <EditUserStockLogForm
          stockLogData={props.stockLogData}
          stockLogId={props.stockLogId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
