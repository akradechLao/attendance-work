"use server";

import { prisma } from "@/lib/prisma";
import { isTodaySunday } from "@/lib/business-rules";
import { getThaiTime, calcWorkHours } from "@/lib/helpers";
import { getCompanyId } from "@/lib/auth/actions";

export async function getTodayAttendance() {
  const companyId = await getCompanyId();
  const now = getThaiTime();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return prisma.attendanceLog.findMany({
    where: {
      date: today,
      ...(companyId ? { employee: { companyId } } : {}),
    },
    include: { employee: true },
    orderBy: { checkIn: "asc" },
  });
}

export async function getAllEmployees() {
  const companyId = await getCompanyId();
  return prisma.employee.findMany({
    where: { ...(companyId ? { companyId } : {}) },
    orderBy: { id: "asc" },
  });
}

export async function getSundayMissingAfternoon() {
  if (!isTodaySunday()) return [];

  const companyId = await getCompanyId();
  const now = getThaiTime();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const records = await prisma.attendanceLog.findMany({
    where: {
      date: today,
      checkIn: { not: null },
      ...(companyId ? { employee: { companyId } } : {}),
    },
    include: { employee: true },
  });

  return records.filter((r) => r.checkIn && r.checkIn < "13:00:00");
}

export async function getSaturdayShiftCount(date: string) {
  const companyId = await getCompanyId();
  return prisma.shiftSchedule.count({
    where: {
      workDate: date,
      ...(companyId ? { companyId } : {}),
    },
  });
}

export async function getAttendanceWithPhotos(startDate: string, endDate: string) {
  const companyId = await getCompanyId();
  const records = await prisma.attendanceLog.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      OR: [{ checkInPhoto: { not: null } }, { checkOutPhoto: { not: null } }],
      ...(companyId ? { employee: { companyId } } : {}),
    },
    include: { employee: true },
    orderBy: { date: "desc" },
  });

  return records.map((r) => ({
    id: r.id,
    date: r.date,
    employeeName: r.employee.name,
    groupType: r.employee.groupType,
    checkIn: r.checkIn,
    checkInPhoto: r.checkInPhoto,
    checkOut: r.checkOut,
    checkOutPhoto: r.checkOutPhoto,
    status: r.status,
    latLong: r.latLong,
  }));
}

export interface MonthlyStatsResult {
  employee: { id: number; name: string; groupType: string };
  month: string;
  totalDays: number;
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  leaveDays: number;
  wfhDays: number;
  workDays: number;
  leaveDetails: Record<string, number>;
  history: {
    date: string;
    dayName: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    workHours: number | null;
    checkInPhoto: string | null;
    checkOutPhoto: string | null;
  }[];
}

