'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../../shared/button';
import { useSearchParams } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { EditBarForm } from '../components/editBarForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditBarPage() {
  const { isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const barId = searchParams.get('bar_id');
  const [modalShow, setModalShow] = useState(true);

  const barResponse = useQuery(
    api.bars.getBar,
    isAuthenticated && barId ? { barId: barId as Id<'bars'> } : 'skip'
  );

  if (!barId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Bar not found</h3>
          <a href="/admin/bar-management/bar" className="text-blue-600 hover:underline">
            Go back to Bars
          </a>
        </div>
      </div>
    );
  }

  if (!barResponse?.success || !barResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const bar = barResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Edit Bar</h1>
        <p className="text-gray-600">Update this bar’s name and whether it is active. Inactive bars drop off issue and stock-log lists.</p>
      </div>
        <BackLink />
      </header>

      <ModalComponent
        barData={bar}
        barId={barId}
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
  barData: any;
  barId: string;
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
      heading="Edit Bar"
      body={
        <EditBarForm
          barData={props.barData}
          barId={props.barId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}