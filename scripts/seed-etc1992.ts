import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const COMPANY_ID = 2; // ETC1992
const PIN_DEFAULT = "1234";
const WFH_QUOTA_DEFAULT = 1;

interface CsvEmployee {
  no: string;
  employeeCode: string;
  employeeTitle: string;
  firstName: string;
  lastName: string;
  fingCode: string;
  gender: string;
  level: string;
  hasOt: string;
  empTypeCode: string;
  empTypeGroupCode: string;
  nickname: string;
  mobilePhone: string;
  email: string;
  birthDate: string;
  effectiveDate: string;
  departmentName: string;
  divisionName: string;
  positionName: string;
  branch: string;
}

// Thai position name → our system position
function mapPositionTto(name: string): string {
  const n = name.replace(/\s+/g, " ").trim();

  // Chairman (ประธานบริษัท) - top of hierarchy
  if (n.includes("ประธานบริษัท")) return "chairman";

  // Executive Director (กรรมการบริหาร)
  if (n.includes("กรรมการบริหาร")) return "executive_director";

  // MD (กรรมการผู้จัดการ)
  if (n.includes("กรรมการผู้จัดการ")) return "md";

  // Assistant MD (รอง/ผู้ช่วย กรรมการผู้จัดการ)
  if (n.includes("รองกรรมการผู้จัดการ")) return "assistant_md";
  if (n.includes("ผู้ช่วยกรรมการผู้จัดการ")) return "assistant_md";

  // Managers
  if (n.includes("ผู้จัดการฝ่าย") || n.includes("ผู้จัดการแผนก")) return "division_manager";

  // Team Lead
  if (n.includes("หัวหน้าทีม")) return "team_lead";
  if (n.includes("หัวหน้าส่วนงาน")) return "team_lead";

  // Everything else = staff
  return "employee";
}

// Thai position → level number
function mapLevel(name: string, csvLevel: string): number | null {
  const pos = mapPositionTto(name);
  if (pos === "chairman") return 0;  // ประธานบริษัท - highest
  if (pos === "md") return 1;
  if (pos === "executive_director") return 1;
  if (pos === "assistant_md") return 2;
  if (pos === "division_manager") return 3;
  if (pos === "team_lead") return 5;

  // For staff, use CSV level
  const csvLevelNum = parseInt(csvLevel, 10);
  if (!isNaN(csvLevelNum)) return csvLevelNum;
  return null;
}

// Parse "มี OT" → boolean
function parseHasOt(value: string): boolean {
  return value.replace(/\s+/g, "").trim() === "มี";
}

