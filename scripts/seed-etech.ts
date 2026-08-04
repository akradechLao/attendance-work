import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const url = process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const companyId = 3; // ETECH

  // Create MD first
  const md = await prisma.employee.create({
    data: {
      name: "เอนก แก้วกระจ่าง",
      employeeCode: "H0004",
      companyId,
      groupType: "B",
      position: "md",
      division: "กรรมการบริหาร",
      department: null,
      reportsTo: null,
      pin: "1234",
      wfhQuota: 1,
    },
  });
  console.log(`Created MD: ${md.name} (id=${md.id})`);

  // Create Manager (reports to MD)
  const manager = await prisma.employee.create({
    data: {
      name: "นิตติยา กุดแก้ว",
      employeeCode: "0003",
      companyId,
      groupType: "B",
      position: "division_manager",
      division: "ศึกษาสิ่งแวดล้อม",
      department: null,
      reportsTo: md.id,
      pin: "1234",
      wfhQuota: 1,
    },
  });
  console.log(`Created Manager: ${manager.name} (id=${manager.id})`);

  // Create staff (reports to Manager)
  const staff = [
    { name: "ธิติรัตน์ อุดมพันธ์", code: "0006" },
    { name: "ทัชชา ปะละ", code: "0016" },
    { name: "ณิชาภา รุจิรัตโยธิน", code: "021" },
    { name: "วารุณี บัวงาม", code: "029" },
  ];

  for (const s of staff) {
    const emp = await prisma.employee.create({
      data: {
        name: s.name,
        employeeCode: s.code,
        companyId,
        groupType: "B",
        position: "employee",
        division: "ศึกษาสิ่งแวดล้อม",
        department: null,
        reportsTo: manager.id,
        pin: "1234",
        wfhQuota: 1,
      },
    });
    console.log(`Created Staff: ${emp.name} (id=${emp.id})`);
  }

  // Summary
  const count = await prisma.employee.count({ where: { companyId } });
  console.log(`\nETECH total: ${count} employees`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
