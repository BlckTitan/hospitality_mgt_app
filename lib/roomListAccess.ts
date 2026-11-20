/** Roles that still edit rooms and room types when they also hold Receptionist. */
const ROOM_LIST_EDITOR_ROLES = new Set([
  'Administrator',
  'Director',
  'General Manager',
  'Operations Manager',
  'IT Manager',
  'Manager',
  'Assistant Manager',
  'Supervisor',
]);

/** Receptionists see Rooms and Room Types without the Action column. */
export function showRoomListActions(roles: string[]) {
  if (!roles.includes('Receptionist')) return true;
  return roles.some((role) => ROOM_LIST_EDITOR_ROLES.has(role));
}
