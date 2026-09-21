type ShiftRecord = Record<string, any>;

export function shiftReportsUrl(projectId: string): string {
  return projectId === 'ALL'
    ? '/api/v1/drilling/shifts'
    : `/api/v1/drilling/shifts?project_id=${encodeURIComponent(projectId)}`;
}

export function projectShiftReports(reports: ShiftRecord[], projectId: string, holes: ShiftRecord[] = []): ShiftRecord[] {
  return reports
    .filter((report) => projectId === 'ALL' || report.project_id === projectId)
    .map((report) => ({
      ...report,
      shift_date: report.date ?? report.shift_date,
      total_metres_drilled: report.total_metres ?? report.total_metres_drilled ?? report.metres_drilled,
      core_recovery_pct: report.avg_core_recovery_pct ?? report.core_recovery_pct,
      productive_hours: report.total_productive_hours ?? report.productive_hours,
      driller_name: report.driller_name ?? report.supervisor_name,
      hole_numbers: report.hole_numbers || report.intervals?.map((interval: ShiftRecord) =>
        interval.hole_number || interval.drill_hole?.hole_number || holes.find((hole) =>
          hole.id === interval.drill_hole_id && hole.project_id === report.project_id
        )?.hole_number
      ).filter(Boolean).join(', ') || report.hole?.hole_number,
    }));
}
