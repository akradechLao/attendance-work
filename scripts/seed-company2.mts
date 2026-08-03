import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface CsvRow {
  employee_code: string;
  employee_title_lv: string;
  employee_name: string;
  employee_last_name: string;
  fing_code: string;
  employee_gender: string;
  Level: string;
  "มี OT": string;
  employee_type_code: string;
  department_name: string;
  division_name: string;
  position_name: string;
}

const COMPANY_ID = 2;

function parseGroupType(row: CsvRow): "A" | "B" {
  if (row["มี OT"] === "มี") return "B";
  return "A";
}

function getTitle(titleLv: string): string {
  const titles: Record<string, string> = {
    "1": "นาย",
    "2": "นางสาว",
    "3": "นาง",
  };
  return titles[titleLv] || "";
}

async function main() {
  console.log(`Seeding Company ${COMPANY_ID} employees...`);

  const csvFiles = process.argv.slice(2);
  if (csvFiles.length === 0) {
    console.error("Usage: npx tsx scripts/seed-company2.mts <csv-file1> <csv-file2> ...");
    process.exit(1);
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const csvFile of csvFiles) {
    console.log(`\nProcessing: ${csvFile}`);
    
    const csvContent = readFileSync(csvFile, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      from_line: 2,
      relax_column_count: true,
    }).filter((row: any) => /^\d+$|^[Hh]\d+$/.test(row.employee_code?.trim() || "")) as CsvRow[];

    console.log(`Found ${records.length} employees in CSV`);

    let created = 0;
    let skipped = 0;

    for (const row of records) {
      const employeeCode = row.employee_code || `ETC${String(created + 1).padStart(4, "0")}`;
      const title = getTitle(row.employee_title_lv);
      const name = `${title}${row.employee_name} ${row.employee_last_name}`.trim();
      const groupType = parseGroupType(row);

      const existing = await prisma.employee.findFirst({
        where: { companyId: COMPANY_ID, employeeCode },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.employee.create({
        data: {
          companyId: COMPANY_ID,
          name,
          groupType,
          wfhQuota: 1,
          pin: "1234",
          employeeCode,
        },
      });
      created++;
    }

    console.log(`Created: ${created}, Skipped: ${skipped}`);
    totalCreated += created;
    totalSkipped += skipped;
  }

  console.log(`\n=== DONE! ===`);
  console.log(`Total Created: ${totalCreated}`);
  console.log(`Total Skipped: ${totalSkipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
