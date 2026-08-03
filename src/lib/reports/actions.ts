"use server";

import { prisma } from "@/lib/prisma";
import { calculateOTHours } from "@/lib/business-rules";
import type { GroupType } from "@/generated/prisma/enums";
import { getDatesInRange, calcWorkHours } from "@/lib/helpers";
import { getCompanyId } from "@/lib/auth/actions";

export interface EmployeeStats {
  empId: number;
  name: string;
  groupType: string;
  totalDays: number;
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  leaveDays: number;
  leaveDetails: Record<string, number>;
  wfhDays: number;
  totalWorkHours: number;
  avgCheckIn: string;
}

export async function getAttendanceStats(startDate: string, endDate: string): Promise<EmployeeStats[]> {
  const companyId = await getCompanyId();
  const workDates = getDatesInRange(startDate, endDate);

  const [employees, attendance, leaves, wfhRecords] = await Promise.all([
    prisma.employee.findMany({
      where: { ...(companyId ? { companyId } : {}) },
      orderBy: { id: "asc" },
    }),
    prisma.attendanceLog.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(companyId ? { employee: { companyId } } : {}),
      },
      include: { employee: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: { not: "rejected" },
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
        ...(companyId ? { companyId } : {}),
      },
      include: { leaveType: true },
    }),
    prisma.wfhRecord.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: { not: "rejected" },
        ...(companyId ? { employee: { companyId } } : {}),
      },
    }),
  ]);

  return employees.map((emp) => {
    const empAttendance = attendance.filter((a) => a.empId === emp.id);
    const empLeaves = leaves.filter((l) => l.empId === emp.id);
    const empWfh = wfhRecords.filter((w) => w.empId === emp.id);

    const lateDays = empAttendance.filter((a) => a.status === "late").length;
    const onTimeDays = empAttendance.filter((a) => a.status === "on_time").length;
    const wfhDays = empWfh.length;

    const leaveDetails: Record<string, number> = {};
    let leaveDays = 0;
    for (const l of empLeaves) {
      const lStart = new Date(Math.max(new Date(l.startDate).getTime(), new Date(startDate).getTime()));
      const lEnd = new Date(Math.min(new Date(l.endDate).getTime(), new Date(endDate).getTime()));
      const days = Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) {
        leaveDays += days;
        leaveDetails[l.leaveType.name] = (leaveDetails[l.leaveType.name] || 0) + days;
      }
    }

    const attendedDates = new Set(empAttendance.map((a) => a.date));
    const wfhDates = new Set(empWfh.map((w) => w.date));
    const absentDays = workDates.filter((d) => !attendedDates.has(d) && !wfhDates.has(d)).length;

    const totalWorkHours = empAttendance.reduce((sum, a) => {
      if (a.checkIn && a.checkOut) {
        return sum + calcWorkHours(a.checkIn, a.checkOut);
      }
      return sum;
    }, 0);

    const checkInTimes = empAttendance.map((a) => a.checkIn).filter((c): c is string => c !== null);
    const avgCheckIn =
      checkInTimes.length > 0
        ? (() => {
            const totalMinutes = checkInTimes.reduce((sum, t) => {
              const [h, m] = t.split(":").map(Number);
              return sum + h * 60 + m;
            }, 0);
            const avg = Math.round(totalMinutes / checkInTimes.length);
            return `${String(Math.floor(avg / 60)).padStart(2, "0")}:${String(avg % 60).padStart(2, "0")}`;
          })()
        : "-";

    return {
      empId: emp.id,
      name: emp.name,
      groupType: emp.groupType,
      totalDays: lateDays + onTimeDays,
      lateDays,
      onTimeDays,
      absentDays: Math.max(0, absentDays - leaveDays),
      leaveDays,
      leaveDetails,
      wfhDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      avgCheckIn,
    };
  });
}

export async function getMonthlySummary(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return getAttendanceStats(startDate, endDate);
}

export async function getEmployeeAttendanceHistory(empId: number, startDate: string, endDate: string) {
  const companyId = await getCompanyId();
  if (companyId) {
    const employee = await prisma.employee.findUnique({ where: { id: empId } });
    if (!employee || employee.companyId !== companyId) {
      return [];
    }
  }

  const [attendance, wfhRecords, leaves] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: {
        empId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    }),
    prisma.wfhRecord.findMany({
      where: {
        empId,
        date: { gte: startDate, lte: endDate },
        status: { not: "rejected" },
      },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        empId,
        status: { not: "rejected" },
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const workDates = getDatesInRange(startDate, endDate);
  const wfhDates = new Set(wfhRecords.map((w) => w.date));

  return workDates.map((date) => {
    const att = attendance.find((a) => a.date === date);
    const isWfh = wfhDates.has(date);
    const isLeave = leaves.some((l) => l.startDate <= date && l.endDate >= date);
    let status: string;
    if (att) status = att.status === "late" ? "สาย" : "ตรงเวลา";
    else if (isWfh) status = "WFH";
    else if (isLeave) status = "ลา";
    else status = "ขาด";

    return {
      date,
      checkIn: att?.checkIn || null,
      checkOut: att?.checkOut || null,
      status,
      workHours: att?.checkIn && att?.checkOut ? Math.round(calcWorkHours(att.checkIn, att.checkOut) * 100) / 100 : null,
    };
  });
}

export interface OtSummaryItem {
  empId: number;
  name: string;
  groupType: string;
  totalOtHours: number;
  otDays: number;
  details: { date: string; checkOut: string; otHours: number }[];
}

export async function getOtSummary(startDate: string, endDate: string): Promise<OtSummaryItem[]> {
  const companyId = await getCompanyId();
  const [employees, records] = await Promise.all([
    prisma.employee.findMany({
      where: { ...(companyId ? { companyId } : {}) },
      orderBy: { id: "asc" },
    }),
    prisma.attendanceLog.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        checkOut: { not: null },
        ...(companyId ? { employee: { companyId } } : {}),
      },
    }),
  ]);

  return employees.map((emp) => {
    const empRecords = records.filter((r) => r.empId === emp.id);
    const details: { date: string; checkOut: string; otHours: number }[] = [];
    let totalOtHours = 0;

    for (const r of empRecords) {
      if (!r.checkOut) continue;
      const otHours = calculateOTHours(r.checkOut, emp.groupType as GroupType);
      if (otHours > 0) {
        details.push({ date: r.date, checkOut: r.checkOut, otHours });
        totalOtHours += otHours;
      }
    }

    return {
      empId: emp.id,
      name: emp.name,
      groupType: emp.groupType,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
      otDays: details.length,
      details,
    };
  });
}
