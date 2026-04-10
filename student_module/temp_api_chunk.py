
@app.route('/api/complete_profile', methods=['POST'])
def api_complete_profile():
    try:
        data = request.get_json()
        admission_number = data.get('admission_number')
        
        if not admission_number:
            return jsonify({'success': False, 'message': 'Admission number required'}), 400
            
        student = Student.query.get(admission_number)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        # Personal Details
        student.roll_number = data.get('roll_number')
        student.dob = datetime.strptime(data.get('dob'), '%Y-%m-%d').date() if data.get('dob') else None
        student.age = data.get('age')
        student.blood_group = data.get('blood_group')
        student.religion = data.get('religion')
        student.diocese = data.get('diocese')
        student.parish = data.get('parish')
        student.caste_category = data.get('caste_category')
        student.permanent_address = data.get('permanent_address')
        student.contact_address = data.get('contact_address')
        student.mobile_number = data.get('mobile_number')
        
        # Parent Details
        parent = Parent.query.filter_by(student_admission_number=admission_number).first()
        if not parent:
            parent = Parent(student_admission_number=admission_number)
            
        parent_data = data.get('parents', {})
        parent.father_name = parent_data.get('father_name')
        parent.father_profession = parent_data.get('father_profession')
        parent.father_place_of_work = parent_data.get('father_place_of_work')
        parent.father_mobile = parent_data.get('father_mobile')
        parent.mother_name = parent_data.get('mother_name')
        parent.mother_profession = parent_data.get('mother_profession')
        parent.mother_place_of_work = parent_data.get('mother_place_of_work')
        parent.mother_mobile = parent_data.get('mother_mobile')
        
        # Guardian Details
        guardian_data = data.get('guardian')
        if guardian_data:
            guardian = Guardian.query.filter_by(student_admission_number=admission_number).first()
            if not guardian:
                guardian = Guardian(student_admission_number=admission_number)
            guardian.name = guardian_data.get('name')
            guardian.address = guardian_data.get('address')
            guardian.mobile_number = guardian_data.get('mobile_number')
            db.session.add(guardian)

        # Academic Details
        acad = Academic.query.filter_by(student_admission_number=admission_number).first()
        if not acad:
            acad = Academic(student_admission_number=admission_number)
            
        acad_data = data.get('academics', {})
        acad.school_10th = acad_data.get('school_10th')
        acad.board_10th = acad_data.get('board_10th')
        acad.percentage_10th = acad_data.get('percentage_10th')
        acad.school_12th = acad_data.get('school_12th')
        acad.board_12th = acad_data.get('board_12th')
        acad.percentage_12th = acad_data.get('percentage_12th')
        acad.entrance_rank = acad_data.get('entrance_rank')
        acad.nature_of_admission = acad_data.get('nature_of_admission')
        if acad_data.get('college_ug'):
             acad.college_ug = acad_data.get('college_ug')
             acad.university_ug = acad_data.get('university_ug')
             acad.percentage_ug = acad_data.get('percentage_ug')
        
        # Work Experience
        WorkExperience.query.filter_by(student_admission_number=admission_number).delete()
        for work in data.get('work_experience', []):
            new_work = WorkExperience(
                student_admission_number=admission_number,
                organization=work.get('organization'),
                job_title=work.get('job_title'),
                duration=work.get('duration')
            )
            db.session.add(new_work)

        # Other Info
        other = OtherInfo.query.filter_by(student_admission_number=admission_number).first()
        if not other:
            other = OtherInfo(student_admission_number=admission_number)
            
        other_data = data.get('other_info', {})
        other.accommodation_type = other_data.get('accommodation_type')
        other.staying_with = other_data.get('staying_with')
        other.hostel_name = other_data.get('hostel_name')
        if other_data.get('stay_from'):
             other.stay_from = datetime.strptime(other_data.get('stay_from'), '%Y-%m-%d').date()
        if other_data.get('stay_to'):
             other.stay_to = datetime.strptime(other_data.get('stay_to'), '%Y-%m-%d').date()
             
        other.transport_mode = other_data.get('transport_mode')
        other.vehicle_number = other_data.get('vehicle_number')

        student.profile_completed = True
        
        db.session.add(parent)
        db.session.add(acad)
        db.session.add(other)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
