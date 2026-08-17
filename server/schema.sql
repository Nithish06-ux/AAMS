-- ============================================================
-- AI-BASED ATTENDANCE MANAGEMENT SYSTEM
-- PostgreSQL Database Schema
-- ============================================================

-- ============================================================
-- 1. TEACHERS
-- ============================================================

CREATE TABLE IF NOT EXISTS teachers (
    teacher_id BIGSERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. CLASSES
-- ============================================================

CREATE TABLE IF NOT EXISTS classes (
    class_id BIGSERIAL PRIMARY KEY,
    class_code VARCHAR(50) UNIQUE NOT NULL,
    class_name VARCHAR(150) NOT NULL,
    department VARCHAR(150),
    semester INTEGER CHECK (semester BETWEEN 1 AND 10),
    section VARCHAR(20),
    academic_year VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. STUDENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS students (
    student_id BIGSERIAL PRIMARY KEY,
    register_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    class_id BIGINT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student_class
        FOREIGN KEY (class_id)
        REFERENCES classes(class_id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 4. KEY VAULT
-- ============================================================

CREATE TABLE IF NOT EXISTS key_vault (
    key_id BIGSERIAL PRIMARY KEY,

    key_reference VARCHAR(255) UNIQUE NOT NULL,

    -- Store encrypted key material only.
    encrypted_key TEXT NOT NULL,

    algorithm VARCHAR(100) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    is_active BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================
-- 5. FACE EMBEDDINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS face_embeddings (
    embedding_id BIGSERIAL PRIMARY KEY,

    student_id BIGINT NOT NULL,
    key_id BIGINT NOT NULL,

    model_name VARCHAR(100) NOT NULL DEFAULT 'ArcFace',
    model_version VARCHAR(100),

    -- PostgreSQL BYTEA allows binary embedding storage.
    embedding_data BYTEA NOT NULL,

    embedding_dimension INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_embedding_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_embedding_key
        FOREIGN KEY (key_id)
        REFERENCES key_vault(key_id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 6. DEVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS devices (
    device_id BIGSERIAL PRIMARY KEY,

    device_name VARCHAR(100) NOT NULL,
    device_code VARCHAR(100) UNIQUE NOT NULL,

    location_name VARCHAR(200),

    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    geofence_radius_meters DECIMAL(8, 2)
        CHECK (geofence_radius_meters > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 7. TIMETABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS timetable (
    timetable_id BIGSERIAL PRIMARY KEY,

    class_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,

    day_of_week INTEGER NOT NULL
        CHECK (day_of_week BETWEEN 1 AND 7),

    period_no INTEGER NOT NULL
        CHECK (period_no > 0),

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    subject VARCHAR(150) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_timetable_class
        FOREIGN KEY (class_id)
        REFERENCES classes(class_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_timetable_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_timetable_time
        CHECK (end_time > start_time),

    CONSTRAINT uq_class_day_period
        UNIQUE (class_id, day_of_week, period_no)
);


-- ============================================================
-- 8. ATTENDANCE SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_sessions (
    session_id BIGSERIAL PRIMARY KEY,

    class_id BIGINT NOT NULL,
    timetable_id BIGINT NOT NULL,
    device_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,

    session_date DATE NOT NULL DEFAULT CURRENT_DATE,

    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME NOT NULL,

    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,

    session_status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (
            session_status IN (
                'scheduled',
                'active',
                'completed',
                'cancelled'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_session_class
        FOREIGN KEY (class_id)
        REFERENCES classes(class_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_session_timetable
        FOREIGN KEY (timetable_id)
        REFERENCES timetable(timetable_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_session_device
        FOREIGN KEY (device_id)
        REFERENCES devices(device_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_session_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 9. ATTENDANCE RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_records (
    attendance_id BIGSERIAL PRIMARY KEY,

    session_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,

    captured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    similarity_score DECIMAL(6, 5),

    confidence_level VARCHAR(20) NOT NULL
        CHECK (
            confidence_level IN (
                'high',
                'medium',
                'low'
            )
        ),

    attendance_status VARCHAR(20) NOT NULL DEFAULT 'present'
        CHECK (
            attendance_status IN (
                'present',
                'absent',
                'pending_review',
                'rejected'
            )
        ),

    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    distance_from_device_meters DECIMAL(10, 2),

    recognition_model VARCHAR(100) DEFAULT 'ArcFace',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attendance_session
        FOREIGN KEY (session_id)
        REFERENCES attendance_sessions(session_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_similarity_score
        CHECK (
            similarity_score IS NULL
            OR (
                similarity_score >= 0
                AND similarity_score <= 1
            )
        ),

    CONSTRAINT uq_student_session
        UNIQUE (session_id, student_id)
);


-- ============================================================
-- 10. ATTENDANCE REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_reviews (
    review_id BIGSERIAL PRIMARY KEY,

    attendance_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL,

    original_status VARCHAR(20) NOT NULL,
    final_status VARCHAR(20) NOT NULL,

    review_reason TEXT,

    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_review_attendance
        FOREIGN KEY (attendance_id)
        REFERENCES attendance_records(attendance_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_teacher
        FOREIGN KEY (reviewer_id)
        REFERENCES teachers(teacher_id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 11. AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,

    attendance_id BIGINT,

    reviewer_id BIGINT,

    action VARCHAR(100) NOT NULL,

    old_value TEXT,
    new_value TEXT,

    action_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_attendance
        FOREIGN KEY (attendance_id)
        REFERENCES attendance_records(attendance_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_audit_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES teachers(teacher_id)
        ON DELETE SET NULL
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_students_class
    ON students(class_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_student
    ON face_embeddings(student_id);

CREATE INDEX IF NOT EXISTS idx_timetable_class_day
    ON timetable(class_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_timetable_teacher
    ON timetable(teacher_id);

CREATE INDEX IF NOT EXISTS idx_sessions_class_date
    ON attendance_sessions(class_id, session_date);

CREATE INDEX IF NOT EXISTS idx_sessions_timetable
    ON attendance_sessions(timetable_id);

CREATE INDEX IF NOT EXISTS idx_sessions_device
    ON attendance_sessions(device_id);

CREATE INDEX IF NOT EXISTS idx_attendance_session
    ON attendance_records(session_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student
    ON attendance_records(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_status
    ON attendance_records(attendance_status);

CREATE INDEX IF NOT EXISTS idx_reviews_attendance
    ON attendance_reviews(attendance_id);

CREATE INDEX IF NOT EXISTS idx_audit_attendance
    ON audit_logs(attendance_id);
