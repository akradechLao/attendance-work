import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // 1. Change เอนก (id=1390) and พิมุข (id=1391) to executive_director
  await prisma.employee.update({
    where: { id: 1390 },
    data: { position: "executive_director", level: 1 },
  });
  console.log("Updated id=1390 (เอนก) → executive_director, level=1, reportsTo=1392 (chairman)");

  await prisma.employee.update({
    where: { id: 1391 },
    data: { position: "executive_director", level: 1 },
  });
  console.log("Updated id=1391 (พิมุข) → executive_director, level=1, reportsTo=1392 (chairman)");

  // 2. Executive Directors report to Chairman
  await prisma.employee.update({
    where: { id: 1390 },
    data: { reportsTo: 1392 },
  });
  await prisma.employee.update({
    where: { id: 1391 },
    data: { reportsTo: 1392 },
  });

  // 3. Assistant MDs - split between 2 MDs
  // Report to พิสิฐษ์ (id=1389)
  await prisma.employee.update({
    where: { id: 1401 },
    data: { reportsTo: 1389 },
  });
  console.log("Updated id=1401 (วีณา) → reportsTo=1389 (พิสิฐษ์)");

  await prisma.employee.update({
    where: { id: 1411 },
    data: { reportsTo: 1389 },
  });
  console.log("Updated id=1411 (สันติ) → reportsTo=1389 (พิสิฐษ์)");

  // Report to ภิญโญ (id=1646)
  await prisma.employee.update({
    where: { id: 1431 },
    data: { reportsTo: 1646 },
  });
  console.log("Updated id=1431 (ชัญญา) → reportsTo=1646 (ภิญโญ)");

  await prisma.employee.update({
    where: { id: 1613 },
    data: { reportsTo: 1646 },
  });
  console.log("Updated id=1613 (กิตติพล) → reportsTo=1646 (ภิญโญ)");

  // Verify
  console.log("\n=== Final Hierarchy ===");

  const chairman = await prisma.employee.findUnique({
    where: { id: 1392 },
    select: { id: true, name: true, position: true, level: true },
  });
  console.log(`Chairman: ${chairman?.name} (${chairman?.position}, level=${chairman?.level})`);

  const execDirectors = await prisma.employee.findMany({
    where: { companyId: 2, position: "executive_director" },
    select: { id: true, name: true, position: true, level: true, reportsTo: true },
  });
  console.log("\nExecutive Directors:");
  for (const e of execDirectors) {
    console.log(`  ${e.name} (id=${e.id}, level=${e.level}) → reportsTo=${e.reportsTo}`);
  }

  const mds = await prisma.employee.findMany({
    where: { companyId: 2, position: "md" },
    select: { id: true, name: true, position: true, level: true, reportsTo: true },
  });
  console.log("\nMDs:");
  for (const e of mds) {
    console.log(`  ${e.name} (id=${e.id}, level=${e.level}) → reportsTo=${e.reportsTo}`);
  }

  const assistantMds = await prisma.employee.findMany({
    where: { companyId: 2, position: "assistant_md" },
    select: { id: true, name: true, position: true, level: true, division: true, reportsTo: true },
  });
  console.log("\nAssistant MDs:");
  for (const e of assistantMds) {
    const reportsToName = e.reportsTo === 1389 ? "พิสิฐษ์" : e.reportsTo === 1646 ? "ภิญโญ" : "unknown";
    console.log(`  ${e.name} (${e.division}) → reportsTo=${reportsToName} (id=${e.reportsTo})`);
  }

  // Summary
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
