INSERT INTO vaccines (name, description, recommended_age_days, dose_number) VALUES
('BCG', 'Protects against tuberculosis. Given once at birth.', 0, 1),
('Hepatitis B (Birth Dose)', 'Protects against Hepatitis B. Given within 24 hours of birth.', 0, 1),
('Pentavalent (DTP-HepB-Hib) Dose 1', 'Protects against Diphtheria, Tetanus, Pertussis, Hepatitis B, and Hib. Given at 6 weeks.', 42, 1),
('OPV Dose 1', 'Oral Polio Vaccine. Given at 6 weeks.', 42, 1),
('PCV Dose 1', 'Pneumococcal Conjugate Vaccine. Given at 6 weeks.', 42, 1),
('Pentavalent (DTP-HepB-Hib) Dose 2', 'Second dose. Given at 10 weeks.', 70, 2),
('OPV Dose 2', 'Second dose. Given at 10 weeks.', 70, 2),
('PCV Dose 2', 'Second dose. Given at 10 weeks.', 70, 2),
('Pentavalent (DTP-HepB-Hib) Dose 3', 'Third dose. Given at 14 weeks.', 98, 3),
('OPV Dose 3', 'Third dose. Given at 14 weeks.', 98, 3),
('IPV', 'Inactivated Polio Vaccine. Given at 14 weeks.', 98, 1),
('PCV Dose 3', 'Third dose. Given at 14 weeks.', 98, 3),
('MMR (Measles, Mumps, Rubella)', 'Given at 9 months.', 270, 1);

INSERT INTO clinics (name, address, contact_number) VALUES
('Taytay Community Health Center', 'Taytay, Rizal', '09171234567'),
('Little Angels Pediatric Clinic', 'Antipolo, Rizal', '09179876543');

INSERT INTO doctors (clinic_id, full_name, specialization) VALUES
(1, 'Dr. Maria Santos', 'Pediatrics'),
(2, 'Dr. Juan Dela Cruz', 'Pediatrics');

INSERT INTO users (email, password_hash, role) VALUES
('testparent@example.com', 'placeholder_hash_replace_in_phase6', 'parent');

INSERT INTO parents (user_id, full_name, contact_number) VALUES
(1, 'Jane Dela Cruz', '09181234567');

INSERT INTO babies (parent_id, full_name, date_of_birth, gender, birth_weight_kg, birth_height_cm) VALUES
(1, 'Baby Sample', '2026-06-01', 'female', 3.20, 49.5);