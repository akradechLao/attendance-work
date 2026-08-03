"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export interface LeaveResult {
  success: boolean;
  message: string;
}

export interface LeaveRecord {
  id: number;
  empId: number;
  companyId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: Date;
  employee: {
    id: number;
    name: string;
    groupType: string;
    companyId: number;
  };
  leaveType: {
    id: number;
    name: string;
  };
}

export async function createLeave(
  empId: number,
  leaveTypeId: number,
  startDate: string,
  endDate: string,
  reason: string
): Promise<LeaveResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, message: "ไม่ได้เข้าสู่ระบบ" };
    }

    const employee = await prisma.employee.findUnique({ where: { id: empId } });
    if (!employee) {
      return { success: false, message: "ไม่พบพนักงาน" };
    }

    if (session.role === "employee" && employee.companyId !== session.companyId) {
      return { success: false, message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
    }

    if (startDate > endDate) {
      return { success: false, message: "วันที่เริ่มต้องมาก่อนวันที่สิ้นสุด" };
    }

    const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) {
      return { success: false, message: "ไม่พบประเภทการลา" };
    }

    await prisma.leaveRequest.create({
      data: {
        companyId: employee.companyId,
        empId,
        leaveTypeId,
        startDate,
        endDate,
        reason,
      },
    });

    revalidatePath("/leaves");
    revalidatePath("/");

    return { success: true, message: `บันทึกการลางานสำเร็จ (${employee.name})` };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function getAllLeaves(): Promise<LeaveRecord[]> {
  const session = await getSession();
  if (!session) return [];

  const where: any = {};
  if (session.role === "employee" && session.companyId) {
    where.companyId = session.companyId;
  }

  const records = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, groupType: true, companyId: true } },
      leaveType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return records.map((r) => ({
    id: r.id,
    empId: r.empId,
    companyId: r.companyId,
    leaveTypeId: r.leaveTypeId,
    startDate: r.startDate,
    endDate: r.endDate,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
    employee: r.employee,
    leaveType: r.leaveType,
  }));
}

function getThaiTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

export async function getUpcomingLeaves(): Promise<LeaveRecord[]> {
  const session = await getSession();
  if (!session) return [];

  const now = getThaiTime();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weekLater = new Date(now);
  weekLater.setDate(now.getDate() + 7);
  const weekLaterStr = `${weekLater.getFullYear()}-${String(weekLater.getMonth() + 1).padStart(2, "0")}-${String(weekLater.getDate()).padStart(2, "0")}`;

  const where: any = {
    startDate: { lte: weekLaterStr },
    endDate: { gte: today },
  };

  if (session.role === "employee" && session.companyId) {
    where.companyId = session.companyId;
  }

  const records = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, groupType: true, companyId: true } },
      leaveType: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return records.map((r) => ({
    id: r.id,
    empId: r.empId,
    companyId: r.companyId,
    leaveTypeId: r.leaveTypeId,
    startDate: r.startDate,
    endDate: r.endDate,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
    employee: r.employee,
    leaveType: r.leaveType,
  }));
}

export async function deleteLeave(id: number): Promise<LeaveResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, message: "ไม่ได้เข้าสู่ระบบ" };
    }

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) {
      return { success: false, message: "ไม่พบรายการลางาน" };
    }

    if (session.role === "employee" && leave.companyId !== session.companyId) {
      return { success: false, message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
    }

    await prisma.leaveRequest.delete({ where: { id } });
    revalidatePath("/leaves");
    revalidatePath("/");
    return { success: true, message: "ลบรายการลางานสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}
