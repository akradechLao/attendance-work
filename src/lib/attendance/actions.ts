"use server";

import { prisma } from "@/lib/prisma";
import { getStatus, checkLocation, parseLatLong } from "@/lib/business-rules";
import { revalidatePath } from "next/cache";
import { sendTelegramPhoto, sendTelegramMessage } from "@/lib/telegram";
import { getSession } from "@/lib/session";
import { getThaiTime } from "@/lib/helpers";

async function getActiveOfficeLocation(companyId?: number) {
  return prisma.officeLocation.findFirst({
    where: { isActive: true, ...(companyId ? { companyId } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

function formatDistanceInfo(distanceMeters: number, officeName: string): string {
  return `📍 อยู่ห่างจาก "${officeName}" ${distanceMeters} เมตร`;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  distanceInfo?: string;
  data?: {
    id: number;
    checkIn: string;
    status: string;
    latLong: string;
    checkInPhoto: string | null;
  };
}

export interface CheckOutResult {
  success: boolean;
  message: string;
  distanceInfo?: string;
  data?: {
    id: number;
    checkOut: string;
    latLong: string;
    checkOutPhoto: string | null;
  };
}

export async function checkIn(empId: number, latLong: string, photoUrl?: string): Promise<CheckInResult> {
  try {
    const now = getThaiTime();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [employee, wfhRecord, existing] = await Promise.all([
      prisma.employee.findUnique({ where: { id: empId } }),
      prisma.wfhRecord.findUnique({ where: { empId_date: { empId, date: today } } }),
      prisma.attendanceLog.findUnique({ where: { empId_date: { empId, date: today } } }),
    ]);

    if (!employee) {
      return { success: false, message: "ไม่พบพนักงาน" };
    }

    const companyId = employee.companyId;

    const isWfh = wfhRecord !== null && wfhRecord.status !== "rejected";
    let distanceInfo: string | undefined;

    if (!isWfh) {
      const officeLocation = await getActiveOfficeLocation(companyId);
      if (officeLocation && latLong && latLong !== "GPS not available") {
        const userLocation = parseLatLong(latLong);
        if (userLocation) {
          const locationCheck = checkLocation(
            userLocation.lat,
            userLocation.lon,
            officeLocation.latitude,
            officeLocation.longitude,
            officeLocation.radiusMeters
          );
          distanceInfo = formatDistanceInfo(locationCheck.distanceMeters, officeLocation.name);

          if (!locationCheck.withinRadius) {
            return {
              success: false,
              message: `เช็คอินไม่สำเร็จ - ${locationCheck.message}`,
              distanceInfo,
            };
          }
        }
      }
    }

    const checkInTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const status = getStatus(checkInTime, employee.groupType);

    let record;
    if (existing) {
      record = await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: { checkIn: checkInTime, status, latLong, checkInPhoto: photoUrl || null },
      });
    } else {
      record = await prisma.attendanceLog.create({
        data: { empId, checkIn: checkInTime, status, latLong, date: today, checkInPhoto: photoUrl || null },
      });
    }

    revalidatePath("/");
    revalidatePath("/employee");

    const statusText = status === "late" ? "สาย" : "ตรงเวลา";
    const telegramCaption = [
      `✅ <b>เช็คอินสำเร็จ</b>`,
      `👤 <b>ชื่อ:</b> ${employee.name}`,
      `⏱ <b>เวลา:</b> ${checkInTime}`,
      `📍 <b>GPS:</b> ${latLong}`,
      `📊 <b>สถานะ:</b> ${statusText}`,
      ...(distanceInfo ? [`📏 <b>ระยะทาง:</b> ${distanceInfo}`] : []),
    ].join("\n");

    if (photoUrl) {
      sendTelegramPhoto(photoUrl, telegramCaption);
    } else {
      sendTelegramMessage(telegramCaption);
    }

    return {
      success: true,
      message: `เช็คอินสำเร็จ เวลา ${checkInTime} (${status === "late" ? "สาย" : "ตรงเวลา"})`,
      distanceInfo,
      data: {
        id: record.id,
        checkIn: checkInTime,
        status,
        latLong,
        checkInPhoto: record.checkInPhoto,
      },
    };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function checkOut(empId: number, latLong: string, photoUrl?: string): Promise<CheckOutResult> {
  try {
    const now = getThaiTime();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const checkOutTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const [existing, wfhRecord] = await Promise.all([
      prisma.attendanceLog.findUnique({
        where: { empId_date: { empId, date: today } },
        include: { employee: true },
      }),
      prisma.wfhRecord.findUnique({
        where: { empId_date: { empId, date: today } },
      }),
    ]);

    if (!existing) {
      return { success: false, message: "ยังไม่ได้เช็คอินวันนี้" };
    }

    const companyId = existing.employee.companyId;

    const isWfh = wfhRecord !== null && wfhRecord.status !== "rejected";
    let distanceInfo: string | undefined;

    if (!isWfh) {
      const officeLocation = await getActiveOfficeLocation(companyId);
      if (officeLocation && latLong && latLong !== "GPS not available") {
        const userLocation = parseLatLong(latLong);
        if (userLocation) {
          const locationCheck = checkLocation(
            userLocation.lat,
            userLocation.lon,
            officeLocation.latitude,
            officeLocation.longitude,
            officeLocation.radiusMeters
          );
          distanceInfo = formatDistanceInfo(locationCheck.distanceMeters, officeLocation.name);

          if (!locationCheck.withinRadius) {
            return {
              success: false,
              message: `เช็คเอาท์ไม่สำเร็จ - ${locationCheck.message}`,
              distanceInfo,
            };
          }
        }
      }
    }

    const record = await prisma.attendanceLog.update({
      where: { id: existing.id },
      data: { checkOut: checkOutTime, latLong, checkOutPhoto: photoUrl || null },
    });

    revalidatePath("/");
    revalidatePath("/employee");

    const telegramCaption = [
      `🚪 <b>เช็คเอาท์สำเร็จ</b>`,
      `👤 <b>ชื่อ:</b> ${existing.employee.name}`,
      `⏱ <b>เวลา:</b> ${checkOutTime}`,
      `📍 <b>GPS:</b> ${latLong}`,
      ...(distanceInfo ? [`📏 <b>ระยะทาง:</b> ${distanceInfo}`] : []),
    ].join("\n");

    if (photoUrl) {
      sendTelegramPhoto(photoUrl, telegramCaption);
    } else {
      sendTelegramMessage(telegramCaption);
    }

    return {
      success: true,
      message: `เช็คเอาท์สำเร็จ เวลา ${checkOutTime}`,
      distanceInfo,
      data: {
        id: record.id,
        checkOut: checkOutTime,
        latLong,
        checkOutPhoto: record.checkOutPhoto,
      },
    };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}
