type Access = { roles: string[]; permissions: string[]; is_superuser: boolean } | null;

export function employeePermissions(access: Access) {
  const granted = (code: string) => !!access?.is_superuser || !!access?.permissions.includes(code);
  const hrOrAdmin = !!access?.is_superuser || !!access?.roles.some(role =>
    ['hr', 'admin', 'administrator', 'superadmin'].includes(role.trim().toLowerCase()));
  return {
    account: granted('users.update'),
    archive: granted('employees.archive'),
    contracts: hrOrAdmin && granted('employees.documents.manage'),
  };
}
