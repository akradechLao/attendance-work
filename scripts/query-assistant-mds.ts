import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const assistantMds = await prisma.employee.findMany({
    where: { companyId: 2, position: "assistant_md" },
    select: { id: true, name: true, employeeCode: true, level: true, division: true, department: true, reportsTo: true },
    orderBy: { id: "asc" },
  });

  console.log("=== ETC1992 Assistant MDs ===");
  for (const e of assistantMds) {
    console.log(`id=${e.id} | code=${e.employeeCode} | name=${e.name} | level=${e.level} | div=${e.division || "-"} | dept=${e.department || "-"} | reportsTo=${e.reportsTo ?? "null"}`);
  }
  console.log(`Total: ${assistantMds.length}`);

  const md = await prisma.employee.findMany({
    where: { companyId: 2, position: "md" },
    select: { id: true, name: true, employeeCode: true, level: true },
  });
  console.log("\n=== MD ===");
  for (const e of md) {
    console.log(`id=${e.id} | code=${e.employeeCode} | name=${e.name}`);
  }

  const allPositions = await prisma.employee.groupBy({
    by: ["position"],
    where: { companyId: 2 },
    _count: { id: true },
  });
  console.log("\n=== Position Summary ===");
  for (const p of allPositions) {
    console.log(`${p.position}: ${p._count.id}`);
  }

  await prisma.$disconnect();
}

main();
