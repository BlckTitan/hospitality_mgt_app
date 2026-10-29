import * as yup from 'yup';
import { recordName } from '../../../../../lib/yupFields';
import { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS } from '../../shift/components/validation';

export { DEPARTMENT_LABELS, SHIFT_DEPARTMENTS };

export function splitDutyDuration(total?: number, start?: string, end?: string) {
  let minutes = total;
  if (minutes == null && start && end) {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    let diff = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (!Number.isFinite(diff)) diff = 8 * 60;
    if (diff <= 0) diff += 24 * 60;
    minutes = diff;
  }
  const value = minutes ?? 8 * 60;
  return { durationHours: Math.floor(value / 60), durationMinutesPart: value % 60 };
}

export function formatDutyLength(minutes?: number) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export const formSchema = yup.object().shape({
  department: yup
    .string()
    .oneOf([...SHIFT_DEPARTMENTS], 'Select a department')
    .required('Department is required'),
  name: recordName('Name', { max: 80 }),
  startTime: yup
    .string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Start time must be in HH:MM format')
    .required('Start time is required'),
  endTime: yup
    .string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'End time must be in HH:MM format')
    .required('End time is required'),
  durationHours: yup.number().min(0).max(72).required('Hours are required'),
  durationMinutesPart: yup
    .number()
    .min(0)
    .max(59)
    .required('Minutes are required')
    .test('duty-length', 'Duty length must be between 15 minutes and 72 hours', function (minutes) {
      const hours = this.parent.durationHours;
      if (hours == null || minutes == null || Number.isNaN(hours) || Number.isNaN(minutes)) return true;
      const total = Number(hours) * 60 + Number(minutes);
      return total >= 15 && total <= 72 * 60;
    }),
  isDefault: yup.boolean().required(),
  isActive: yup.boolean().optional(),
});
