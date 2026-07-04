DELETE FROM attendance_logs;
DELETE FROM shift_schedules;
DELETE FROM leave_requests;
DELETE FROM wfh_records;
DELETE FROM onboarding_training;
DELETE FROM onboarding_equipment;
DELETE FROM onboarding_documents;
DELETE FROM onboarding_steps;
DELETE FROM onboarding_records;
DELETE FROM employees;

ALTER SEQUENCE employees_id_seq RESTART WITH 1;

INSERT INTO employees (name, group_type, wfh_quota, preferred_off_day, created_at, updated_at)
VALUES
    ('ปิยะพงษ์ คงสิบ', 'A', 1, NULL, NOW(), NOW()),
    ('กฤษกร วุฒิ', 'A', 1, 'Saturday', NOW(), NOW()),
    ('จิรายุ เริงหาญ', 'B', 1, NULL, NOW(), NOW()),
    ('พีรภาส ไพรบึง', 'B', 1, 'Sunday', NOW(), NOW()),
    ('อัญชลี ทะพงษ์', 'A', 1, NULL, NOW(), NOW()),
    ('อัครเดช เหลาจินดาวัฒน์', 'A', 1, NULL, NOW(), NOW());
