type Row = Record<string, any>;

export type DrillHoleProgress = {
  currentDepthM: number;
  targetDepthM: number;
  remainingDepthM: number;
  progressPct: number | null;
};

export function drillHoleProgressById(holes: Row[], shifts: Row[], excludedShiftId?: string): Map<string, DrillHoleProgress> {
  const deepestByHole = new Map<string, number>();

  shifts.forEach((shift) => {
    if (shift.id === excludedShiftId || shift.status === 'CANCELLED') return;
    const intervals = Array.isArray(shift.intervals) ? shift.intervals : [];
    intervals.forEach((interval: Row) => {
      const holeId = interval.drill_hole_id || shift.hole_id;
      const toDepth = Number(interval.to_depth_m);
      if (!holeId || !Number.isFinite(toDepth) || toDepth < 0) return;
      deepestByHole.set(holeId, Math.max(deepestByHole.get(holeId) || 0, toDepth));
    });
  });

  return new Map(holes.map((hole) => {
    const targetDepthM = Math.max(0, Number(hole.target_depth_m) || 0);
    const currentDepthM = deepestByHole.get(hole.id) || 0;
    const progressPct = targetDepthM > 0 ? Math.min(100, Number(((currentDepthM / targetDepthM) * 100).toFixed(1))) : null;
    return [hole.id, {
      currentDepthM,
      targetDepthM,
      remainingDepthM: Math.max(0, targetDepthM - currentDepthM),
      progressPct,
    }];
  }));
}
