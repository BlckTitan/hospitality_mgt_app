'use client';
import { goToList } from '../../../../../shared/goToList';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState, useEffect } from 'react';
import { Button } from '../../../../../shared/button';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';
import EditTemplateForm from '../components/editTemplateForm';
import { ShiftPageGuide } from '../../components/shiftPageGuide';

export default function EditTemplatePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [modalShow, setModalShow] = useState(true);
  const [templateId, setTemplateId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('template_id');
    if (id) setTemplateId(id);
  }, []);

  const templateResponse = useQuery(
    api.shiftTemplates.getShiftTemplate,
    !isLoading && isAuthenticated && templateId
      ? { templateId: templateId as Id<'shiftTemplates'> }
      : 'skip',
  );

  if (!templateId || templateResponse === undefined) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (!templateResponse.success || !templateResponse.data) {
    const message = templateResponse.success
      ? 'Department shift not found!'
      : templateResponse.message;
    return (
      <div className="w-full h-full flex flex-col justify-center items-center gap-3 p-4">
        <p className="text-xl text-center">{message}</p>
        <a href="/admin/shift-management/templates" className="text-blue-600 hover:underline">
          Back to department shifts
        </a>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Edit department shift</h1>
        <ShiftPageGuide page="templates-edit" />
      </div>
        <div className="flex items-center gap-3 shrink-0">
          <BackLink />
          <Button
            variant="light"
            className="cursor-pointer"
            circle
            onClick={() => { goToList('/admin/shift-management/templates'); }}
          >
            ×
          </Button>
        </div>
      </header>
      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        templateData={templateResponse.data}
        templateId={templateId}
      />
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  templateData: any;
  templateId: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => { goToList('/admin/shift-management/templates'); }}
      backdrop="static"
      keyboard={false}
      heading="Edit department shift"
      body={
        <EditTemplateForm
          onSuccess={() => props.setModalShow(false)}
          onClose={() => { goToList('/admin/shift-management/templates'); }}
          templateData={props.templateData}
          templateId={props.templateId}
        />
      }
    />
  );
}
