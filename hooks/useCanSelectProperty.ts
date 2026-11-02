'use client';

import { isFloorServiceOnly } from '../lib/staff-scope';
import { usePermissions } from './usePermissions';

/** Waiters and bartenders stay on their assigned property. */
export function useCanSelectProperty() {
  const { roles } = usePermissions();
  return !isFloorServiceOnly(roles);
}
