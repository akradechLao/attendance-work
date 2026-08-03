export const SHIFT_TIMES: Record<string, { start: string; end: string; label: string }> = {
  WC0001: { start: "07:30", end: "16:30", label: "กะเช้า (สนาม)" },
  WC0002: { start: "08:00", end: "17:00", label: "กะเช้า (สำนักงาน)" },
  WC0003: { start: "08:00", end: "16:30", label: "กะเช้า 1" },
  WC0004: { start: "09:00", end: "18:00", label: "กะเช้า 2" },
  WC0005: { start: "09:00", end: "18:00", label: "กะเช้า 3" },
  WC0006: { start: "16:00", end: "00:30", label: "กะบ่าย 1" },
  WC007:  { start: "16:00", end: "01:00", label: "กะบ่าย 2" },
  WC008:  { start: "20:00", end: "05:00", label: "กะดึก 1" },
  WC009:  { start: "21:00", end: "06:00", label: "กะดึก 2" },
  WC010:  { start: "23:00", end: "08:00", label: "กะดึก 3" },
  WC011:  { start: "23:59", end: "09:00", label: "กะดึก 4" },
  WC012:  { start: "00:00", end: "08:00", label: "กะดึก 5" },
  WC013:  { start: "00:00", end: "08:30", label: "กะดึก 6" },
  WC014:  { start: "00:00", end: "09:00", label: "กะดึก 7" },
};

export function getShiftTime(shiftCode: string): { start: string; end: string } | null {
  const shift = SHIFT_TIMES[shiftCode];
  if (!shift) return null;
  return { start: shift.start, end: shift.end };
}

export function getShiftLabel(shiftCode: string): string {
  return SHIFT_TIMES[shiftCode]?.label || shiftCode;
}

export function getAllShiftCodes(): string[] {
  return Object.keys(SHIFT_TIMES);
}
