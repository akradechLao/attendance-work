import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginType, username, password, companyId, employeeCode, pin } = body;

    if (loginType === "admin") {
      if (!username || !password) {
        return NextResponse.json(
          { success: false, message: "กรุณากรอก username และ password" },
          { status: 400 }
        );
      }

      const user = await prisma.adminUser.findFirst({
        where: { username, password },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Username หรือ Password ไม่ถูกต้อง" },
          { status: 401 }
        );
      }

      await createSession({
        userId: user.id,
        role: "admin",
        companyId: user.companyId || undefined,
      });

      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      try { sendTelegramMessage(`🔐 <b>Admin Login</b> - ${time}`); } catch {}

      return NextResponse.json({
        success: true,
        message: "Login สำเร็จ",
        redirect: "/",
      });
    }

    if (loginType === "employee") {
      if (!companyId || !employeeCode) {
        return NextResponse.json(
          { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" },
          { status: 400 }
        );
      }

      const whereClause: any = {
        companyId: Number(companyId),
        employeeCode,
      };

      if (pin) {
        whereClause.pin = pin;
      }

      const employee = await prisma.employee.findFirst({
        where: whereClause,
      });

      if (!employee) {
        return NextResponse.json(
          { success: false, message: "รหัสพนักงานไม่ถูกต้อง" },
          { status: 401 }
        );
      }

      await createSession({
        userId: employee.id,
        role: "employee",
        companyId: employee.companyId,
      });

      return NextResponse.json({
        success: true,
        message: "Login สำเร็จ",
        redirect: "/employee",
      });
    }

    return NextResponse.json(
      { success: false, message: "ข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
