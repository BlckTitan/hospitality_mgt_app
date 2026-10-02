'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState } from 'react';
import { Button } from '../../../../../shared/button';
import { useSearchParams } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { EditBeverageForm } from '../components/editBeverageForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditBeveragePage() {
  const { isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const beverageId = searchParams.get('beverage_id');
  const [modalShow, setModalShow] = useState(true);

  const beverageResponse = useQuery(
    api.beverages.getBeverage,
    isAuthenticated && beverageId ? { beverageId: beverageId as Id<'beverages'> } : 'skip'
  );

  if (!beverageId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Beverage not found</h3>
          <a href="/admin/bar-management/beverages" className="text-blue-600 hover:underline">Go back to Beverages</a>
        </div>
      </div>
    );
  }

  if (!beverageResponse?.success || !beverageResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const beverage = beverageResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Edit Beverage</h1>
        <p className="text-gray-600">Update category, prices, cost, and reorder level. Reorder level drives alerts when store stock is low.</p>
      </div>
        <BackLink />
      </header>

      <ModalComponent
        beverageData={beverage}
        beverageId={beverageId}
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => setModalShow(false)}
      />
    </div>
  );
}

function ModalComponent(props: {
  beverageData: any;
  beverageId: string;
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
      heading="Edit Beverage"
      body={
        <EditBeverageForm
          beverageData={props.beverageData}
          beverageId={props.beverageId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
