-- HR Attendance System - Supabase Schema
-- Run this SQL in Supabase SQL Editor

-- Create enums
CREATE TYPE "GroupType" AS ENUM ('A', 'B');
CREATE TYPE "AttendanceStatus" AS ENUM ('late', 'on_time');
CREATE TYPE "ShiftType" AS ENUM ('normal', 'ot', 'saturday', 'sunday', 'wfh', 'holiday');
CREATE TYPE "OnboardingStatus" AS ENUM ('in_progress', 'completed', 'on_hold');
CREATE TYPE "OnboardingDocStatus" AS ENUM ('pending', 'submitted', 'verified', 'rejected');

-- ============================================
-- TABLES
-- ============================================

-- Employees
CREATE TABLE "employees" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "group_type" "GroupType" NOT NULL,
    "wfh_quota" INTEGER NOT NULL DEFAULT 1,
    "preferred_off_day" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Logs
CREATE TABLE "attendance_logs" (
    "id" SERIAL PRIMARY KEY,
    "emp_id" INTEGER NOT NULL,
    "check_in" TEXT,
    "check_in_photo" TEXT,
    "check_out" TEXT,
    "check_out_photo" TEXT,
    "status" "AttendanceStatus",
    "lat_long" TEXT,
    "date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_logs_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_logs_emp_id_date_key" UNIQUE ("emp_id", "date")
);

-- Shift Schedules
CREATE TABLE "shift_schedules" (
    "id" SERIAL PRIMARY KEY,
    "emp_id" INTEGER NOT NULL,
    "work_date" TEXT NOT NULL,
    "shift_type" "ShiftType" NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_schedules_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_schedules_emp_id_work_date_key" UNIQUE ("emp_id", "work_date")
);

-- Leave Requests
CREATE TABLE "leave_requests" (
    "id" SERIAL PRIMARY KEY,
    "emp_id" INTEGER NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_requests_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- WFH Records
CREATE TABLE "wfh_records" (
    "id" SERIAL PRIMARY KEY,
    "emp_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wfh_records_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wfh_records_emp_id_date_key" UNIQUE ("emp_id", "date")
);

-- Admin Users
CREATE TABLE "admin_users" (
    "id" SERIAL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_users_username_key" UNIQUE ("username")
);

-- Office Locations
CREATE TABLE "office_locations" (
    "id" SERIAL PRIMARY KEY,
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
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_holidays_date_key" UNIQUE ("date")
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
-- SEED DATA
-- ============================================

-- Admin User
INSERT INTO "admin_users" ("username", "password", "created_at", "updated_at")
VALUES ('admin', '1234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Employees
INSERT INTO "employees" ("name", "group_type", "wfh_quota", "preferred_off_day", "created_at", "updated_at")
VALUES
    ('ปิยะพงษ์ คงสิบ', 'A', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('กฤษกร วุฒิ', 'A', 1, 'Saturday', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('จิรายุ เริงหาญ', 'B', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('พีรภาส ไพรบึง', 'B', 1, 'Sunday', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('อัญชลี ทะพงษ์', 'A', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('อัครเดช เหลาจินดาวัฒน์', 'A', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX "attendance_logs_emp_id_idx" ON "attendance_logs"("emp_id");
CREATE INDEX "attendance_logs_date_idx" ON "attendance_logs"("date");
CREATE INDEX "shift_schedules_emp_id_idx" ON "shift_schedules"("emp_id");
CREATE INDEX "shift_schedules_work_date_idx" ON "shift_schedules"("work_date");
CREATE INDEX "leave_requests_emp_id_idx" ON "leave_requests"("emp_id");
CREATE INDEX "wfh_records_emp_id_idx" ON "wfh_records"("emp_id");
CREATE INDEX "company_holidays_year_idx" ON "company_holidays"("year");
CREATE INDEX "onboarding_records_emp_id_idx" ON "onboarding_records"("emp_id");
CREATE INDEX "onboarding_steps_onboarding_id_idx" ON "onboarding_steps"("onboarding_id");
CREATE INDEX "onboarding_documents_onboarding_id_idx" ON "onboarding_documents"("onboarding_id");
CREATE INDEX "onboarding_equipment_onboarding_id_idx" ON "onboarding_equipment"("onboarding_id");
CREATE INDEX "onboarding_training_onboarding_id_idx" ON "onboarding_training"("onboarding_id");
