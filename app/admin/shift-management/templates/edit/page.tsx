'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import React, { useState, useEffect } from 'react';
import { Button } from '../../../../../shared/button';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import BootstrapModal from '../../../../../shared/modal';
import EditTemplateForm from '../components/editTemplateForm';
import { ShiftPageGuide } from '../../components/shiftPageGuide';

export default function EditTemplatePage() {
  const [modalShow, setModalShow] = useState(true);
  const [templateId, setTemplateId] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('template_id');
    if (id) setTemplateId(id);
  }, []);

  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';
  const templateResponse = useQuery(
    api.shiftTemplates.getShiftTemplate,
    templateId ? { templateId: templateId as any } : 'skip',
  );

  useEffect(() => {
    if (templateResponse?.success && templateResponse?.data) {
      setPropertyId(templateResponse.data.propertyId);
    }
  }, [templateResponse]);

  if (!propertiesResponse?.data || !templateResponse?.data) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    );
  }

  if (!templateResponse?.success) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">Department shift not found!</p>
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
            onClick={() => { window.location.href = '/admin/shift-management/templates'; }}
          >
            ×
          </Button>
        </div>
      </header>
      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        propertyId={currentPropertyId}
        templateData={templateResponse.data}
        templateId={templateId}
      />
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  propertyId: string;
  templateData: any;
  templateId: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => { window.location.href = '/admin/shift-management/templates'; }}
      backdrop="static"
      keyboard={false}
      heading="Edit department shift"
      body={
        <EditTemplateForm
          onSuccess={() => props.setModalShow(false)}
          onClose={() => { window.location.href = '/admin/shift-management/templates'; }}
          propertyId={props.propertyId}
          templateData={props.templateData}
          templateId={props.templateId}
        />
      }
    />
  );
}
