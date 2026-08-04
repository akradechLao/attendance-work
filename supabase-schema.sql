-- HR Attendance System - Supabase Schema (Multi-Tenant)
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "GroupType" AS ENUM ('A', 'B');
CREATE TYPE "AttendanceStatus" AS ENUM ('late', 'on_time');
CREATE TYPE "ShiftCode" AS ENUM (
  'WC0001','WC0002','WC0003','WC0004','WC0005','WC0006',
  'WC007','WC008','WC009','WC010','WC011','WC012','WC013','WC014'
);
CREATE TYPE "DayType" AS ENUM ('working', 'holiday', 'dayOff', 'specialOff');
CREATE TYPE "OnboardingStatus" AS ENUM ('in_progress', 'completed', 'on_hold');
CREATE TYPE "OnboardingDocStatus" AS ENUM ('pending', 'submitted', 'verified', 'rejected');

-- ============================================
-- TABLES
-- ============================================

-- Companies
CREATE TABLE "companies" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "telegram_bot_token" TEXT,
    "telegram_chat_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Employees
CREATE TABLE "employees" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "group_type" "GroupType" NOT NULL,
    "department" TEXT,
    "division" TEXT,
    "position" TEXT NOT NULL DEFAULT 'employee',
    "level" INTEGER,
    "has_ot" BOOLEAN NOT NULL DEFAULT false,
    "reports_to" INTEGER,
    "wfh_quota" INTEGER NOT NULL DEFAULT 1,
    "preferred_off_day" TEXT,
    "pin" TEXT DEFAULT '1234',
    "employee_code" TEXT,
    "supervisor_name" TEXT,
    "supervisor_line" TEXT,
    "supervisor_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Employee indexes
CREATE INDEX "employees_company_id_idx" ON "employees"("company_id");
CREATE INDEX "employees_employee_code_idx" ON "employees"("employee_code");
CREATE INDEX "employees_reports_to_idx" ON "employees"("reports_to");

-- OT Requests
CREATE TABLE "ot_requests" (
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

CREATE INDEX "ot_requests_company_id_idx" ON "ot_requests"("company_id");
CREATE INDEX "ot_requests_emp_id_idx" ON "ot_requests"("emp_id");
CREATE INDEX "ot_requests_status_idx" ON "ot_requests"("status");

-- Attendance Logs
CREATE TABLE "attendance_logs" (
    "id" SERIAL PRIMARY KEY,
    "emp_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "check_in" TEXT,
    "check_in_photo" TEXT,
    "check_out" TEXT,
    "check_out_photo" TEXT,
    "status" "AttendanceStatus",
    "lat_long" TEXT,
    "date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_logs_emp_id_date_key" UNIQUE ("emp_id", "date")
);

-- Shift Schedules
CREATE TABLE "shift_schedules" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "emp_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "work_date" TEXT NOT NULL,
    "shift_code" "ShiftCode" NOT NULL DEFAULT 'WC0002',
    "day_type" "DayType" NOT NULL DEFAULT 'working',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_schedules_emp_id_work_date_key" UNIQUE ("emp_id", "work_date")
);

-- Leave Types
CREATE TABLE "leave_types" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "advance_days" INTEGER NOT NULL DEFAULT 0,
    "quota_monthly" INTEGER NOT NULL DEFAULT 0,
    "quota_daily" INTEGER NOT NULL DEFAULT 0,
    "quota_contract" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_types_company_id_name_key" UNIQUE ("company_id", "name")
);

-- Leave Requests
CREATE TABLE "leave_requests" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "emp_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "leave_type_id" INTEGER NOT NULL REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- WFH Records
CREATE TABLE "wfh_records" (
    "id" SERIAL PRIMARY KEY,
    "emp_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wfh_records_emp_id_date_key" UNIQUE ("emp_id", "date")
);

-- Admin Users
CREATE TABLE "admin_users" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_users_username_key" UNIQUE ("username")
);

-- Office Locations
CREATE TABLE "office_locations" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 200,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Company Holidays
CREATE TABLE "company_holidays" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_holidays_company_id_date_key" UNIQUE ("company_id", "date")
);

-- Company Settings
CREATE TABLE "company_settings" (
    "id" SERIAL PRIMARY KEY,
    "company_id" INTEGER NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_settings_company_id_key_key" UNIQUE ("company_id", "key")
);

-- Onboarding Records
CREATE TABLE "onboarding_records" (
    "id" SERIAL PRIMARY KEY,
    "emp_id" INTEGER NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'in_progress',
    "start_date" TEXT NOT NULL,
    "end_date" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_records_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "onboarding_records_emp_id_key" UNIQUE ("emp_id")
);

-- Onboarding Steps
CREATE TABLE "onboarding_steps" (
    "id" SERIAL PRIMARY KEY,
    "onboarding_id" INTEGER NOT NULL,
    "step_order" INTEGER NOT NULL,
    "step_key" TEXT NOT NULL,
    "step_label" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_steps_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "onboarding_steps_onboarding_id_step_key_key" UNIQUE ("onboarding_id", "step_key")
);

