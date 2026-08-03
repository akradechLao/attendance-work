-- HR Attendance System - Migration SQL (Multi-Tenant)
-- Run this SQL in Supabase SQL Editor to migrate from single-tenant to multi-tenant
-- WARNING: This will modify existing tables. Backup your data first!

-- ============================================
-- STEP 1: Add new tables
-- ============================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Leave Types table
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    name TEXT NOT NULL,
    advance_days INTEGER NOT NULL DEFAULT 0,
    quota_monthly INTEGER NOT NULL DEFAULT 0,
    quota_daily INTEGER NOT NULL DEFAULT 0,
    quota_contract INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT leave_types_company_id_name_key UNIQUE (company_id, name)
);

-- Company Settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT company_settings_company_id_key_key UNIQUE (company_id, key)
);

-- ============================================
-- STEP 2: Add companyId columns to existing tables
-- ============================================

-- Add company_id to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '1234';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code TEXT;

-- Add company_id to shift_schedules
ALTER TABLE shift_schedules ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- Add company_id to leave_requests
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type_id INTEGER;

-- Add company_id to admin_users
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- Add company_id to office_locations
ALTER TABLE office_locations ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- Add company_id to company_holidays
ALTER TABLE company_holidays ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- ============================================
-- STEP 3: Create new enum types
-- ============================================

DO $$ BEGIN
  CREATE TYPE "ShiftCode" AS ENUM (
    'WC0001','WC0002','WC0003','WC0004','WC0005','WC0006',
    'WC007','WC008','WC009','WC010','WC011','WC012','WC013','WC014'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DayType" AS ENUM ('working', 'holiday', 'dayOff', 'specialOff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OnboardingStatus" AS ENUM ('in_progress', 'completed', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OnboardingDocStatus" AS ENUM ('pending', 'submitted', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 4: Migrate existing data
-- ============================================

-- Create Company 1 from existing employees
INSERT INTO companies (id, name, created_at)
VALUES (1, 'บริษัท นอร์ทเทิร์นไทยคอนซัลติ้ง จำกัด', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Assign existing employees to Company 1
UPDATE employees SET company_id = 1 WHERE company_id IS NULL;

-- Assign existing shift_schedules to Company 1
UPDATE shift_schedules SET company_id = 1 WHERE company_id IS NULL;

-- Assign existing leave_requests to Company 1
UPDATE leave_requests SET company_id = 1 WHERE company_id IS NULL;

-- Assign existing office_locations to Company 1
UPDATE office_locations SET company_id = 1 WHERE company_id IS NULL;

-- Assign existing company_holidays to Company 1
UPDATE company_holidays SET company_id = 1 WHERE company_id IS NULL;

-- ============================================
-- STEP 5: Add foreign key constraints
-- ============================================

DO $$ BEGIN
  ALTER TABLE employees ADD CONSTRAINT employees_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE shift_schedules ADD CONSTRAINT shift_schedules_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_id_fkey
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE admin_users ADD CONSTRAINT admin_users_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE office_locations ADD CONSTRAINT office_locations_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE company_holidays ADD CONSTRAINT company_holidays_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 6: Add NOT NULL constraints
-- ============================================

ALTER TABLE employees ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE shift_schedules ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leave_requests ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE office_locations ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE company_holidays ALTER COLUMN company_id SET NOT NULL;

-- ============================================
-- STEP 7: Add indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_company ON shift_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_work_date ON shift_schedules(work_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date_range ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_office_locations_company ON office_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_holidays_company ON company_holidays(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_company ON leave_types(company_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_company ON company_settings(company_id);

-- ============================================
-- STEP 8: Seed Companies 2-4
-- ============================================

INSERT INTO companies (id, name, created_at) VALUES
(2, 'บริษัท อีสเทิร์นไทยคอนซัลติ้ง1992 จำกัด', CURRENT_TIMESTAMP),
(3, 'บริษัท เอ็นไวรอนเมนทอลเทคโนโลยีคอนซัลแตนท์ จำกัด', CURRENT_TIMESTAMP),
(4, 'บริษัท เซาวท์เทิร์นไทยคอนซัลติ้ง จำกัด', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 9: Seed Leave Types for all companies
-- ============================================

DO $$
DECLARE
  comp_id INTEGER;
BEGIN
  FOR comp_id IN 1..4 LOOP
    INSERT INTO leave_types (company_id, name, advance_days, quota_monthly, quota_daily, quota_contract, created_at) VALUES
    (comp_id, 'ลากิจได้รับค่าจ้าง', 1, 6, 3, 3, CURRENT_TIMESTAMP),
    (comp_id, 'ลากิจไม่ได้รับค่าจ้าง', 1, 20, 20, 20, CURRENT_TIMESTAMP),
    (comp_id, 'ลาป่วยได้รับค่าจ้าง', 0, 30, 30, 30, CURRENT_TIMESTAMP),
    (comp_id, 'ลาป่วยไม่ได้รับค่าจ้าง', 0, 120, 120, 120, CURRENT_TIMESTAMP),
    (comp_id, 'ลาพักร้อน', 3, 6, 6, 2, CURRENT_TIMESTAMP),
    (comp_id, 'ลาพักร้อนสะสม', 3, 3, 3, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลาคลอดบุตรได้รับค่าจ้าง', 0, 60, 60, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลาคลอดบุตรไม่ได้รับค่าจ้าง', 0, 60, 60, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลาเพื่อช่วยเหลือคู่สมรส', 3, 15, 15, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลากรณีบุตรป่วยเสี่ยงมีภาวะผิดปกติ', 3, 15, 15, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลาฝึกอบรม', 3, 30, 30, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลาเพื่อทำหมัน', 3, 14, 14, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลาพิเศษกรณีบิดามารดาบุตรคู่สมรสถึงแก่กรรม', 0, 7, 7, 5, CURRENT_TIMESTAMP),
    (comp_id, 'ลาบวชได้รับค่าจ้าง', 3, 30, 30, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลาบวชไม่รับค่าจ้าง', 3, 90, 90, 0, CURRENT_TIMESTAMP),
    (comp_id, 'ลาเพื่อรับราชการทหาร', 3, 60, 60, 0, CURRENT_TIMESTAMP)
    ON CONFLICT (company_id, name) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- STEP 10: Seed Company Settings for Company 2
-- ============================================

INSERT INTO company_settings (company_id, key, value, created_at, updated_at) VALUES
(2, 'payroll_cycle', '19-18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'payroll_payment', 'end_of_month', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ot_rate_x1', 'รายเดือน วันหยุด', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ot_rate_x15', 'วันทำงานปกติ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ot_rate_x2', 'รายวัน วันหยุด', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ot_rate_x3', 'รายเดือน รายวัน', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'late_deduction', '-', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (company_id, key) DO NOTHING;

-- ============================================
-- STEP 11: Update employee_code for Company 1
-- ============================================

UPDATE employees SET employee_code = 'NTC001' WHERE id = 1 AND company_id = 1;
UPDATE employees SET employee_code = 'NTC002' WHERE id = 2 AND company_id = 1;
UPDATE employees SET employee_code = 'NTC003' WHERE id = 3 AND company_id = 1;
UPDATE employees SET employee_code = 'NTC004' WHERE id = 4 AND company_id = 1;
UPDATE employees SET employee_code = 'NTC005' WHERE id = 5 AND company_id = 1;
UPDATE employees SET employee_code = 'NTC006' WHERE id = 6 AND company_id = 1;

-- ============================================
-- DONE!
-- ============================================