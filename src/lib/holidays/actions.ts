"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getThaiTime } from "@/lib/helpers";
import { getCompanyId } from "@/lib/auth/actions";

export async function getCompanyHolidays(year?: number) {
  const companyId = await getCompanyId();
  const now = getThaiTime();
  const y = year || now.getFullYear();
  return prisma.companyHoliday.findMany({
    where: {
      year: y,
      ...(companyId ? { companyId } : {}),
    },
    orderBy: { date: "asc" },
  });
}

export async function addCompanyHoliday(date: string, name: string) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return { success: false, message: "ไม่พบข้อมูลบริษัท" };
    }
    const year = parseInt(date.substring(0, 4));
    const existing = await prisma.companyHoliday.findFirst({
      where: { companyId, date },
    });
    if (existing) {
      return { success: false, message: "วันนี้ถูกบันทึกเป็นวันหยุดแล้ว" };
    }
    await prisma.companyHoliday.create({
      data: { date, name, year, companyId },
    });
    revalidatePath("/holidays");
    return { success: true, message: "เพิ่มวันหยุดสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function deleteCompanyHoliday(id: number) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const holiday = await prisma.companyHoliday.findUnique({ where: { id } });
      if (!holiday || holiday.companyId !== companyId) {
        return { success: false, message: "ไม่พบข้อมูล" };
      }
    }

    await prisma.companyHoliday.delete({ where: { id } });
    revalidatePath("/holidays");
    return { success: true, message: "ลบวันหยุดสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function syncHolidaysFromApi(year: number) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return { success: false, message: "ไม่พบข้อมูลบริษัท" };
    }
    const { fetchThaiHolidays } = await import("@/lib/thai-holidays");
    const holidays = await fetchThaiHolidays(year);

    let added = 0;
    let skipped = 0;

    for (const h of holidays) {
      const existing = await prisma.companyHoliday.findFirst({
        where: { companyId, date: h.date },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const y = parseInt(h.date.substring(0, 4));
      await prisma.companyHoliday.create({
        data: { date: h.date, name: h.name, year: y, companyId },
      });
      added++;
    }

    revalidatePath("/holidays");
    return {
      success: true,
      message: `ดึงวันหยุดปี ${year} สำเร็จ: เพิ่ม ${added} วัน, ข้าม ${skipped} วัน (มีอยู่แล้ว)`,
      added,
      skipped,
    };
  } catch (error) {
    return {
      success: false,
      message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