export async function getEmployeeMonthlyStats(
  empId: number,
  year: number,
  month: number
): Promise<MonthlyStatsResult | null> {
  const companyId = await getCompanyId();
  const employee = await prisma.employee.findUnique({ where: { id: empId } });
  if (!employee) return null;

  if (companyId && employee.companyId !== companyId) {
    return null;
  }

  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const allDates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0) {
      allDates.push(
        `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
      );
    }
    current.setDate(current.getDate() + 1);
  }

  const [attendance, leaves, wfhRecords] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: { empId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        empId,
        status: { not: "rejected" },
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
      include: { leaveType: true },
    }),
    prisma.wfhRecord.findMany({
      where: {
        empId,
        date: { gte: startDate, lte: endDate },
        status: { not: "rejected" },
      },
    }),
  ]);

  const lateDays = attendance.filter((a) => a.status === "late").length;
  const onTimeDays = attendance.filter((a) => a.status === "on_time").length;
  const wfhDates = new Set(wfhRecords.map((w) => w.date));
  const wfhDays = wfhRecords.length;

  const leaveDetails: Record<string, number> = {};
  let leaveDays = 0;
  for (const l of leaves) {
    const lStart = new Date(Math.max(new Date(l.startDate).getTime(), new Date(startDate).getTime()));
    const lEnd = new Date(Math.min(new Date(l.endDate).getTime(), new Date(endDate).getTime()));
    const days = Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days > 0) {
      leaveDays += days;
      leaveDetails[l.leaveType.name] = (leaveDetails[l.leaveType.name] || 0) + days;
    }
  }

  const attendedDates = new Set(attendance.map((a) => a.date));
  const absentDays = allDates.filter(
    (d) => !attendedDates.has(d) && !wfhDates.has(d) && !leaves.some((l) => l.startDate <= d && l.endDate >= d)
  ).length;

  const history = allDates.map((date) => {
    const att = attendance.find((a) => a.date === date);
    const d = new Date(date + "T00:00:00");
    const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const dayName = dayNames[d.getDay()];

    let status: string;
    if (att) {
      status = att.status === "late" ? "สาย" : "ตรงเวลา";
    } else if (wfhDates.has(date)) {
      status = "WFH";
    } else if (leaves.some((l) => l.startDate <= date && l.endDate >= date)) {
      status = "ลา";
    } else {
      status = "ขาด";
    }

    return {
      date,
      dayName,
      checkIn: att?.checkIn || null,
      checkOut: att?.checkOut || null,
      status,
      workHours: att?.checkIn && att?.checkOut ? Math.round(calcWorkHours(att.checkIn, att.checkOut) * 100) / 100 : null,
      checkInPhoto: att?.checkInPhoto || null,
      checkOutPhoto: att?.checkOutPhoto || null,
    };
  });

  return {
    employee: { id: employee.id, name: employee.name, groupType: employee.groupType },
    month: `${year}-${monthStr}`,
    totalDays: allDates.length,
    lateDays,
    onTimeDays,
    absentDays,
    leaveDays,
    wfhDays,
    workDays: lateDays + onTimeDays + wfhDays,
    leaveDetails,
    history,
  };
}

export interface WeeklyStatsResult {
  employee: { id: number; name: string; groupType: string };
  weekStart: string;
  weekEnd: string;
  days: {
    date: string;
    dayName: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    workHours: number | null;
  }[];
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  workHours: number;
}

export async function getEmployeeWeeklyStats(empId: number): Promise<WeeklyStatsResult | null> {
  const companyId = await getCompanyId();
  const employee = await prisma.employee.findUnique({ where: { id: empId } });
  if (!employee) return null;

  if (companyId && employee.companyId !== companyId) {
    return null;
  }

  const now = getThaiTime();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  const weekEnd = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;

  const allDates: string[] = [];
  const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    allDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const [attendance, leaves, wfhRecords] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: { empId, date: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        empId,
        status: { not: "rejected" },
        OR: [{ startDate: { lte: weekEnd }, endDate: { gte: weekStart } }],
      },
    }),
    prisma.wfhRecord.findMany({
      where: {
        empId,
        date: { gte: weekStart, lte: weekEnd },
        status: { not: "rejected" },
      },
    }),
  ]);

  const wfhDates = new Set(wfhRecords.map((w) => w.date));
  let lateDays = 0;
  let onTimeDays = 0;
  let absentDays = 0;
  let totalWorkHours = 0;

  const days = allDates.map((date) => {
    const att = attendance.find((a) => a.date === date);
    const d = new Date(date + "T00:00:00");
    const dayName = dayNames[d.getDay()];

    let status: string;
    if (att) {
      status = att.status === "late" ? "สาย" : "ตรงเวลา";
      if (att.status === "late") lateDays++;
      else onTimeDays++;
    } else if (wfhDates.has(date)) {
      status = "WFH";
    } else if (leaves.some((l) => l.startDate <= date && l.endDate >= date)) {
      status = "ลา";
    } else {
      status = "ขาด";
      absentDays++;
    }

    const workHours = att?.checkIn && att?.checkOut ? Math.round(calcWorkHours(att.checkIn, att.checkOut) * 100) / 100 : null;
    if (workHours) totalWorkHours += workHours;

    return {
      date,
      dayName,
      checkIn: att?.checkIn || null,
      checkOut: att?.checkOut || null,
      status,
      workHours,
    };
  });

  return {
    employee: { id: employee.id, name: employee.name, groupType: employee.groupType },
    weekStart,
    weekEnd,
    days,
    lateDays,
    onTimeDays,
    absentDays,
    workHours: Math.round(totalWorkHours * 100) / 100,
  };
}
