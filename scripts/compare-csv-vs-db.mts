import { readFileSync, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";

interface CsvRow {
  employee_code: string;
  employee_title_lv: string;
  employee_name: string;
  employee_last_name: string;
}

function extractCodesFromCsv(filePath: string): Map<string, string> {
  const csvContent = readFileSync(filePath, "utf-8");
  const records: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    from_line: 2,
    relax_column_count: true,
  });

  const map = new Map<string, string>();
  for (const row of records) {
    const code = row.employee_code?.trim() || "";
    if (/^\d+$|^[Hh]\d+$/.test(code)) {
      const titleMap: Record<string, string> = { "01-นาย": "นาย", "02-นาง": "นาง", "03-นางสาว": "นางสาว" };
      const title = titleMap[row.employee_title_lv] || "";
      map.set(code, `${title}${row.employee_name} ${row.employee_last_name}`.trim());
    }
  }
  return map;
}

// Read Supabase data
const supabaseLines = readFileSync("scripts/data/supabase-company2.txt", "utf-8").split("\n").filter(Boolean);
const supabaseCodes = new Map<string, string>();
for (const line of supabaseLines) {
  const [code, ...nameParts] = line.split("|");
  supabaseCodes.set(code, nameParts.join("|"));
}

// Read CSV data
const srMap = extractCodesFromCsv("scripts/data/ETC-SR.csv");
const kbMap = extractCodesFromCsv("scripts/data/ETC-KB-LP.csv");
const csvMap = new Map<string, string>([...srMap, ...kbMap]);

console.log(`\n=== Summary ===`);
console.log(`CSV total: ${csvMap.size} employees`);
console.log(`Supabase total: ${supabaseCodes.size} employees`);

// Find missing from Supabase
const missingFromDb: string[] = [];
for (const [code, name] of csvMap) {
  if (!supabaseCodes.has(code)) {
    missingFromDb.push(`${code} | ${name}`);
  }
}

// Find in DB but not in CSV (extra)
const extraInDb: string[] = [];
for (const [code, name] of supabaseCodes) {
  if (!csvMap.has(code)) {
    extraInDb.push(`${code} | ${name}`);
  }
}

// Find duplicates in DB
const dbCodeCount = new Map<string, number>();
for (const code of supabaseCodes.keys()) {
  dbCodeCount.set(code, (dbCodeCount.get(code) || 0) + 1);
}
const duplicates = [...dbCodeCount.entries()].filter(([_, count]) => count > 1);

console.log(`\n=== Missing from Supabase (in CSV but NOT in DB) ===`);
if (missingFromDb.length === 0) {
  console.log(`None - all CSV employees are in the DB!`);
} else {
  console.log(`Total missing: ${missingFromDb.length}`);
  for (const emp of missingFromDb.sort()) {
    console.log(`  ${emp}`);
  }
}

console.log(`\n=== Extra in Supabase (in DB but NOT in CSV) ===`);
if (extraInDb.length === 0) {
  console.log(`None - all DB employees are in the CSV!`);
} else {
  console.log(`Total extra: ${extraInDb.length}`);
  for (const emp of extraInDb.sort()) {
    console.log(`  ${emp}`);
  }
}

if (duplicates.length > 0) {
  console.log(`\n=== Duplicate Codes in Supabase ===`);
  for (const [code, count] of duplicates) {
    console.log(`  ${code}: ${count} times`);
  }
}