-- Onboarding Documents
CREATE TABLE "onboarding_documents" (
    "id" SERIAL PRIMARY KEY,
    "onboarding_id" INTEGER NOT NULL,
    "doc_type" TEXT NOT NULL,
    "doc_label" TEXT NOT NULL,
    "status" "OnboardingDocStatus" NOT NULL DEFAULT 'pending',
    "file_url" TEXT,
    "file_name" TEXT,
    "notes" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_documents_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding_records"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Onboarding Equipment
CREATE TABLE "onboarding_equipment" (
    "id" SERIAL PRIMARY KEY,
    "onboarding_id" INTEGER NOT NULL,
    "equip_type" TEXT NOT NULL,
    "equip_name" TEXT NOT NULL,
    "serial_number" TEXT,
    "notes" TEXT,
    "assigned_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_equipment_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding_records"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Onboarding Training
CREATE TABLE "onboarding_training" (
    "id" SERIAL PRIMARY KEY,
    "onboarding_id" INTEGER NOT NULL,
    "training_name" TEXT NOT NULL,
    "trainer" TEXT,
    "scheduled_date" TEXT,
    "completed_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_training_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding_records"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX "idx_employees_company" ON "employees"("company_id");
CREATE INDEX "idx_employees_employee_code" ON "employees"("employee_code");
CREATE INDEX "idx_attendance_logs_emp_id" ON "attendance_logs"("emp_id");
CREATE INDEX "idx_attendance_logs_date" ON "attendance_logs"("date");
CREATE INDEX "idx_shift_schedules_company" ON "shift_schedules"("company_id");
CREATE INDEX "idx_shift_schedules_emp_id" ON "shift_schedules"("emp_id");
CREATE INDEX "idx_shift_schedules_work_date" ON "shift_schedules"("work_date");
CREATE INDEX "idx_leave_requests_company" ON "leave_requests"("company_id");
CREATE INDEX "idx_leave_requests_emp_id" ON "leave_requests"("emp_id");
CREATE INDEX "idx_leave_requests_status" ON "leave_requests"("status");
CREATE INDEX "idx_leave_requests_date_range" ON "leave_requests"("start_date", "end_date");
CREATE INDEX "idx_wfh_records_emp_id" ON "wfh_records"("emp_id");
CREATE INDEX "idx_office_locations_company" ON "office_locations"("company_id");
CREATE INDEX "idx_company_holidays_company" ON "company_holidays"("company_id");
CREATE INDEX "idx_company_holidays_year" ON "company_holidays"("year");
CREATE INDEX "idx_leave_types_company" ON "leave_types"("company_id");
CREATE INDEX "idx_company_settings_company" ON "company_settings"("company_id");
CREATE INDEX "idx_onboarding_records_emp_id" ON "onboarding_records"("emp_id");
CREATE INDEX "idx_onboarding_steps_onboarding_id" ON "onboarding_steps"("onboarding_id");
CREATE INDEX "idx_onboarding_documents_onboarding_id" ON "onboarding_documents"("onboarding_id");
CREATE INDEX "idx_onboarding_equipment_onboarding_id" ON "onboarding_equipment"("onboarding_id");
CREATE INDEX "idx_onboarding_training_onboarding_id" ON "onboarding_training"("onboarding_id");

-- ============================================
-- SEED DATA
-- ============================================

-- Companies
INSERT INTO "companies" ("id", "name", "created_at") VALUES
(1, 'NTC', CURRENT_TIMESTAMP),
(2, 'ETC1992', CURRENT_TIMESTAMP),
(3, 'ETECH', CURRENT_TIMESTAMP),
(4, 'STC', CURRENT_TIMESTAMP);

-- Admin User (super admin - can see all companies)
INSERT INTO "admin_users" ("username", "password", "created_at", "updated_at")
VALUES ('admin', '1234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Company 1 Employees (existing data)
INSERT INTO "employees" ("company_id", "name", "group_type", "wfh_quota", "preferred_off_day", "pin", "created_at", "updated_at") VALUES
(1, 'ปิยะพงษ์ คงสิบ', 'A', 1, NULL, '1234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'กฤษกร วุฒิ', 'A', 1, 'Saturday', '1234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'จิรายุ เริงหาญ', 'B', 1, NULL, '1234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'พีรภาส ไพรบึง', 'B', 1, 'Sunday', '1234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'อัญชลี ทะพงษ์', 'A', 1, NULL, '1234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'อัครเดช เหลาจินดาวัฒน์', 'A', 1, NULL, '1234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Company 1 Office Location
INSERT INTO "office_locations" ("company_id", "name", "latitude", "longitude", "radius_meters", "is_active", "created_at", "updated_at") VALUES
(1, 'สำนักงานใหญ่', 13.123456, 100.123456, 200, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Leave Types for all companies
DO $$
DECLARE
  comp_id INTEGER;
BEGIN
  FOR comp_id IN 1..4 LOOP
    INSERT INTO "leave_types" ("company_id", "name", "advance_days", "quota_monthly", "quota_daily", "quota_contract", "created_at") VALUES
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
    (comp_id, 'ลาเพื่อรับราชการทหาร', 3, 60, 60, 0, CURRENT_TIMESTAMP);
  END LOOP;
END $$;

-- Company Settings for Company 2
INSERT INTO "company_settings" ("company_id", "key", "value", "created_at", "updated_at") VALUES
(2, 'payroll_cycle', '19-18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'payroll_payment', 'end_of_month', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ot_rate_x1', 'รายเดือน วันหยุด', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ot_rate_x15', 'วันทำงานปกติ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ot_rate_x2', 'รายวัน วันหยุด', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ot_rate_x3', 'รายเดือน รายวัน', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'late_deduction', '-', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
