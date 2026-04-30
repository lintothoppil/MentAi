CREATE TABLE courses (
	id INTEGER NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	code VARCHAR(10), 
	duration_years INTEGER, 
	PRIMARY KEY (id), 
	UNIQUE (name), 
	UNIQUE (code)
);

CREATE TABLE faculty (
	id INTEGER NOT NULL, 
	username VARCHAR(50) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	email VARCHAR(100), 
	designation VARCHAR(50) NOT NULL, 
	department VARCHAR(50) NOT NULL, 
	status VARCHAR(20), 
	is_mentor_eligible BOOLEAN, 
	is_hod BOOLEAN, 
	is_subject_handler BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (username), 
	UNIQUE (email)
);

CREATE TABLE notes (
	id INTEGER NOT NULL, 
	subject_name VARCHAR(100) NOT NULL, 
	title VARCHAR(150) NOT NULL, 
	file_path VARCHAR(255) NOT NULL, 
	file_type VARCHAR(10), 
	uploaded_by VARCHAR(100), 
	created_at DATETIME, 
	PRIMARY KEY (id)
);

CREATE TABLE semesters (
	id INTEGER NOT NULL, 
	name VARCHAR(50) NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE alumni_mentor_history (
	id INTEGER NOT NULL, 
	admission_number VARCHAR(20) NOT NULL, 
	mentor_id INTEGER, 
	start_date DATETIME, 
	end_date DATETIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE batches (
	id INTEGER NOT NULL, 
	course_id INTEGER NOT NULL, 
	start_year INTEGER NOT NULL, 
	end_year INTEGER NOT NULL, 
	status VARCHAR(20), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id)
);

CREATE TABLE handler_announcements (
	id INTEGER NOT NULL, 
	handler_id INTEGER NOT NULL, 
	subject_code VARCHAR(50), 
	department VARCHAR(50), 
	batch VARCHAR(20), 
	title VARCHAR(200) NOT NULL, 
	message TEXT NOT NULL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(handler_id) REFERENCES faculty (id)
);

CREATE TABLE mentor_leaves (
	id INTEGER NOT NULL, 
	mentor_id INTEGER NOT NULL, 
	leave_date DATE NOT NULL, 
	from_time VARCHAR(10), 
	to_time VARCHAR(10), 
	reason VARCHAR(255), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE subjects (
	id INTEGER NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	course_id INTEGER NOT NULL, 
	semester_id INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_subject_per_semester UNIQUE (name, semester_id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(semester_id) REFERENCES semesters (id)
);

CREATE TABLE alumni_students (
	id INTEGER NOT NULL, 
	admission_number VARCHAR(20) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	email VARCHAR(100), 
	department VARCHAR(50), 
	course_id INTEGER, 
	batch_id INTEGER, 
	mentor_id INTEGER, 
	passout_year INTEGER, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (admission_number), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(batch_id) REFERENCES batches (id), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE students (
	admission_number VARCHAR(20) NOT NULL, 
	roll_number VARCHAR(20), 
	full_name VARCHAR(100) NOT NULL, 
	branch VARCHAR(50), 
	batch VARCHAR(20), 
	batch_id INTEGER, 
	dob DATE, 
	age INTEGER, 
	blood_group VARCHAR(10), 
	religion VARCHAR(50), 
	diocese VARCHAR(100), 
	parish VARCHAR(100), 
	caste_category VARCHAR(20), 
	permanent_address TEXT, 
	contact_address TEXT, 
	mobile_number VARCHAR(15), 
	email VARCHAR(100) NOT NULL, 
	photo_path VARCHAR(255), 
	mentor_remarks TEXT, 
	profile_completed BOOLEAN, 
	status VARCHAR(20), 
	passout_year INTEGER, 
	password_hash VARCHAR(255), 
	created_at DATETIME, 
	mentor_id INTEGER, 
	PRIMARY KEY (admission_number), 
	FOREIGN KEY(batch_id) REFERENCES batches (id), 
	UNIQUE (email), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE subject_allocations (
	id INTEGER NOT NULL, 
	subject_id INTEGER NOT NULL, 
	faculty_id INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_subject_faculty UNIQUE (subject_id, faculty_id), 
	FOREIGN KEY(subject_id) REFERENCES subjects (id), 
	FOREIGN KEY(faculty_id) REFERENCES faculty (id)
);

CREATE TABLE timetables (
	id INTEGER NOT NULL, 
	department VARCHAR(50) NOT NULL, 
	batch VARCHAR(20), 
	day VARCHAR(15), 
	period INTEGER, 
	time_slot VARCHAR(50), 
	subject VARCHAR(100), 
	handler_name VARCHAR(100), 
	handler_id INTEGER, 
	course_id INTEGER, 
	batch_id INTEGER, 
	semester INTEGER, 
	academic_year VARCHAR(20), 
	file_path VARCHAR(255), 
	uploaded_at DATETIME, 
	uploaded_by INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(handler_id) REFERENCES faculty (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(batch_id) REFERENCES batches (id), 
	FOREIGN KEY(uploaded_by) REFERENCES faculty (id)
);

CREATE TABLE academics (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	school_10th VARCHAR(100), 
	board_10th VARCHAR(50), 
	percentage_10th FLOAT, 
	school_12th VARCHAR(100), 
	board_12th VARCHAR(50), 
	percentage_12th FLOAT, 
	college_ug VARCHAR(100), 
	university_ug VARCHAR(100), 
	percentage_ug FLOAT, 
	sgpa FLOAT, 
	cgpa FLOAT, 
	medium_of_instruction VARCHAR(50), 
	entrance_rank VARCHAR(50), 
	nature_of_admission VARCHAR(50), 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE activities (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	title VARCHAR(150) NOT NULL, 
	type VARCHAR(50), 
	certificate_path VARCHAR(255), 
	date DATE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE adaptive_timetables (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	day_type VARCHAR(10), 
	schedule_json TEXT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE alerts (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	mentor_id INTEGER, 
	type VARCHAR(50), 
	message TEXT, 
	created_at DATETIME, 
	is_read BOOLEAN, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE appointments (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	mentor_id INTEGER NOT NULL, 
	preferred_date DATE NOT NULL, 
	preferred_time TIME NOT NULL, 
	mode VARCHAR(20), 
	status VARCHAR(20), 
	meeting_link VARCHAR(255), 
	notes TEXT, 
	reschedule_date DATE, 
	reschedule_time TIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE attendance (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	subject_name VARCHAR(100) NOT NULL, 
	subject_code VARCHAR(50), 
	semester INTEGER NOT NULL, 
	total_classes INTEGER, 
	attended_classes INTEGER, 
	percentage FLOAT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE certificates (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	activity_name VARCHAR(150), 
	category VARCHAR(50), 
	date_of_event DATE, 
	file_path VARCHAR(255), 
	uploaded_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE daily_attendance (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	date DATE NOT NULL, 
	hour_1 INTEGER, 
	hour_2 INTEGER, 
	hour_3 INTEGER, 
	hour_4 INTEGER, 
	hour_5 INTEGER, 
	hour_6 INTEGER, 
	hour_7 INTEGER, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT _student_date_uc UNIQUE (student_admission_number, date), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE guardians (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	name VARCHAR(100), 
	address TEXT, 
	mobile_number VARCHAR(15), 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE handler_messages (
	id INTEGER NOT NULL, 
	handler_id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	subject_code VARCHAR(50), 
	message TEXT NOT NULL, 
	sender_role VARCHAR(20), 
	attachment_path VARCHAR(255), 
	sent_at DATETIME, 
	is_read BOOLEAN, 
	PRIMARY KEY (id), 
	FOREIGN KEY(handler_id) REFERENCES faculty (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE internal_marks (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	subject_id INTEGER NOT NULL, 
	exam_type VARCHAR(50) NOT NULL, 
	marks FLOAT NOT NULL, 
	uploaded_by INTEGER NOT NULL, 
	uploaded_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_internal_exam UNIQUE (student_id, subject_id, exam_type), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number), 
	FOREIGN KEY(subject_id) REFERENCES subjects (id), 
	FOREIGN KEY(uploaded_by) REFERENCES faculty (id)
);

CREATE TABLE issues (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	mentor_id INTEGER, 
	category VARCHAR(50), 
	subject VARCHAR(150), 
	description TEXT, 
	status VARCHAR(20), 
	resolution_notes TEXT, 
	raised_at DATETIME, 
	resolved_at DATETIME, 
	rating INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE leave_requests (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	type VARCHAR(50), 
	from_date DATE NOT NULL, 
	to_date DATE, 
	reason TEXT NOT NULL, 
	document_path VARCHAR(255), 
	status VARCHAR(20), 
	coordinator_status VARCHAR(20), 
	hod_status VARCHAR(20), 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE login_credentials (
	admission_number VARCHAR(20) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	PRIMARY KEY (admission_number), 
	FOREIGN KEY(admission_number) REFERENCES students (admission_number)
);

CREATE TABLE mentor_interventions (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	mentor_id INTEGER NOT NULL, 
	week_start DATE NOT NULL, 
	risk_snapshot FLOAT, 
	compliance_snapshot FLOAT, 
	intervention_type VARCHAR(50), 
	notes TEXT, 
	created_at DATETIME, 
	escalated BOOLEAN, 
	escalated_at DATETIME, 
	locked BOOLEAN, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE mentor_messages (
	id INTEGER NOT NULL, 
	mentor_id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	message TEXT NOT NULL, 
	sender_role VARCHAR(20), 
	sent_at DATETIME, 
	is_read BOOLEAN, 
	PRIMARY KEY (id), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE mentoring_sessions (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	mentor_id INTEGER, 
	date DATE NOT NULL, 
	time VARCHAR(20) NOT NULL, 
	slot_type VARCHAR(20), 
	type VARCHAR(20), 
	status VARCHAR(20), 
	meeting_link VARCHAR(255), 
	remarks TEXT, 
	calendar_event_id VARCHAR(255), 
	calendar_link VARCHAR(512), 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number), 
	FOREIGN KEY(mentor_id) REFERENCES faculty (id)
);

CREATE TABLE notifications (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	title VARCHAR(100) NOT NULL, 
	message TEXT NOT NULL, 
	type VARCHAR(50), 
	is_read BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE other_info (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	siblings_details TEXT, 
	accommodation_type VARCHAR(50), 
	staying_with VARCHAR(100), 
	hostel_name VARCHAR(100), 
	stay_from DATE, 
	stay_to DATE, 
	transport_mode VARCHAR(50), 
	vehicle_number VARCHAR(20), 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE parents (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	father_name VARCHAR(100), 
	father_profession VARCHAR(100), 
	father_age INTEGER, 
	father_mobile VARCHAR(15), 
	mother_name VARCHAR(100), 
	mother_profession VARCHAR(100), 
	mother_age INTEGER, 
	mother_mobile VARCHAR(15), 
	father_place_of_work VARCHAR(100), 
	mother_place_of_work VARCHAR(100), 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE routine_preferences (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	wakeup_time VARCHAR(10), 
	prayer_time VARCHAR(10), 
	breakfast_time VARCHAR(10), 
	college_start VARCHAR(10), 
	college_end VARCHAR(10), 
	refresh_time VARCHAR(10), 
	play_time VARCHAR(10), 
	food_time VARCHAR(10), 
	bed_time VARCHAR(10), 
	PRIMARY KEY (id), 
	UNIQUE (student_id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE student_analytics (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	attendance_percentage FLOAT, 
	attendance_slope FLOAT, 
	avg_internal_marks FLOAT, 
	marks_slope FLOAT, 
	failure_count INTEGER, 
	marks_variance FLOAT, 
	risk_score FLOAT, 
	status VARCHAR(20), 
	ml_risk_probability FLOAT, 
	compliance_modifier FLOAT, 
	adjusted_risk FLOAT, 
	last_updated DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (student_id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE student_attendance (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	date DATE NOT NULL, 
	status VARCHAR(5) NOT NULL, 
	uploaded_by INTEGER, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT _student_attendance_date_uc UNIQUE (student_admission_number, date), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number), 
	FOREIGN KEY(uploaded_by) REFERENCES faculty (id)
);

CREATE TABLE student_marks (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	subject_code VARCHAR(50), 
	exam_type VARCHAR(50), 
	internal1 FLOAT, 
	internal2 FLOAT, 
	internal3 FLOAT, 
	university_mark FLOAT, 
	university_grade VARCHAR(10), 
	is_verified BOOLEAN, 
	is_locked BOOLEAN, 
	semester INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE study_preferences (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	preferred_study_time VARCHAR(20), 
	daily_hours FLOAT, 
	weekend_hours FLOAT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (student_id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE subject_perceptions (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	subject_name VARCHAR(100) NOT NULL, 
	difficulty_level INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE university_marks (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	semester_id INTEGER NOT NULL, 
	pdf_path VARCHAR(255) NOT NULL, 
	uploaded_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_university_sem UNIQUE (student_id, semester_id), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number), 
	FOREIGN KEY(semester_id) REFERENCES semesters (id)
);

CREATE TABLE weekly_study_plans (
	id INTEGER NOT NULL, 
	student_id VARCHAR(20) NOT NULL, 
	week_start DATE NOT NULL, 
	week_end DATE NOT NULL, 
	total_hours FLOAT NOT NULL, 
	booster_applied VARCHAR(50), 
	deterministic_risk FLOAT, 
	ml_probability FLOAT, 
	created_at DATETIME, 
	locked BOOLEAN, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_week_plan UNIQUE (student_id, week_start), 
	FOREIGN KEY(student_id) REFERENCES students (admission_number)
);

CREATE TABLE work_experiences (
	id INTEGER NOT NULL, 
	student_admission_number VARCHAR(20) NOT NULL, 
	organization VARCHAR(100), 
	job_title VARCHAR(100), 
	duration VARCHAR(50), 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_admission_number) REFERENCES students (admission_number)
);

CREATE TABLE intervention_outcomes (
	id INTEGER NOT NULL, 
	intervention_id INTEGER NOT NULL, 
	evaluated_week_start DATE NOT NULL, 
	initial_risk FLOAT NOT NULL, 
	subsequent_risk FLOAT NOT NULL, 
	delta FLOAT NOT NULL, 
	initial_compliance FLOAT, 
	subsequent_compliance FLOAT, 
	compliance_shift FLOAT, 
	outcome_label VARCHAR(20), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (intervention_id), 
	FOREIGN KEY(intervention_id) REFERENCES mentor_interventions (id)
);

CREATE TABLE study_plan_subjects (
	id INTEGER NOT NULL, 
	plan_id INTEGER NOT NULL, 
	subject_id INTEGER NOT NULL, 
	allocated_hours FLOAT NOT NULL, 
	weakness_score FLOAT NOT NULL, 
	priority VARCHAR(20), 
	PRIMARY KEY (id), 
	FOREIGN KEY(plan_id) REFERENCES weekly_study_plans (id), 
	FOREIGN KEY(subject_id) REFERENCES subjects (id)
);

CREATE TABLE study_session_logs (
	id INTEGER NOT NULL, 
	plan_subject_id INTEGER, 
	student_id VARCHAR(20), 
	subject_name VARCHAR(100), 
	date DATE NOT NULL, 
	hours_completed FLOAT, 
	status VARCHAR(20), 
	PRIMARY KEY (id), 
	FOREIGN KEY(plan_subject_id) REFERENCES study_plan_subjects (id)
);

