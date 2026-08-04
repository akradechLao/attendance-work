import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const url = process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const updates = [
    { employeeCode: "H0004", level: 1, hasOt: false },
    { employeeCode: "0003", level: 3, hasOt: false },
    { employeeCode: "0006", level: 6, hasOt: true },
    { employeeCode: "0016", level: 6, hasOt: true },
    { employeeCode: "021", level: 6, hasOt: true },
    { employeeCode: "029", level: 6, hasOt: true },
  ];

  for (const u of updates) {
    await prisma.employee.updateMany({
      where: { employeeCode: u.employeeCode, companyId: 3 },
      data: { level: u.level, hasOt: u.hasOt },
    });
    console.log(`Updated ${u.employeeCode}: level=${u.level}, hasOt=${u.hasOt}`);
  }

  // Verify
  const etech = await prisma.employee.findMany({
    where: { companyId: 3 },
    select: { id: true, name: true, employeeCode: true, level: true, hasOt: true, position: true, reportsTo: true },
    orderBy: { id: "asc" },
  });
  console.log("\n=== ETECH updated ===");
  console.table(etech);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
