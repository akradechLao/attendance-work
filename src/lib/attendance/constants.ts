// Positions that are excluded from attendance calculation (late/absent/leave)
// These positions can still check-in/check-out but won't be counted in reports
export const EXCLUDED_ATTENDANCE_POSITIONS = [
  "chairman",
  "md",
  "executive_director",
  "assistant_md",
];

export function isExcludedFromAttendance(position: string): boolean {
  return EXCLUDED_ATTENDANCE_POSITIONS.includes(position);
}