// Parse CSV file with quoted fields support
function parseCsv(filePath: string): CsvEmployee[] {
  const content = fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = content.split("\n");

  // Skip first 3 rows (Template Employee, English headers, Thai column headers)
  const dataLines = lines.slice(3);
  const results: CsvEmployee[] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;

    // Parse CSV with quoted field support
    const cols: string[] = [];
    let field = "";
    let inQuotes = false;

    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(field);
        field = "";
      } else {
        field += ch;
      }
    }
    cols.push(field);

    // Correct column indices based on header analysis
    const emp: CsvEmployee = {
      no: cols[0] || "",
      employeeCode: cols[1] || "",
      employeeTitle: cols[2] || "",
      firstName: cols[3] || "",
      lastName: cols[4] || "",
      fingCode: cols[5] || "",
      gender: cols[6] || "",
      level: cols[7] || "",
      hasOt: cols[8] || "",
      empTypeCode: cols[9] || "",
      empTypeGroupCode: cols[10] || "",
      nickname: cols[11] || "",
      mobilePhone: (cols[12] || "").replace(/\n/g, " ").trim(),
      email: cols[13] || "",
      birthDate: cols[15] || "",
      effectiveDate: cols[17] || "",
      departmentName: cols[18] || "",
      divisionName: cols[19] || "",
      positionName: cols[20] || "",
      branch: cols[21] || "",
    };

    // Skip header/template rows (Thai column header translations)
    if (emp.firstName === "ชื่อจริง" || emp.lastName === "นามสกุล") continue;
    if (!emp.firstName && !emp.lastName) continue;
    results.push(emp);
  }

  return results;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const basePath = path.join(__dirname, "data");
  const srCsv = parseCsv(path.join(basePath, "ETC-SR.csv"));
  const kbLpCsv = parseCsv(path.join(basePath, "ETC-KB-LP.csv"));

  // Combine all and add source info
  const allEmployees = [...srCsv, ...kbLpCsv];
  console.log(`Parsed ETC-SR: ${srCsv.length} employees`);
  console.log(`Parsed ETC-KB-LP: ${kbLpCsv.length} employees`);
  console.log(`Total: ${allEmployees.length} employees`);

  // Delete existing ETC1992 employees first (for re-runnability)
  // Must delete dependent records first due to foreign key constraints
  const existingEmpIds = (await prisma.employee.findMany({
    where: { companyId: COMPANY_ID },
    select: { id: true },
  })).map(e => e.id);

  if (existingEmpIds.length > 0) {
    console.log(`Deleting ${existingEmpIds.length} existing ETC1992 employees and dependent records...`);
    await prisma.otRequest.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.leaveRequest.deleteMany({ where: { companyId: COMPANY_ID } });
    await prisma.wfhRecord.deleteMany({ where: { empId: { in: existingEmpIds } } });
    await prisma.attendanceLog.deleteMany({ where: { empId: { in: existingEmpIds } } });
    await prisma.shiftSchedule.deleteMany({ where: { empId: { in: existingEmpIds } } });
    await prisma.onboardingRecord.deleteMany({ where: { empId: { in: existingEmpIds } } });
    await prisma.employee.deleteMany({ where: { companyId: COMPANY_ID } });
  }

  // Phase 1: Create all employees without reportsTo
  const empMap = new Map<string, { id: number; position: string; level: number | null; division: string | null }>();

  for (const emp of allEmployees) {
    const fullName = `${emp.firstName} ${emp.lastName}`;
    const position = mapPositionTto(emp.positionName);
    const level = mapLevel(emp.positionName, emp.level);
    const hasOt = parseHasOt(emp.hasOt);

    const department = emp.departmentName ? emp.departmentName.trim() : null;
    const division = emp.divisionName ? emp.divisionName.trim() : null;

    // group_type: เหมาจ่าย (daily wage) = A, เดือน (monthly) = B
    const groupType = emp.empTypeGroupCode.includes("ET00010") ? "A" : "B";

    const created = await prisma.employee.create({
      data: {
        companyId: COMPANY_ID,
        name: fullName,
        employeeCode: emp.employeeCode,
        groupType: groupType as "A" | "B",
        position: position,
        level: level,
        hasOt: hasOt,
        department: department,
        division: division,
        reportsTo: null,
        pin: PIN_DEFAULT,
        wfhQuota: WFH_QUOTA_DEFAULT,
        supervisorName: null,
        supervisorLine: null,
        supervisorPhone: null,
      },
    });

    empMap.set(emp.employeeCode, {
      id: created.id,
      position: position,
      level: level,
      division: division,
    });
  }

  console.log(`Created ${empMap.size} ETC1992 employees`);

  // Phase 2: Assign reportsTo based on hierarchy
  // Strategy:
  //   - Chairman (level 0) reports to null (top)
  //   - MD (level 1) reports to Chairman
  //   - Assistant MD (level 2) reports to MD
  //   - Managers (level 3) report to MD (or another manager in same division if exists)
  //   - Staff (level >=5) report to manager in same division

  // Find Chairman (ประธานบริษัท) - top of hierarchy
  let chairmanId: number | null = null;
  for (const emp of allEmployees) {
    const mapEntry = empMap.get(emp.employeeCode);
    if (mapEntry && mapEntry.position === "chairman" && chairmanId === null) {
      chairmanId = mapEntry.id;
      console.log(`Chairman found: ${emp.firstName} ${emp.lastName} (code=${emp.employeeCode}, id=${chairmanId})`);
      break;
    }
  }

  // Find MDs (กรรมการผู้จัดการ)
  const mdIds: number[] = [];
  for (const emp of allEmployees) {
    const mapEntry = empMap.get(emp.employeeCode);
    if (mapEntry && mapEntry.position === "md") {
      mdIds.push(mapEntry.id);
      console.log(`MD found: ${emp.firstName} ${emp.lastName} (code=${emp.employeeCode}, id=${mapEntry.id})`);
    }
  }

  // Build division → manager map (managers are the highest-level person per division)
  const divToManager = new Map<string, number>();
  for (const emp of allEmployees) {
    const mapEntry = empMap.get(emp.employeeCode);
    if (!mapEntry || !mapEntry.division) continue;

    const div = mapEntry.division;
    const existing = divToManager.get(div);

    if (!existing) {
      // First manager for this division
      if (mapEntry.position === "division_manager" || mapEntry.position === "assistant_md") {
        divToManager.set(div, mapEntry.id);
      }
    } else {
      // Prefer lower level (more senior) manager
      const existingEntry = empMap.get(allEmployees.find(e => e.employeeCode === emp.employeeCode)?.employeeCode || "") ||
        Array.from(empMap.values()).find(e => e.id === existing);
      if (existingEntry && mapEntry.level !== null && existingEntry.level !== null) {
        if (mapEntry.level < existingEntry.level) {
          divToManager.set(div, mapEntry.id);
        }
      }
    }
  }

  // Also handle divisions that have no manager - find the lowest-level employee as manager
  for (const emp of allEmployees) {
    const mapEntry = empMap.get(emp.employeeCode);
    if (!mapEntry || !mapEntry.division) continue;
    if (divToManager.has(mapEntry.division)) continue;

    // No manager yet - pick the highest-level person (lowest level number)
    divToManager.set(mapEntry.division, mapEntry.id);
  }

  console.log(`Division managers: ${divToManager.size}`);

  // Assign reportsTo
  let updatedCount = 0;
  for (const emp of allEmployees) {
    const mapEntry = empMap.get(emp.employeeCode);
    if (!mapEntry) continue;

    let reportsTo: number | null = null;

    if (mapEntry.position === "chairman") {
      reportsTo = null; // Chairman is top
    } else if (mapEntry.position === "md") {
      reportsTo = chairmanId; // MD reports to Chairman
    } else if (mapEntry.position === "assistant_md") {
      // Assistant MD reports to first MD (or chairman if no MD)
      reportsTo = mdIds[0] || chairmanId;
    } else if (mapEntry.position === "division_manager") {
      reportsTo = mdIds[0] || chairmanId; // Managers report to MD
    } else if (mapEntry.position === "team_lead") {
      // Report to the manager in same division
      const sameDivMgr = mapEntry.division ? divToManager.get(mapEntry.division) : null;
      reportsTo = sameDivMgr || mdIds[0] || chairmanId;
    } else {
      // Staff - report to manager in same division
      const sameDivMgr = mapEntry.division ? divToManager.get(mapEntry.division) : null;
      reportsTo = sameDivMgr || mdIds[0] || chairmanId;
    }

    if (reportsTo !== null) {
      await prisma.employee.update({
        where: { id: mapEntry.id },
        data: { reportsTo: reportsTo },
      });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} employees with hierarchy`);

  // Summary
  const count = await prisma.employee.count({ where: { companyId: COMPANY_ID } });
  const withReports = await prisma.employee.count({
    where: { companyId: COMPANY_ID, reportsTo: { not: null } },
  });
  const chairmanCount = await prisma.employee.count({
    where: { companyId: COMPANY_ID, position: "chairman" },
  });
  const execDirCount = await prisma.employee.count({
    where: { companyId: COMPANY_ID, position: "executive_director" },
  });
  const mdCount = await prisma.employee.count({
    where: { companyId: COMPANY_ID, position: "md" },
  });
  const assistantMdCount = await prisma.employee.count({
    where: { companyId: COMPANY_ID, position: "assistant_md" },
  });
  const mgrCount = await prisma.employee.count({
    where: { companyId: COMPANY_ID, position: "division_manager" },
  });
  const staffCount = await prisma.employee.count({
    where: { companyId: COMPANY_ID, position: "employee" },
  });

  console.log(`\nETC1992 Summary:`);
  console.log(`  Total: ${count}`);
  console.log(`  Chairman: ${chairmanCount}`);
  console.log(`  Executive Director: ${execDirCount}`);
  console.log(`  MD: ${mdCount}`);
  console.log(`  Assistant MD: ${assistantMdCount}`);
  console.log(`  Managers: ${mgrCount}`);
  console.log(`  Staff: ${staffCount}`);
  console.log(`  With reportsTo: ${withReports}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
