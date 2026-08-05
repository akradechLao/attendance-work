import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // 1. Update วิชัย กุลสมภพ (id=1392) from md to chairman
  await prisma.employee.update({
    where: { id: 1392 },
    data: { position: "chairman", level: 0, reportsTo: null },
  });
  console.log("Updated id=1392 (วิชัย) to chairman, level=0, reportsTo=null");

  // 2. Update MDs to report to chairman (id=1392)
  await prisma.employee.update({
    where: { id: 1389 },
    data: { reportsTo: 1392 },
  });
  console.log("Updated id=1389 (พิสิฐษ์) reportsTo=1392 (chairman)");

  await prisma.employee.update({
    where: { id: 1646 },
    data: { reportsTo: 1392 },
  });
  console.log("Updated id=1646 (ภิญโญ) reportsTo=1392 (chairman)");

  // 3. Verify - check all positions
  const chairman = await prisma.employee.findUnique({
    where: { id: 1392 },
    select: { id: true, name: true, position: true, level: true, reportsTo: true },
  });
  console.log("\n=== Chairman ===");
  console.log(chairman);

  const mds = await prisma.employee.findMany({
    where: { companyId: 2, position: "md" },
    select: { id: true, name: true, position: true, level: true, reportsTo: true },
  });
  console.log("\n=== MDs ===");
  for (const md of mds) {
    console.log(md);
  }

  const assistantMds = await prisma.employee.findMany({
    where: { companyId: 2, position: "assistant_md" },
    select: { id: true, name: true, position: true, level: true, reportsTo: true },
  });
  console.log("\n=== Assistant MDs ===");
  for (const amd of assistantMds) {
    console.log(amd);
  }

  // 4. Summary
  const positions = await prisma.employee.groupBy({
    by: ["position"],
    where: { companyId: 2 },
    _count: { id: true },
  });
  console.log("\n=== Position Summary ===");
  for (const p of positions) {
    console.log(`${p.position}: ${p._count.id}`);
  }

  await prisma.$disconnect();
}

main();
