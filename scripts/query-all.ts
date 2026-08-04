import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const url = process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const companies = await prisma.company.findMany({ orderBy: { id: "asc" } });
  console.log("=== Companies ===");
  console.table(companies.map(c => ({ id: c.id, name: c.name })));

  for (const c of companies) {
    const count = await prisma.employee.count({ where: { companyId: c.id } });
    console.log(`Company ${c.name} (id=${c.id}): ${count} employees`);
  }

  // Check ETECH specifically
  const etech = await prisma.employee.findMany({
    where: { companyId: 3 },
    select: { id: true, name: true, employeeCode: true, department: true, division: true, position: true, reportsTo: true },
    orderBy: { id: "asc" },
  });
  console.log("\n=== ETECH employees (companyId=3) ===");
  if (etech.length === 0) {
    console.log("No employees found for companyId=3");
    // Try all companies
    const all = await prisma.employee.findMany({
      select: { id: true, name: true, companyId: true, employeeCode: true, department: true, division: true, position: true, reportsTo: true },
      orderBy: { companyId: "asc" },
    });
    console.log(`\nTotal employees: ${all.length}`);
    console.table(all.map(e => ({
      id: e.id, name: e.name, companyId: e.companyId, code: e.employeeCode,
      dept: e.department, div: e.division, pos: e.position, reportsTo: e.reportsTo,
    })));
  } else {
    console.table(etech);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
