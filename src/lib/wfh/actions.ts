"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getThaiTime } from "@/lib/helpers";
import { getCompanyId } from "@/lib/auth/actions";

export async function requestWfh(empId: number, date: string, reason: string) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const employee = await prisma.employee.findUnique({ where: { id: empId } });
      if (!employee || employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบพนักงาน" };
      }
    }

    const now = getThaiTime();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthRecords = await prisma.wfhRecord.findMany({
      where: {
        empId,
        date: { startsWith: month },
        status: { not: "rejected" },
      },
    });

    if (monthRecords.length >= 1) {
      return { success: false, message: "ใช้สิทธิ์ WFH ครบ 1 วัน/เดือนแล้ว" };
    }

    const existing = await prisma.wfhRecord.findUnique({
      where: { empId_date: { empId, date } },
    });

    if (existing) {
      return { success: false, message: "มีการขอ WFH วันนี้แล้ว" };
    }

    await prisma.wfhRecord.create({
      data: { empId, date, reason, status: "approved" },
    });

    revalidatePath("/wfh");
    revalidatePath("/employees");
    return { success: true, message: "ขอ WFH สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function cancelWfh(id: number) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const record = await prisma.wfhRecord.findUnique({
        where: { id },
        include: { employee: true },
      });
      if (!record || record.employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบข้อมูล" };
      }
    }

    await prisma.wfhRecord.delete({ where: { id } });
    revalidatePath("/wfh");
    revalidatePath("/employees");
    return { success: true, message: "ยกเลิก WFH สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function getWfhRecords(empId?: number) {
  const companyId = await getCompanyId();
  const where: any = {};
  if (empId) where.empId = empId;
  if (companyId) where.employee = { companyId };
  return prisma.wfhRecord.findMany({
    where,
    include: { employee: true },
    orderBy: { date: "desc" },
  });
}

export async function getWfhOfMonth(empId: number) {
  const companyId = await getCompanyId();
  if (companyId) {
    const employee = await prisma.employee.findUnique({ where: { id: empId } });
    if (!employee || employee.companyId !== companyId) {
      return [];
    }
  }

  const now = getThaiTime();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return prisma.wfhRecord.findMany({
    where: {
      empId,
      date: { startsWith: month },
      status: { not: "rejected" },
    },
  });
}

export async function getWfhOfMonthBulk(): Promise<Record<number, number>> {
  const companyId = await getCompanyId();
  const now = getThaiTime();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const records = await prisma.wfhRecord.findMany({
    where: {
      date: { startsWith: month },
      status: { not: "rejected" },
      ...(companyId ? { employee: { companyId } } : {}),
    },
    select: { empId: true },
  });
  const usage: Record<number, number> = {};
  for (const r of records) {
    usage[r.empId] = (usage[r.empId] || 0) + 1;
  }
  return usage;
}

export async function isWfhDay(empId: number, date: string): Promise<boolean> {
  const companyId = await getCompanyId();
  if (companyId) {
    const employee = await prisma.employee.findUnique({ where: { id: empId } });
    if (!employee || employee.companyId !== companyId) {
      return false;
    }
  }

  const record = await prisma.wfhRecord.findUnique({
    where: { empId_date: { empId, date } },
  });
  return record !== null && record.status !== "rejected";
}
