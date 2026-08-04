-- Delete duplicates from ETC1992 (company 2)
DELETE FROM employees WHERE id IN (12, 357);

-- Insert all 6 ETECH employees into company 3
INSERT INTO employees (company_id, name, group_type, wfh_quota, preferred_off_day, pin, employee_code, created_at, updated_at) VALUES
(3, 'เอนก แก้วกระจ่าง', 'A', 1, NULL, '1234', 'H0004', NOW(), NOW()),
(3, 'นิตติยา กุดแก้ว', 'A', 1, NULL, '1234', '0003', NOW(), NOW()),
(3, 'ธิติรัตน์ อุดมพันธ์', 'B', 1, NULL, '1234', '0006', NOW(), NOW()),
(3, 'ทัชชา ปะละ', 'B', 1, NULL, '1234', '0016', NOW(), NOW()),
(3, 'ณิชาภา รุจิรัตโยธิน', 'B', 1, NULL, '1234', '021', NOW(), NOW()),
(3, 'วารุณี บัวงาม', 'B', 1, NULL, '1234', '029', NOW(), NOW());
