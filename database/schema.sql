CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'clinic', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  contact_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE babies (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  birth_weight_kg NUMERIC(4,2),
  birth_height_cm NUMERIC(4,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (date_of_birth <= CURRENT_DATE)
);

CREATE TABLE clinics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255),
  contact_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  specialization VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vaccines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  recommended_age_days INTEGER NOT NULL,
  dose_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE baby_vaccinations (
  id SERIAL PRIMARY KEY,
  baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  vaccine_id INTEGER NOT NULL REFERENCES vaccines(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'due', 'completed', 'overdue')),
  completed_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE growth_records (
  id SERIAL PRIMARY KEY,
  baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  weight_kg NUMERIC(4,2) NOT NULL CHECK (weight_kg > 0),
  height_cm NUMERIC(4,1) NOT NULL CHECK (height_cm > 0),
  head_circumference_cm NUMERIC(4,1),
  record_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_reads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  baby_vaccination_id INTEGER NOT NULL REFERENCES baby_vaccinations(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, baby_vaccination_id)
);

CREATE OR REPLACE FUNCTION sync_vaccine_schedule_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recommended_age_days IS DISTINCT FROM OLD.recommended_age_days THEN
    UPDATE baby_vaccinations bv
    SET scheduled_date = b.date_of_birth + NEW.recommended_age_days,
        status = CASE
          WHEN CURRENT_DATE > (b.date_of_birth + NEW.recommended_age_days + 30) THEN 'overdue'
          WHEN CURRENT_DATE >= (b.date_of_birth + NEW.recommended_age_days) THEN 'due'
          ELSE 'upcoming'
        END
    FROM babies b
    WHERE bv.baby_id = b.id
      AND bv.vaccine_id = NEW.id
      AND bv.status != 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_vaccine_schedule_dates
AFTER UPDATE ON vaccines
FOR EACH ROW
EXECUTE FUNCTION sync_vaccine_schedule_dates();