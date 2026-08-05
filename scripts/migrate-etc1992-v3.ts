import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Change ชัญญา (id=1431) and กิตติพล (id=1613) to report to พิสิฐษ์ (id=1389)
  await prisma.employee.update({
    where: { id: 1431 },
    data: { reportsTo: 1389 },
  });
  console.log("Updated id=1431 (ชัญญา) → reportsTo=1389 (พิสิฐษ์)");

  await prisma.employee.update({
    where: { id: 1613 },
    data: { reportsTo: 1389 },
  });
  console.log("Updated id=1613 (กิตติพล) → reportsTo=1389 (พิสิฐษ์)");

  // Verify Assistant MDs
  const assistantMds = await prisma.employee.findMany({
    where: { companyId: 2, position: "assistant_md" },
    select: { id: true, name: true, division: true, reportsTo: true },
  });
  console.log("\n=== Assistant MDs → reportsTo ===");
  for (const e of assistantMds) {
    console.log(`  ${e.name} (${e.division}) → reportsTo=${e.reportsTo}`);
  }

  await prisma.$disconnect();
}

main();
