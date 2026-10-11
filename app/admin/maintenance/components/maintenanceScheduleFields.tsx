'use client';

import { FieldErrors, UseFormRegister } from 'react-hook-form';
import InputComponent from '../../../../shared/input';
import SelectComponent from '../../../../shared/select';
import { fieldRowClassName } from '../../../../shared/field';

export type ScheduleFormValues = {
  isScheduled?: boolean;
  scheduledDate?: string;
  repeatEvery?: string;
  customIntervalMonths?: number;
  reminderDays?: number;
};

export function dateInputToTimestamp(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, 9, 0, 0, 0).getTime();
}

export function timestampToDateInput(value?: number) {
  if (!value) return '';
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function repeatEveryFrom(intervalMonths?: number) {
  if (!intervalMonths) return 'none';
  if (intervalMonths === 1 || intervalMonths === 3 || intervalMonths === 6 || intervalMonths === 12) {
    return String(intervalMonths);
  }
  return 'custom';
}

export function intervalMonthsOf(data: ScheduleFormValues) {
  if (!data.isScheduled || !data.repeatEvery || data.repeatEvery === 'none') return 0;
  if (data.repeatEvery === 'custom') return Number(data.customIntervalMonths);
  return Number(data.repeatEvery);
}

export function intervalLabel(months?: number) {
  if (!months) return 'Once';
  if (months === 1) return 'Every month';
  if (months === 12) return 'Every year';
  return `Every ${months} months`;
}

export function reminderPhrase(daysUntil: number) {
  if (daysUntil < 0) {
    const days = Math.abs(daysUntil);
    return days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`;
  }
  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  return `Due in ${daysUntil} days`;
}

export function MaintenanceScheduleFields({
  register,
  errors,
  isScheduled,
  repeatEvery,
}: {
  register: UseFormRegister<ScheduleFormValues>;
  errors: FieldErrors<ScheduleFormValues>;
  isScheduled: boolean;
  repeatEvery?: string;
}) {
  return (
    <div className="w-full lg:w-8/12 mb-2 lg:mb-4 border rounded-sm p-3">
      <label className="flex items-center gap-2 mb-1">
        <input type="checkbox" {...register('isScheduled')} />
        <span>Schedule this maintenance</span>
      </label>
      <p className="text-sm text-gray-600 mb-3">
        Use this for repeating work, such as AC service every month or generator service every 3 months. A reminder shows when the date is close.
      </p>
      {isScheduled && (
        <>
          <div className={fieldRowClassName}>
            <InputComponent
              id="scheduledDate"
              label="Next maintenance date *"
              type="date"
              inputWidth="w-1/2"
              register={register('scheduledDate')}
              error={errors.scheduledDate}
            />
            <SelectComponent
              id="repeatEvery"
              label="Repeat *"
              selectWidth="w-1/2"
              register={register('repeatEvery')}
              error={errors.repeatEvery}
              options={[
                { value: 'none', label: 'Does not repeat' },
                { value: '1', label: 'Every month' },
                { value: '3', label: 'Every 3 months' },
                { value: '6', label: 'Every 6 months' },
                { value: '12', label: 'Every year' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>
          <div className={fieldRowClassName}>
            {repeatEvery === 'custom' && (
              <InputComponent
                id="customIntervalMonths"
                label="Months between visits *"
                type="number"
                inputWidth="w-1/2"
                step="1"
                register={register('customIntervalMonths')}
                error={errors.customIntervalMonths}
                placeholder="2"
              />
            )}
            <InputComponent
              id="reminderDays"
              label="Remind me this many days before *"
              type="number"
              inputWidth="w-1/2"
              step="1"
              register={register('reminderDays')}
              error={errors.reminderDays}
              placeholder="7"
            />
          </div>
        </>
      )}
    </div>
  );
}
