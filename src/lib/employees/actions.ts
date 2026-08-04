"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/auth/actions";

export async function createEmployee(
  name: string,
  groupType: "A" | "B",
  preferredOffDay: string | null,
  options?: {
    companyId?: number;
    employeeCode?: string | null;
    pin?: string | null;
  }
) {
  try {
    const sessionCompanyId = await getCompanyId();
    const companyId = options?.companyId || sessionCompanyId;
    if (!companyId) {
      return { success: false, message: "ไม่พบข้อมูลบริษัท" };
    }
    await prisma.employee.create({
      data: {
        name,
        groupType,
        wfhQuota: 1,
        preferredOffDay,
        companyId,
        employeeCode: options?.employeeCode || null,
        pin: options?.pin || "1234",
      },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true, message: "เพิ่มพนักงานสำเร็จ" };
  } catch (error) {
    console.error("createEmployee error:", error);
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function updateEmployee(
  id: number,
  name: string,
  groupType: "A" | "B",
  preferredOffDay: string | null,
  options?: {
    employeeCode?: string | null;
    pin?: string | null;
  }
) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const employee = await prisma.employee.findUnique({ where: { id } });
      if (!employee || employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบพนักงาน" };
      }
    }

    await prisma.employee.update({
      where: { id },
      data: {
        name,
        groupType,
        wfhQuota: 1,
        preferredOffDay,
        ...(options?.employeeCode !== undefined ? { employeeCode: options.employeeCode || null } : {}),
        ...(options?.pin ? { pin: options.pin } : {}),
      },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true, message: "แก้ไขพนักงานสำเร็จ" };
  } catch (error) {
    console.error("updateEmployee error:", error);
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function deleteEmployee(id: number) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const employee = await prisma.employee.findUnique({ where: { id } });
      if (!employee || employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบพนักงาน" };
      }
    }

    await prisma.$transaction([
      prisma.attendanceLog.deleteMany({ where: { empId: id } }),
      prisma.shiftSchedule.deleteMany({ where: { empId: id } }),
      prisma.leaveRequest.deleteMany({ where: { empId: id } }),
      prisma.wfhRecord.deleteMany({ where: { empId: id } }),
      prisma.employee.delete({ where: { id } }),
    ]);
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true, message: "ลบพนักงานสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}
