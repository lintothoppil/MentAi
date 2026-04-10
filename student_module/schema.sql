-- Database Schema for MentorAI Student Module

CREATE DATABASE IF NOT EXISTS mentorai;
USE mentorai;

-- Table: students
-- Stores basic registration and personal info
CREATE TABLE IF NOT EXISTS students (
    admission_number VARCHAR(20) PRIMARY KEY,
    roll_number VARCHAR(20),
    full_name VARCHAR(100) NOT NULL,
    branch VARCHAR(50),
    batch VARCHAR(20),
    dob DATE,
    age INT,
    blood_group VARCHAR(10),
    religion VARCHAR(50),
    caste_category VARCHAR(20), -- OBC/SC/ST/General
    permanent_address TEXT,
    contact_address TEXT,
    mobile_number VARCHAR(15),
    email VARCHAR(100) UNIQUE NOT NULL, -- Must be Gmail
    photo_path VARCHAR(255),
    mentor_remarks TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: parents
-- Stores parent details linked to student
CREATE TABLE IF NOT EXISTS parents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_admission_number VARCHAR(20),
    father_name VARCHAR(100),
    father_profession VARCHAR(100),
    father_age INT,
    father_mobile VARCHAR(15),
    mother_name VARCHAR(100),
    mother_profession VARCHAR(100),
    mother_age INT,
    mother_mobile VARCHAR(15),
    FOREIGN KEY (student_admission_number) REFERENCES students(admission_number) ON DELETE CASCADE
);

-- Table: academics
-- Stores academic history
CREATE TABLE IF NOT EXISTS academics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_admission_number VARCHAR(20),
    
    -- 10th Details
    school_10th VARCHAR(100),
    board_10th VARCHAR(50),
    percentage_10th FLOAT,
    
    -- 12th/+2 Details
    school_12th VARCHAR(100),
    board_12th VARCHAR(50),
    percentage_12th FLOAT,
    
    -- UG Details
    college_ug VARCHAR(100),
    university_ug VARCHAR(100),
    percentage_ug FLOAT,
    
    -- Current Performance
    sgpa FLOAT,
    cgpa FLOAT,
    
    FOREIGN KEY (student_admission_number) REFERENCES students(admission_number) ON DELETE CASCADE
);

-- Table: other_info
-- Siblings and Accommodation details
CREATE TABLE IF NOT EXISTS other_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_admission_number VARCHAR(20),
    siblings_details TEXT, -- JSON or Text format for "name, age, employed/student"
    accommodation_type VARCHAR(50), -- Day scholar / Hosteller
    transport_mode VARCHAR(50),
    FOREIGN KEY (student_admission_number) REFERENCES students(admission_number) ON DELETE CASCADE
);

-- Table: login_credentials
-- Stores hashed passwords for login
CREATE TABLE IF NOT EXISTS login_credentials (
    admission_number VARCHAR(20) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    FOREIGN KEY (admission_number) REFERENCES students(admission_number) ON DELETE CASCADE
);
