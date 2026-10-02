'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../../shared/button';
import { useSearchParams } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { EditUserStockLogForm } from '../components/editUserStockLogForm';
import { Id } from '../../../../../convex/_generated/dataModel';
import { api } from '../../../../../convex/_generated/api';
import BootstrapModal from '../../../../../shared/modal';

export default function EditUserStockLogPage() {
  const { isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const stockLogId = searchParams.get('stock_log_id');
  const [modalShow, setModalShow] = useState(true);

  const stockLogResponse = useQuery(
    api.userStockLogs.getUserStockLog,
    isAuthenticated && stockLogId ? { stockLogId: stockLogId as Id<'userStockLogs'> } : 'skip'
  );

  if (!stockLogId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">User stock log not found</h3>
          <a href="/admin/bar-management/user-stock-logs" className="text-blue-600 hover:underline">
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
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Edit User Stock Log</h1>
        <p className="text-gray-600">Correct this staff stock sheet. Sales stay total minus closing, waste, and comps.</p>
      </div>
        <BackLink />
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
