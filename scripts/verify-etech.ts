import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const r = await p.employee.findMany({ where: { companyId: 3 }, select: { id: true, name: true, employeeCode: true, position: true, division: true, reportsTo: true }, orderBy: { id: "asc" } });
  console.table(r);
  await p.$disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
