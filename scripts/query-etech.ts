import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const url = process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const etech = await prisma.employee.findMany({
    where: { companyId: 3 },
    select: { id: true, name: true, employeeCode: true, department: true, division: true, position: true, reportsTo: true },
    orderBy: { id: "asc" },
  });
  console.log("=== ETECH employees ===");
  console.table(etech);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
