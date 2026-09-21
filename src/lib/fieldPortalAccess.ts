export function hasSupervisorRole(access: {roles?: string[]} | null | undefined): boolean {
  return !!access?.roles?.some(role => role.trim().toLowerCase() === 'supervisor');
}
export function canOpenFieldTab(access: {roles?: string[]} | null | undefined, tab: string): boolean {
  return hasSupervisorRole(access) || !['SHIFT_LOGS', 'DRILL_HOLES', 'WORK_ORDERS'].includes(tab);
}
