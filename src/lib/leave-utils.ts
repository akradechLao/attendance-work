import { prisma } from "@/lib/prisma";

export interface LeaveTypeData {
  id: number;
  name: string;
  advanceDays: number;
  quotaMonthly: number;
  quotaDaily: number;
  quotaContract: number;
}

export async function getLeaveTypes(companyId: number): Promise<LeaveTypeData[]> {
  const types = await prisma.leaveType.findMany({
    where: { companyId, isActive: true },
    orderBy: { id: "asc" },
  });

  return types.map((t) => ({
    id: t.id,
    name: t.name,
    advanceDays: t.advanceDays,
    quotaMonthly: t.quotaMonthly,
    quotaDaily: t.quotaDaily,
    quotaContract: t.quotaContract,
  }));
}

export async function checkLeaveQuota(
  empId: number,
  leaveTypeId: number,
  startDate: string,
  endDate: string
): Promise<{ allowed: boolean; message: string }> {
  const employee = await prisma.employee.findUnique({ where: { id: empId } });
  if (!employee) {
    return { allowed: false, message: "ไม่พบพนักงาน" };
  }

  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType) {
    return { allowed: false, message: "ไม่พบประเภทการลา" };
  }

  const days = calculateLeaveDays(startDate, endDate);

  const year = new Date(startDate).getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const usedLeaves = await prisma.leaveRequest.findMany({
    where: {
      empId,
      leaveTypeId,
      status: { not: "rejected" },
      startDate: { gte: yearStart },
      endDate: { lte: yearEnd },
    },
  });

  let totalUsed = 0;
  for (const leave of usedLeaves) {
    totalUsed += calculateLeaveDays(leave.startDate, leave.endDate);
  }

  const quota = employee.groupType === "A" ? leaveType.quotaMonthly : leaveType.quotaDaily;
  const remaining = quota - totalUsed;

  if (days > remaining) {
    return {
      allowed: false,
      message: `โควตาไม่เพียงพอ (ใช้ไปแล้ว ${totalUsed} วัน, เหลือ ${remaining} วัน)`,
    };
  }

  if (leaveType.advanceDays > 0) {
    const today = new Date();
    const leaveStart = new Date(startDate);
    const diffDays = Math.ceil((leaveStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < leaveType.advanceDays) {
      return {
        allowed: false,
        message: `ต้องล่วงหน้าอย่างน้อย ${leaveType.advanceDays} วัน`,
      };
    }
  }

  return { allowed: true, message: "ผ่านเงื่อนไข" };
}

export function calculateLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}
