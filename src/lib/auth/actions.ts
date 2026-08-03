"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function getCompanyId(): Promise<number | undefined> {
  const session = await getSession();
  if (session?.role === "admin") return undefined;
  return session?.companyId;
}

export async function getAdminUser() {
  const session = await getSession();
  const companyId = session?.companyId;
  const user = await prisma.adminUser.findFirst({
    where: { ...(companyId ? { companyId } : {}) },
    select: { id: true, username: true },
  });
  return user;
}

export async function updateAdminCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getSession();
    const companyId = session?.companyId;
    const user = await prisma.adminUser.findFirst({
      where: { ...(companyId ? { companyId } : {}) },
    });
    if (!user) {
      return { success: false, message: "ไม่พบข้อมูลผู้ดูแลระบบ" };
    }

    if (user.password !== currentPassword) {
      return { success: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" };
    }

    if (!newUsername || !newPassword) {
      return { success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านใหม่" };
    }

    if (newUsername.length < 3) {
      return { success: false, message: "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร" };
    }

    if (newPassword.length < 4) {
      return { success: false, message: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" };
    }

    if (newUsername !== user.username) {
      const existing = await prisma.adminUser.findFirst({
        where: { username: newUsername },
      });
      if (existing) {
        return { success: false, message: "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว" };
      }
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { username: newUsername, password: newPassword },
    });
    return { success: true, message: "แก้ไขข้อมูลเข้าสู่ระบบสำเร็จ กรุณาเข้าสู่ระบบใหม่" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}
