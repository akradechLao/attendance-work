"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ONBOARDING_STEPS } from "@/lib/onboarding-constants";
import { getCompanyId } from "@/lib/auth/actions";

export async function getOnboardingRecords() {
  const companyId = await getCompanyId();
  return prisma.onboardingRecord.findMany({
    where: companyId ? { employee: { companyId } } : undefined,
    include: {
      employee: true,
      steps: { orderBy: { stepOrder: "asc" } },
      documents: true,
      equipment: true,
      training: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOnboardingRecord(empId: number) {
  const companyId = await getCompanyId();
  if (companyId) {
    const employee = await prisma.employee.findUnique({ where: { id: empId } });
    if (!employee || employee.companyId !== companyId) return null;
  }

  return prisma.onboardingRecord.findUnique({
    where: { empId },
    include: {
      employee: true,
      steps: { orderBy: { stepOrder: "asc" } },
      documents: true,
      equipment: true,
      training: true,
    },
  });
}

export async function createOnboarding(empId: number, startDate: string) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const employee = await prisma.employee.findUnique({ where: { id: empId } });
      if (!employee || employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบพนักงาน" };
      }
    }

    const existing = await prisma.onboardingRecord.findUnique({ where: { empId } });
    if (existing) {
      return { success: false, message: "พนักงานคนนี้มีข้อมูล Onboarding แล้ว" };
    }

    const record = await prisma.onboardingRecord.create({
      data: {
        empId,
        startDate,
        steps: {
          create: ONBOARDING_STEPS.map((step, idx) => ({
            stepOrder: idx + 1,
            stepKey: step.key,
            stepLabel: step.label,
            isCompleted: false,
          })),
        },
      },
      include: { steps: true },
    });

    revalidatePath("/onboarding");
    return { success: true, message: "สร้างข้อมูล Onboarding สำเร็จ", data: record };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function completeOnboardingStep(empId: number, stepKey: string, completedBy?: string) {
  try {
    const companyId = await getCompanyId();
    const record = await prisma.onboardingRecord.findUnique({
      where: { empId },
      include: { employee: true },
    });
    if (!record) return { success: false, message: "ไม่พบข้อมูล Onboarding" };
    if (companyId && record.employee.companyId !== companyId) return { success: false, message: "ไม่พบข้อมูล Onboarding" };

    const step = await prisma.onboardingStep.findFirst({
      where: { onboardingId: record.id, stepKey },
    });
    if (!step) return { success: false, message: "ไม่พบขั้นตอนที่ระบุ" };

    await prisma.onboardingStep.update({
      where: { id: step.id },
      data: { isCompleted: true, completedAt: new Date(), completedBy },
    });

    const allSteps = await prisma.onboardingStep.findMany({ where: { onboardingId: record.id } });
    if (allSteps.every((s) => s.isCompleted)) {
      await prisma.onboardingRecord.update({
        where: { id: record.id },
        data: { status: "completed", endDate: new Date().toISOString().split("T")[0] },
      });
    }

    revalidatePath("/onboarding");
    revalidatePath(`/onboarding/${empId}`);
    return { success: true, message: "บันทึกสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function updateOnboardingStatus(empId: number, status: "in_progress" | "completed" | "on_hold") {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const employee = await prisma.employee.findUnique({ where: { id: empId } });
      if (!employee || employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบพนักงาน" };
      }
    }

    await prisma.onboardingRecord.update({
      where: { empId },
      data: { status },
    });
    revalidatePath("/onboarding");
    return { success: true, message: "อัปเดตสถานะสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function addOnboardingDocument(
  empId: number,
  docType: string,
  docLabel: string,
  fileUrl?: string,
  fileName?: string
) {
  try {
    const companyId = await getCompanyId();
    const record = await prisma.onboardingRecord.findUnique({
      where: { empId },
      include: { employee: true },
    });
    if (!record) return { success: false, message: "ไม่พบข้อมูล Onboarding" };
    if (companyId && record.employee.companyId !== companyId) return { success: false, message: "ไม่พบข้อมูล Onboarding" };

    await prisma.onboardingDocument.create({
      data: {
        onboardingId: record.id,
        docType,
        docLabel,
        fileUrl,
        fileName,
        status: fileUrl ? "submitted" : "pending",
      },
    });

    revalidatePath(`/onboarding/${empId}`);
    return { success: true, message: "เพิ่มเอกสารสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function verifyOnboardingDocument(docId: number, status: "verified" | "rejected", verifiedBy?: string) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const doc = await prisma.onboardingDocument.findUnique({
        where: { id: docId },
        include: { onboarding: { include: { employee: true } } },
      });
      if (!doc || doc.onboarding.employee.companyId !== companyId) return { success: false, message: "ไม่พบข้อมูล" };
    }

    await prisma.onboardingDocument.update({
      where: { id: docId },
      data: { status, verifiedAt: new Date(), verifiedBy },
    });
    return { success: true, message: "ตรวจสอบเอกสารสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function addOnboardingEquipment(
  empId: number,
  equipType: string,
  equipName: string,
  serialNumber?: string,
  notes?: string
) {
  try {
    const companyId = await getCompanyId();
    const record = await prisma.onboardingRecord.findUnique({
      where: { empId },
      include: { employee: true },
    });
    if (!record) return { success: false, message: "ไม่พบข้อมูล Onboarding" };
    if (companyId && record.employee.companyId !== companyId) return { success: false, message: "ไม่พบข้อมูล Onboarding" };

    await prisma.onboardingEquipment.create({
      data: {
        onboardingId: record.id,
        equipType,
        equipName,
        serialNumber,
        notes,
        assignedAt: new Date(),
      },
    });

    revalidatePath(`/onboarding/${empId}`);
    return { success: true, message: "เพิ่มอุปกรณ์สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function returnOnboardingEquipment(equipId: number) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const equip = await prisma.onboardingEquipment.findUnique({
        where: { id: equipId },
        include: { onboarding: { include: { employee: true } } },
      });
      if (!equip || equip.onboarding.employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบข้อมูล" };
      }
    }

    await prisma.onboardingEquipment.update({
      where: { id: equipId },
      data: { returnedAt: new Date() },
    });
    return { success: true, message: "คืนอุปกรณ์สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function addOnboardingTraining(
  empId: number,
  trainingName: string,
  trainer?: string,
  scheduledDate?: string
) {
  try {
    const companyId = await getCompanyId();
    const record = await prisma.onboardingRecord.findUnique({
      where: { empId },
      include: { employee: true },
    });
    if (!record) return { success: false, message: "ไม่พบข้อมูล Onboarding" };
    if (companyId && record.employee.companyId !== companyId) return { success: false, message: "ไม่พบข้อมูล Onboarding" };

    await prisma.onboardingTraining.create({
      data: {
        onboardingId: record.id,
        trainingName,
        trainer,
        scheduledDate,
        status: "scheduled",
      },
    });

    revalidatePath(`/onboarding/${empId}`);
    return { success: true, message: "เพิ่มการฝึกอบรมสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function completeOnboardingTraining(trainingId: number) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const training = await prisma.onboardingTraining.findUnique({
        where: { id: trainingId },
        include: { onboarding: { include: { employee: true } } },
      });
      if (!training || training.onboarding.employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบข้อมูล" };
      }
    }

    await prisma.onboardingTraining.update({
      where: { id: trainingId },
      data: { status: "completed", completedDate: new Date().toISOString().split("T")[0] },
    });
    return { success: true, message: "บันทึกสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function deleteOnboarding(empId: number) {
  try {
    const companyId = await getCompanyId();
    if (companyId) {
      const employee = await prisma.employee.findUnique({ where: { id: empId } });
      if (!employee || employee.companyId !== companyId) {
        return { success: false, message: "ไม่พบพนักงาน" };
      }
    }

    await prisma.onboardingRecord.delete({ where: { empId } });
    revalidatePath("/onboarding");
    return { success: true, message: "ลบข้อมูล Onboarding สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function getOnboardingStats() {
  const companyId = await getCompanyId();
  const records = await prisma.onboardingRecord.findMany({
    where: companyId ? { employee: { companyId } } : undefined,
    include: { steps: true },
  });

  return {
    total: records.length,
    inProgress: records.filter((r) => r.status === "in_progress").length,
    completed: records.filter((r) => r.status === "completed").length,
    onHold: records.filter((r) => r.status === "on_hold").length,
  };
}
