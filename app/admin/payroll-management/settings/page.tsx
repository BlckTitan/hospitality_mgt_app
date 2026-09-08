'use client'

import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { PayrollPageGuide } from '../components/payrollPageGuide';

export default function PayrollSettingsPage() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const propertyId = properties?.[0]?._id as Id<'properties'> | undefined;
  const config = useQuery(
    api.payrollConfig.getSettings,
    propertyId ? { propertyId } : 'skip'
  );
  const seedSettings = useMutation(api.payrollConfig.seedSettings);
  const createPayCycle = useMutation(api.payrollConfig.createPayCycle);
  const createTimeOffType = useMutation(api.payrollConfig.createTimeOffType);
  const createPayItemType = useMutation(api.payrollConfig.createPayItemType);
  const createHoliday = useMutation(api.payrollConfig.createHoliday);
  const createExtraPayRule = useMutation(api.payrollConfig.createExtraPayRule);

  const [country, setCountry] = useState('NG');
  const [cycleName, setCycleName] = useState('Monthly');
  const [leaveName, setLeaveName] = useState('');
  const [leaveCode, setLeaveCode] = useState('');
  const [leavePaid, setLeavePaid] = useState(true);
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemKind, setItemKind] = useState<'earning' | 'allowance' | 'deduction'>('allowance');
  const [itemAmount, setItemAmount] = useState(0);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [ruleKind, setRuleKind] = useState<'daily_overtime' | 'weekend' | 'public_holiday'>('weekend');
  const [ruleMultiplier, setRuleMultiplier] = useState(1.5);

  if (!propertiesResponse?.data) return <div className="p-4">Loading...</div>;
  if (!propertyId) return <div className="p-4">No properties yet.</div>;

  const data = config?.data;
  const settings = data?.settings;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4">
        <h3>Payroll settings</h3>
      </header>
      <PayrollPageGuide page="settings" />

      {!settings && (
        <section className="mb-6 p-3">
          <div className='w-fit h-fit'>
            {/* country settings */}
          </div>
          <p>No Payroll settings yet. Seed from the property country pack (NG or generic).</p>
          <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 mb-2 lg:mb-4">
            <div className="w-full lg:w-2/12">
              <label htmlFor="country">Country</label>
              <select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="NG">Nigeria (NG)</option>
                <option value="generic">Generic</option>
              </select>
            </div>
          </div>
          <Button
            variant="dark"
            className="mt-2"
            onClick={async () => {
              const result = await seedSettings({ propertyId, country });
              if (result.success === false) toast.error(result.message);
              else toast.success(result.message);
            }}
          >
            Seed Payroll settings
          </Button>
        </section>
      )}

      {settings && (
        <section className="mb-6">
          <p>Country: {settings.country} · Pack: {settings.jurisdictionPack}</p>
          <p>Daily hours limit: {settings.regularHoursLimitDaily ?? '—'} · OT multiplier: {settings.overtimeMultiplier}</p>
        </section>
      )}

      <section className="mb-6">
        <h4>Pay cycles</h4>
        <ul>
          {(data?.payCycles ?? []).map((row) => (
            <li key={row._id}>{row.name} ({row.frequency}){row.isDefault ? ' — default' : ''}</li>
          ))}
        </ul>
        <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 mb-2 lg:mb-4">
          <div className="w-full lg:w-1/3">
            <input value={cycleName} onChange={(e) => setCycleName(e.target.value)} placeholder="Pay cycle name" />
          </div>
        </div>
        <Button
          variant="dark"
          onClick={async () => {
            const result = await createPayCycle({
              propertyId,
              name: cycleName,
              frequency: 'monthly',
              anchorDate: Date.now(),
              cutoffDaysBeforePayDate: 2,
              isDefault: (data?.payCycles ?? []).length === 0,
            });
            if (result.success === false) toast.error(result.message);
            else toast.success(result.message);
          }}
        >
          Add Pay cycle
        </Button>
      </section>

      <section className="mb-6">
        <h4>Time-off types</h4>
        <ul>
          {(data?.timeOffTypes ?? []).map((row) => (
            <li key={row._id}>{row.name} ({row.paid ? 'paid' : 'unpaid'})</li>
          ))}
        </ul>
        <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 mb-2 lg:mb-4">
          <div className="w-full lg:w-1/3">
            <input value={leaveCode} onChange={(e) => setLeaveCode(e.target.value)} placeholder="Code" />
          </div>
          <div className="w-full lg:w-1/3">
            <input value={leaveName} onChange={(e) => setLeaveName(e.target.value)} placeholder="Name" />
          </div>
          <div className="w-full lg:w-1/3">
            <label>
              <input type="checkbox" checked={leavePaid} onChange={(e) => setLeavePaid(e.target.checked)} /> Paid
            </label>
          </div>
        </div>
        <Button
          variant="dark"
          onClick={async () => {
            const result = await createTimeOffType({
              propertyId,
              code: leaveCode,
              name: leaveName,
              paid: leavePaid,
              countsTowardOvertime: false,
            });
            if (result.success === false) toast.error(result.message);
            else toast.success(result.message);
          }}
        >
          Add Time-off type
        </Button>
      </section>

      <section className="mb-6">
        <h4>Pay item types</h4>
        <ul>
          {(data?.payItemTypes ?? []).map((row) => (
            <li key={row._id}>{row.name} ({row.kind}, {row.source})</li>
          ))}
        </ul>
        <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 mb-2 lg:mb-4">
          <div className="w-full lg:w-1/3">
            <input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="Code" />
          </div>
          <div className="w-full lg:w-1/3">
            <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Name" />
          </div>
          <div className="w-full lg:w-1/3">
            <select value={itemKind} onChange={(e) => setItemKind(e.target.value as typeof itemKind)}>
              <option value="earning">Earning</option>
              <option value="allowance">Allowance</option>
              <option value="deduction">Deduction</option>
            </select>
          </div>
        </div>
        <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 mb-2 lg:mb-4">
          <div className="w-full lg:w-1/3">
            <input
              type="number"
              value={itemAmount}
              onChange={(e) => setItemAmount(Number(e.target.value))}
              placeholder="Flat amount"
            />
          </div>
        </div>
        <Button
          variant="dark"
          onClick={async () => {
            const result = await createPayItemType({
              propertyId,
              code: itemCode,
              name: itemName,
              kind: itemKind,
              calculation: 'flat',
              defaultAmount: itemAmount,
            });
            if (result.success === false) toast.error(result.message);
            else toast.success(result.message);
          }}
        >
          Add Pay item type
        </Button>
      </section>

      <section className="mb-6">
        <h4>Holidays</h4>
        <ul>
          {(data?.holidays ?? []).map((row) => (
            <li key={row._id}>{new Date(row.date).toISOString().slice(0, 10)} — {row.name}</li>
          ))}
        </ul>
        <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 mb-2 lg:mb-4">
          <div className="w-full lg:w-1/3">
            <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
          </div>
          <div className="w-full lg:w-1/3">
            <input value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="Name" />
          </div>
        </div>
        <Button
          variant="dark"
          onClick={async () => {
            if (!holidayDate) return;
            const result = await createHoliday({
              propertyId,
              date: new Date(holidayDate).getTime(),
              name: holidayName,
              isPaid: true,
            });
            if (result.success === false) toast.error(result.message);
            else toast.success(result.message);
          }}
        >
          Add Holiday
        </Button>
      </section>

      <section className="mb-6">
        <h4>Extra pay rules</h4>
        <ul>
          {(data?.extraPayRules ?? []).map((row) => (
            <li key={row._id}>{row.kind} × {row.multiplier}</li>
          ))}
        </ul>
        <div className="w-full h-fit flex flex-col lg:flex-row justify-between items-center gap-1 mb-2 lg:mb-4">
          <div className="w-full lg:w-1/3">
            <select value={ruleKind} onChange={(e) => setRuleKind(e.target.value as typeof ruleKind)}>
              <option value="daily_overtime">Daily overtime</option>
              <option value="weekend">Weekend</option>
              <option value="public_holiday">Public holiday</option>
            </select>
          </div>
          <div className="w-full lg:w-1/3">
            <input
              type="number"
              step="0.1"
              value={ruleMultiplier}
              onChange={(e) => setRuleMultiplier(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          variant="dark"
          onClick={async () => {
            const result = await createExtraPayRule({
              propertyId,
              kind: ruleKind,
              multiplier: ruleMultiplier,
            });
            if (result.success === false) toast.error(result.message);
            else toast.success(result.message);
          }}
        >
          Add Extra pay rule
        </Button>
      </section>
    </div>
  );
}
