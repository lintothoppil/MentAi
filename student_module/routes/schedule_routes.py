"""
routes/schedule_routes.py
Schedule management endpoints
"""
from datetime import datetime, timedelta, date
from flask import Blueprint, request, jsonify, session
from models import db, Student, DailySchedule, UserScheduleSettings, CustomTimetable
from services.schedule_service import generate_schedule
from utils.decorators import login_required, role_required

schedule_bp = Blueprint('schedule_routes', __name__, url_prefix='/api/schedule')


@schedule_bp.route('/generate', methods=['POST'])
@login_required
@role_required('student')
def generate_schedule_endpoint():
    """Generate schedule for a specific date"""
    data = request.get_json(force=True) or {}
    student_id = session['user_id']
    
    # Parse date
    date_str = data.get('date')
    if date_str:
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except:
            date_obj = datetime.now().date()
    else:
        date_obj = datetime.now().date()
    
    # Get optional preferences override
    preferences = data.get('preferences')
    
    try:
        slots, day_type, day_name = generate_schedule(student_id, date_obj, preferences)
        
        # Save to database
        existing = DailySchedule.query.filter_by(
            student_id=student_id,
            date=date_obj
        ).first()
        
        if existing:
            existing.slots = slots
            existing.day_type = day_type
            existing.is_optimized = data.get('optimize', True)
            existing.generated_at = datetime.utcnow()
        else:
            new_schedule = DailySchedule(
                student_id=student_id,
                date=date_obj,
                day_type=day_type,
                slots=slots,
                is_optimized=data.get('optimize', True),
                generated_at=datetime.utcnow()
            )
            db.session.add(new_schedule)
        
        db.session.commit()
        
        return jsonify({
            'status': 'ok',
            'data': {
                'date': date_obj.isoformat(),
                'day_type': day_type,
                'day_name': day_name,
                'slots': slots,
                'total_slots': len(slots),
                'completed_slots': 0
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@schedule_bp.route('/today', methods=['GET'])
@login_required
@role_required('student')
def get_today_schedule():
    """Get today's schedule"""
    student_id = session['user_id']
    today = datetime.now().date()
    
    # Try to fetch from database
    schedule = DailySchedule.query.filter_by(
        student_id=student_id,
        date=today
    ).first()
    
    if schedule:
        # Update completion status based on current time
        current_time = datetime.now().strftime('%H:%M')
        completed_count = 0
        
        for slot in schedule.slots:
            # Auto-mark past slots as completed (can be overridden by user)
            if slot.get('time') < current_time and not slot.get('user_completed'):
                slot['completed'] = True
                completed_count += 1
            elif slot.get('user_completed'):
                slot['completed'] = True
                completed_count += 1
        
        db.session.commit()
        
        return jsonify({
            'status': 'ok',
            'data': {
                'date': today.isoformat(),
                'day_type': schedule.day_type,
                'day_name': today.strftime('%A'),
                'slots': schedule.slots,
                'total_slots': len(schedule.slots),
                'completed_slots': completed_count,
                'generated_at': schedule.generated_at.isoformat() if schedule.generated_at else None
            }
        }), 200
    else:
        # Auto-generate if not found
        try:
            slots, day_type, day_name = generate_schedule(student_id, today)
            
            new_schedule = DailySchedule(
                student_id=student_id,
                date=today,
                day_type=day_type,
                slots=slots,
                generated_at=datetime.utcnow()
            )
            db.session.add(new_schedule)
            db.session.commit()
            
            return jsonify({
                'status': 'ok',
                'data': {
                    'date': today.isoformat(),
                    'day_type': day_type,
                    'day_name': day_name,
                    'slots': slots,
                    'total_slots': len(slots),
                    'completed_slots': 0
                }
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500


@schedule_bp.route('/week', methods=['GET'])
@login_required
@role_required('student')
def get_week_schedule():
    """Get full week schedule (Mon-Sun)"""
    student_id = session['user_id']
    today = datetime.now().date()
    
    # Get start of week (Monday)
    start_of_week = today - timedelta(days=today.weekday())
    
    week_schedules = []
    
    for i in range(7):
        day_date = start_of_week + timedelta(days=i)
        
        schedule = DailySchedule.query.filter_by(
            student_id=student_id,
            date=day_date
        ).first()
        
        if schedule:
            week_schedules.append({
                'date': day_date.isoformat(),
                'day_name': day_date.strftime('%A'),
                'day_type': schedule.day_type,
                'slots': schedule.slots,
                'total_slots': len(schedule.slots)
            })
        else:
            week_schedules.append({
                'date': day_date.isoformat(),
                'day_name': day_date.strftime('%A'),
                'day_type': 'weekend' if day_date.weekday() >= 5 else 'weekday',
                'slots': [],
                'total_slots': 0
            })
    
    return jsonify({
        'status': 'ok',
        'data': {
            'week_start': start_of_week.isoformat(),
            'schedules': week_schedules
        }
    }), 200


@schedule_bp.route('/slot/<int:slot_index>', methods=['PATCH'])
@login_required
@role_required('student')
def update_slot_status(slot_index):
    """Mark a slot as completed or not completed"""
    data = request.get_json(force=True) or {}
    student_id = session['user_id']
    today = datetime.now().date()
    
    schedule = DailySchedule.query.filter_by(
        student_id=student_id,
        date=today
    ).first_or_404()
    
    if 0 <= slot_index < len(schedule.slots):
        schedule.slots[slot_index]['user_completed'] = data.get('completed', False)
        schedule.slots[slot_index]['completed'] = data.get('completed', False)
        
        db.session.commit()
        
        return jsonify({
            'status': 'ok',
            'message': 'Slot status updated'
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': 'Invalid slot index'
        }), 400


@schedule_bp.route('/settings', methods=['GET'])
@login_required
@role_required('student')
def get_settings():
    """Get user's schedule settings"""
    student_id = session['user_id']
    
    settings = UserScheduleSettings.query.filter_by(student_id=student_id).first()
    
    if not settings:
        # Create default settings
        settings = UserScheduleSettings(student_id=student_id)
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({
        'status': 'ok',
        'data': {
            'wake_time': settings.wake_time,
            'sleep_time': settings.sleep_time,
            'leave_home_time': settings.leave_home_time,
            'arrive_home_time': settings.arrive_home_time,
            'city': settings.city,
            'country': settings.country,
            'religion': settings.religion,
            'gym_enabled': settings.gym_enabled,
            'gym_time_pref': settings.gym_time_pref,
            'gym_duration': settings.gym_duration,
            'play_duration': settings.play_duration,
            'eca_details': settings.eca_details,
            'study_block_length': settings.study_block_length,
            'break_duration': settings.break_duration,
            'priority_subjects': settings.priority_subjects,
            'auto_optimize': settings.auto_optimize,
            'college_start_time': settings.college_start_time,
            'college_end_time': settings.college_end_time
        }
    }), 200


@schedule_bp.route('/settings', methods=['POST'])
@login_required
@role_required('student')
def save_settings():
    """Save/update user's schedule settings"""
    data = request.get_json(force=True) or {}
    student_id = session['user_id']
    
    settings = UserScheduleSettings.query.filter_by(student_id=student_id).first()
    
    if not settings:
        settings = UserScheduleSettings(student_id=student_id)
        db.session.add(settings)
    
    # Update settings
    settings.wake_time = data.get('wake_time', settings.wake_time)
    settings.sleep_time = data.get('sleep_time', settings.sleep_time)
    settings.leave_home_time = data.get('leave_home_time', settings.leave_home_time)
    settings.arrive_home_time = data.get('arrive_home_time', settings.arrive_home_time)
    settings.city = data.get('city', settings.city)
    settings.country = data.get('country', settings.country)
    settings.religion = data.get('religion', settings.religion)
    settings.gym_enabled = data.get('gym_enabled', settings.gym_enabled)
    settings.gym_time_pref = data.get('gym_time_pref', settings.gym_time_pref)
    settings.gym_duration = data.get('gym_duration', settings.gym_duration)
    settings.play_duration = data.get('play_duration', settings.play_duration)
    settings.eca_details = data.get('eca_details', settings.eca_details)
    settings.study_block_length = data.get('study_block_length', settings.study_block_length)
    settings.break_duration = data.get('break_duration', settings.break_duration)
    settings.priority_subjects = data.get('priority_subjects', settings.priority_subjects)
    settings.auto_optimize = data.get('auto_optimize', settings.auto_optimize)
    settings.college_start_time = data.get('college_start_time', settings.college_start_time)
    settings.college_end_time = data.get('college_end_time', settings.college_end_time)
    
    db.session.commit()
    
    # Auto-regenerate today's schedule with new settings
    try:
        from services.schedule_service import generate_schedule
        today = datetime.now().date()
        slots, day_type, day_name = generate_schedule(student_id, today)
        
        existing = DailySchedule.query.filter_by(
            student_id=student_id,
            date=today
        ).first()
        
        if existing:
            existing.slots = slots
            existing.day_type = day_type
            existing.generated_at = datetime.utcnow()
        else:
            new_schedule = DailySchedule(
                student_id=student_id,
                date=today,
                day_type=day_type,
                slots=slots,
                generated_at=datetime.utcnow()
            )
            db.session.add(new_schedule)
        
        db.session.commit()
    except Exception as e:
        print(f"Error regenerating schedule after settings update: {e}")
    
    return jsonify({
        'status': 'ok',
        'message': 'Settings saved successfully'
    }), 200


@schedule_bp.route('/timetable', methods=['POST'])
@login_required
@role_required('student')
def save_custom_timetable():
    """Save manual timetable entries"""
    data = request.get_json(force=True) or {}
    student_id = session['user_id']
    entries = data.get('entries', [])
    
    if not entries:
        return jsonify({
            'status': 'error',
            'message': 'No entries provided'
        }), 400
    
    try:
        # Delete existing custom timetable for this student
        CustomTimetable.query.filter_by(student_id=student_id).delete()
        
        # Add new entries
        for entry in entries:
            custom_entry = CustomTimetable(
                student_id=student_id,
                day_of_week=entry['day_of_week'],
                period_number=entry['period_number'],
                subject_name=entry['subject_name'],
                start_time=entry.get('start_time'),
                end_time=entry.get('end_time')
            )
            db.session.add(custom_entry)
        
        db.session.commit()
        
        return jsonify({
            'status': 'ok',
            'message': 'Timetable saved successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@schedule_bp.route('/timetable', methods=['GET'])
@login_required
@role_required('student')
def get_custom_timetable():
    """Get user's custom timetable"""
    student_id = session['user_id']
    
    entries = CustomTimetable.query.filter_by(student_id=student_id).order_by(
        CustomTimetable.day_of_week,
        CustomTimetable.period_number
    ).all()
    
    timetable = {}
    for entry in entries:
        if entry.day_of_week not in timetable:
            timetable[entry.day_of_week] = []
        
        timetable[entry.day_of_week].append({
            'period_number': entry.period_number,
            'subject_name': entry.subject_name,
            'start_time': entry.start_time,
            'end_time': entry.end_time
        })
    
    return jsonify({
        'status': 'ok',
        'data': timetable
    }), 200
