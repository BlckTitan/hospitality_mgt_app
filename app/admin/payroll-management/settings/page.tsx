'use client'

import { BackLink } from '../../../../shared/pageHeader';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { PayrollPageGuide } from '../components/payrollPageGuide';
import Country from './components/country';
import ExtraPayRules from './components/extraPayRules';
import Holidays from './components/holidays';
import PayCycles from './components/payCycles';
import PayItemTypes from './components/payItemTypes';
import TimeOffTypes from './components/timeOffTypes';

export default function PayrollSettingsPage() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const propertyId = properties?.[0]?._id as Id<'properties'> | undefined;
  const config = useQuery(
    api.payrollConfig.getSettings,
    propertyId ? { propertyId } : 'skip'
  );

  if (!propertiesResponse?.data) return <div className="p-4">Loading...</div>;
  if (!propertyId) return <div className="p-4">No properties yet.</div>;
  if (config === undefined) return <div className="p-4">Loading...</div>;

  const data = config.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Payroll settings</h3>
        <BackLink />
      </header>
      <PayrollPageGuide page="settings" />

      <Country propertyId={propertyId} settings={data?.settings} />
      <PayCycles propertyId={propertyId} payCycles={data?.payCycles ?? []} />
      <TimeOffTypes propertyId={propertyId} timeOffTypes={data?.timeOffTypes ?? []} />
      <PayItemTypes propertyId={propertyId} payItemTypes={data?.payItemTypes ?? []} />
      <Holidays propertyId={propertyId} holidays={data?.holidays ?? []} />
      <ExtraPayRules propertyId={propertyId} extraPayRules={data?.extraPayRules ?? []} />
    </div>
  );
}
