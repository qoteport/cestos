export interface EmployeeLocationDetails {
  projectName: string | null;
  siteName: string | null;
  displayLocation: string;
  isProject: boolean;
}

export function getEmployeeDisplayLocationDetails(
  emp: any,
  projects?: any[],
  locations?: any[]
): EmployeeLocationDetails {
  if (!emp) {
    return {
      projectName: null,
      siteName: null,
      displayLocation: 'Headquarters',
      isProject: false,
    };
  }

  // 1. Determine active project name
  const projName =
    emp.current_project_name ||
    emp.assigned_project_name ||
    emp.project_name ||
    emp.current_project?.name ||
    emp.assigned_project?.name ||
    emp.project?.name ||
    (Array.isArray(projects) && (emp.current_project_id || emp.assigned_project_id || emp.project_id)
      ? projects.find((p: any) => String(p.id) === String(emp.current_project_id || emp.assigned_project_id || emp.project_id))?.name
      : null);

  // 2. Determine active project site / location name
  const siteName =
    emp.current_location_name ||
    emp.current_site_name ||
    emp.assigned_site_name ||
    emp.site_name ||
    emp.assigned_location_name ||
    emp.current_location?.name ||
    emp.assigned_site?.name ||
    emp.site?.name ||
    (Array.isArray(locations) && (emp.current_location_id || emp.assigned_location_id || emp.site_id || emp.location_id)
      ? locations.find((l: any) => String(l.id) === String(emp.current_location_id || emp.assigned_location_id || emp.site_id || emp.location_id))?.name
      : null);

  // Fallback: Default to what is currently showing (home location / work location / headquarters)
  const defaultLoc =
    (Array.isArray(locations) && emp.home_location_id
      ? locations.find((l: any) => String(l.id) === String(emp.home_location_id))?.name
      : null) ||
    emp.home_location_name ||
    emp.work_location ||
    emp.home_location ||
    emp.location_name ||
    emp.location?.name ||
    'Headquarters';

  if (projName && String(projName).trim()) {
    const pStr = String(projName).trim();
    const sStr = siteName && String(siteName).trim() && String(siteName).trim().toLowerCase() !== pStr.toLowerCase()
      ? String(siteName).trim()
      : null;

    return {
      projectName: pStr,
      siteName: sStr,
      displayLocation: sStr ? `${pStr} — ${sStr}` : pStr,
      isProject: true,
    };
  }

  return {
    projectName: null,
    siteName: null,
    displayLocation: defaultLoc,
    isProject: false,
  };
}

export function getEmployeeDisplayLocation(
  emp: any,
  projects?: any[],
  locations?: any[]
): string {
  return getEmployeeDisplayLocationDetails(emp, projects, locations).displayLocation;
}
