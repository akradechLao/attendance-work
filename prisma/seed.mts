import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const companies = [
  { name: "NTC" },
  { name: "ETC1992" },
  { name: "ETECH" },
  { name: "STC" },
];

const company1Employees = [
  { name: "ปิยะพงษ์ คงสิบ", groupType: "A" as const, wfhQuota: 1, preferredOffDay: null, employeeCode: "NTC001" },
  { name: "กฤษกร วุฒิ", groupType: "A" as const, wfhQuota: 1, preferredOffDay: "Saturday", employeeCode: "NTC002" },
  { name: "จิรายุ เริงหาญ", groupType: "B" as const, wfhQuota: 1, preferredOffDay: null, employeeCode: "NTC003" },
  { name: "พีรภาส ไพรบึง", groupType: "B" as const, wfhQuota: 1, preferredOffDay: "Sunday", employeeCode: "NTC004" },
  { name: "อัญชลี ทะพงษ์", groupType: "A" as const, wfhQuota: 1, preferredOffDay: null, employeeCode: "NTC005" },
  { name: "อัครเดช เหลาจินดาวัฒน์", groupType: "A" as const, wfhQuota: 1, preferredOffDay: null, employeeCode: "NTC006" },
];

const leaveTypes = [
  { name: "ลากิจได้รับค่าจ้าง", advanceDays: 1, quotaMonthly: 6, quotaDaily: 3, quotaContract: 3 },
  { name: "ลากิจไม่ได้รับค่าจ้าง", advanceDays: 1, quotaMonthly: 20, quotaDaily: 20, quotaContract: 20 },
  { name: "ลาป่วยได้รับค่าจ้าง", advanceDays: 0, quotaMonthly: 30, quotaDaily: 30, quotaContract: 30 },
  { name: "ลาป่วยไม่ได้รับค่าจ้าง", advanceDays: 0, quotaMonthly: 120, quotaDaily: 120, quotaContract: 120 },
  { name: "ลาพักร้อน", advanceDays: 3, quotaMonthly: 6, quotaDaily: 6, quotaContract: 2 },
  { name: "ลาพักร้อนสะสม", advanceDays: 3, quotaMonthly: 3, quotaDaily: 3, quotaContract: 0 },
  { name: "ลาคลอดบุตรได้รับค่าจ้าง", advanceDays: 0, quotaMonthly: 60, quotaDaily: 60, quotaContract: 0 },
  { name: "ลาคลอดบุตรไม่ได้รับค่าจ้าง", advanceDays: 0, quotaMonthly: 60, quotaDaily: 60, quotaContract: 0 },
  { name: "ลาเพื่อช่วยเหลือคู่สมรส", advanceDays: 3, quotaMonthly: 15, quotaDaily: 15, quotaContract: 0 },
  { name: "ลากรณีบุตรป่วยเสี่ยงมีภาวะผิดปกติ", advanceDays: 3, quotaMonthly: 15, quotaDaily: 15, quotaContract: 0 },
  { name: "ลาฝึกอบรม", advanceDays: 3, quotaMonthly: 30, quotaDaily: 30, quotaContract: 0 },
  { name: "ลาเพื่อทำหมัน", advanceDays: 3, quotaMonthly: 14, quotaDaily: 14, quotaContract: 0 },
  { name: "ลาพิเศษกรณีบิดามารดาบุตรคู่สมรสถึงแก่กรรม", advanceDays: 0, quotaMonthly: 7, quotaDaily: 7, quotaContract: 5 },
  { name: "ลาบวชได้รับค่าจ้าง", advanceDays: 3, quotaMonthly: 30, quotaDaily: 30, quotaContract: 0 },
  { name: "ลาบวชไม่รับค่าจ้าง", advanceDays: 3, quotaMonthly: 90, quotaDaily: 90, quotaContract: 0 },
  { name: "ลาเพื่อรับราชการทหาร", advanceDays: 3, quotaMonthly: 60, quotaDaily: 60, quotaContract: 0 },
];

const companySettings = [
  { key: "payroll_cycle", value: "19-18" },
  { key: "payroll_payment", value: "end_of_month" },
  { key: "ot_rate_x1", value: "รายเดือน วันหยุด" },
  { key: "ot_rate_x15", value: "วันทำงานปกติ" },
  { key: "ot_rate_x2", value: "รายวัน วันหยุด" },
  { key: "ot_rate_x3", value: "รายเดือน รายวัน" },
  { key: "late_deduction", value: "-" },
];

async function main() {
  console.log("Seeding multi-tenant database...");

  // Create companies
  for (let i = 0; i < companies.length; i++) {
    await prisma.company.upsert({
      where: { id: i + 1 },
      update: { name: companies[i].name },
      create: companies[i],
    });
  }
  console.log("Companies seeded");

  // Create super admin (no companyId)
  const existingAdmin = await prisma.adminUser.findFirst({ where: { username: "admin" } });
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: { username: "admin", password: "1234" },
    });
    console.log("Admin user created (username: admin, password: 1234)");
  }

  // Create Company 1 employees
  for (const emp of company1Employees) {
    const existing = await prisma.employee.findFirst({
      where: { companyId: 1, employeeCode: emp.employeeCode },
    });
    if (!existing) {
      await prisma.employee.create({
        data: {
          companyId: 1,
          name: emp.name,
          groupType: emp.groupType,
          wfhQuota: emp.wfhQuota,
          preferredOffDay: emp.preferredOffDay,
          pin: "1234",
          employeeCode: emp.employeeCode,
        },
      });
    }
  }
  console.log("Company 1 employees seeded");

  // Create office location for Company 1
  const existingLocation = await prisma.officeLocation.findFirst({ where: { companyId: 1 } });
  if (!existingLocation) {
    await prisma.officeLocation.create({
      data: {
        companyId: 1,
        name: "สำนักงานใหญ่",
        latitude: 13.123456,
        longitude: 100.123456,
        radiusMeters: 200,
      },
    });
    console.log("Company 1 office location created");
  }

  // Create leave types for all companies
  for (let compId = 1; compId <= 4; compId++) {
    for (const lt of leaveTypes) {
      const existing = await prisma.leaveType.findFirst({
        where: { companyId: compId, name: lt.name },
      });
      if (!existing) {
        await prisma.leaveType.create({
          data: {
            companyId: compId,
            name: lt.name,
            advanceDays: lt.advanceDays,
            quotaMonthly: lt.quotaMonthly,
            quotaDaily: lt.quotaDaily,
            quotaContract: lt.quotaContract,
          },
        });
      }
    }
  }
  console.log("Leave types seeded for all companies");

  // Create company settings for Company 2
  for (const setting of companySettings) {
    const existing = await prisma.companySetting.findFirst({
      where: { companyId: 2, key: setting.key },
    });
    if (!existing) {
      await prisma.companySetting.create({
        data: {
          companyId: 2,
          key: setting.key,
          value: setting.value,
        },
      });
    }
  }
  console.log("Company 2 settings seeded");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
