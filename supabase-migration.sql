-- Migration: Add new fields to existing Supabase schema

-- Add missing columns to employees table
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "position" TEXT NOT NULL DEFAULT 'employee';
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "level" INTEGER;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "has_ot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "reports_to" INTEGER;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "supervisor_name" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "supervisor_line" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "supervisor_phone" TEXT;

-- Create OT requests table
CREATE TABLE IF NOT EXISTS "ot_requests" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "emp_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "date" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "ot_requests_company_id_idx" ON "ot_requests"("company_id");
CREATE INDEX IF NOT EXISTS "ot_requests_emp_id_idx" ON "ot_requests"("emp_id");
CREATE INDEX IF NOT EXISTS "ot_requests_status_idx" ON "ot_requests"("status");

-- Add employee indexes
CREATE INDEX IF NOT EXISTS "employees_company_id_idx" ON "employees"("company_id");
CREATE INDEX IF NOT EXISTS "employees_employee_code_idx" ON "employees"("employee_code");
CREATE INDEX IF NOT EXISTS "employees_reports_to_idx" ON "employees"("reports_to");

-- Seed ETECH employees if not exist
INSERT INTO "employees" ("company_id", "name", "group_type", "position", "level", "has_ot", "department", "division", "reports_to", "employee_code", "pin", "wfh_quota", "created_at", "updated_at")
SELECT 3, 'เอนก แก้วกระจ่าง', 'B', 'md', 1, false, NULL, 'กรรมการบริหาร', NULL, 'H0004', '1234', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "employees" WHERE "employee_code" = 'H0004' AND "company_id" = 3);

INSERT INTO "employees" ("company_id", "name", "group_type", "position", "level", "has_ot", "department", "division", "reports_to", "employee_code", "pin", "wfh_quota", "created_at", "updated_at")
SELECT 3, 'นิตติยา กุดแก้ว', 'B', 'division_manager', 3, false, NULL, 'ศึกษาสิ่งแวดล้อม', 
  (SELECT id FROM "employees" WHERE "employee_code" = 'H0004' AND "company_id" = 3),
  '0003', '1234', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3);

INSERT INTO "employees" ("company_id", "name", "group_type", "position", "level", "has_ot", "department", "division", "reports_to", "employee_code", "pin", "wfh_quota", "created_at", "updated_at")
SELECT 3, 'ธิติรัตน์ อุดมพันธ์', 'B', 'employee', 6, true, NULL, 'ศึกษาสิ่งแวดล้อม', 
  (SELECT id FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3),
  '0006', '1234', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "employees" WHERE "employee_code" = '0006' AND "company_id" = 3);

INSERT INTO "employees" ("company_id", "name", "group_type", "position", "level", "has_ot", "department", "division", "reports_to", "employee_code", "pin", "wfh_quota", "created_at", "updated_at")
SELECT 3, 'ทัชชา ปะละ', 'B', 'employee', 6, true, NULL, 'ศึกษาสิ่งแวดล้อม', 
  (SELECT id FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3),
  '0016', '1234', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "employees" WHERE "employee_code" = '0016' AND "company_id" = 3);

INSERT INTO "employees" ("company_id", "name", "group_type", "position", "level", "has_ot", "department", "division", "reports_to", "employee_code", "pin", "wfh_quota", "created_at", "updated_at")
SELECT 3, 'ณิชาภา รุจิรัตโยธิน', 'B', 'employee', 6, true, NULL, 'ศึกษาสิ่งแวดล้อม', 
  (SELECT id FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3),
  '021', '1234', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "employees" WHERE "employee_code" = '021' AND "company_id" = 3);

INSERT INTO "employees" ("company_id", "name", "group_type", "position", "level", "has_ot", "department", "division", "reports_to", "employee_code", "pin", "wfh_quota", "created_at", "updated_at")
SELECT 3, 'วารุณี บัวงาม', 'B', 'employee', 6, true, NULL, 'ศึกษาสิ่งแวดล้อม', 
  (SELECT id FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3),
  '029', '1234', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "employees" WHERE "employee_code" = '029' AND "company_id" = 3);
