-- Update ETECH employees with correct position, level, has_ot, division, reportsTo

-- MD: เอนก แก้วกระจ่าง (H0004)
UPDATE "employees" SET 
  "position" = 'md',
  "level" = 1,
  "has_ot" = false,
  "division" = 'กรรมการบริหาร',
  "reports_to" = NULL
WHERE "employee_code" = 'H0004' AND "company_id" = 3;

-- Manager: นิตติยา กุดแก้ว (0003) - reports to MD
UPDATE "employees" SET 
  "position" = 'division_manager',
  "level" = 3,
  "has_ot" = false,
  "division" = 'ศึกษาสิ่งแวดล้อม',
  "reports_to" = (SELECT id FROM "employees" WHERE "employee_code" = 'H0004' AND "company_id" = 3)
WHERE "employee_code" = '0003' AND "company_id" = 3;

-- Staff: ธิติรัตน์ อุดมพันธ์ (0006) - reports to Manager
UPDATE "employees" SET 
  "position" = 'employee',
  "level" = 6,
  "has_ot" = true,
  "division" = 'ศึกษาสิ่งแวดล้อม',
  "reports_to" = (SELECT id FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3)
WHERE "employee_code" = '0006' AND "company_id" = 3;

-- Staff: ทัชชา ปะละ (0016)
UPDATE "employees" SET 
  "position" = 'employee',
  "level" = 6,
  "has_ot" = true,
  "division" = 'ศึกษาสิ่งแวดล้อม',
  "reports_to" = (SELECT id FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3)
WHERE "employee_code" = '0016' AND "company_id" = 3;

-- Staff: ณิชาภา รุจิรัตโยธิน (021)
UPDATE "employees" SET 
  "position" = 'employee',
  "level" = 6,
  "has_ot" = true,
  "division" = 'ศึกษาสิ่งแวดล้อม',
  "reports_to" = (SELECT id FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3)
WHERE "employee_code" = '021' AND "company_id" = 3;

-- Staff: วารุณี บัวงาม (029)
UPDATE "employees" SET 
  "position" = 'employee',
  "level" = 6,
  "has_ot" = true,
  "division" = 'ศึกษาสิ่งแวดล้อม',
  "reports_to" = (SELECT id FROM "employees" WHERE "employee_code" = '0003' AND "company_id" = 3)
WHERE "employee_code" = '029' AND "company_id" = 3;

-- Verify
SELECT id, name, employee_code, position, level, has_ot, division, reports_to FROM employees WHERE company_id=3 ORDER BY id;
