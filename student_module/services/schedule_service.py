"""
services/schedule_service.py
Schedule generation logic and prayer time fetching
"""
import requests
from datetime import datetime, timedelta, date
from models import db, Student, Timetable, CustomTimetable, DailySchedule, UserScheduleSettings
from sqlalchemy import text

# Fallback prayer times for major Indian cities (if API fails)
FALLBACK_PRAYER_TIMES = {
    'Kochi': {'fajr': '05:15', 'dhuhr': '12:30', 'asr': '15:45', 'maghrib': '18:45', 'isha': '20:00'},
    'Delhi': {'fajr': '05:00', 'dhuhr': '12:15', 'asr': '15:30', 'maghrib': '18:30', 'isha': '19:45'},
    'Mumbai': {'fajr': '05:20', 'dhuhr': '12:45', 'asr': '16:00', 'maghrib': '19:00', 'isha': '20:15'},
    'Bangalore': {'fajr': '05:10', 'dhuhr': '12:25', 'asr': '15:40', 'maghrib': '18:40', 'isha': '19:55'},
    'Chennai': {'fajr': '05:05', 'dhuhr': '12:20', 'asr': '15:35', 'maghrib': '18:35', 'isha': '19:50'},
    'default': {'fajr': '05:15', 'dhuhr': '12:30', 'asr': '15:45', 'maghrib': '18:45', 'isha': '20:00'}
}


def fetch_prayer_times(city, country, date_str=None):
    """
    Fetch prayer times from Aladhan API
    Returns dict with prayer times or fallback values
    """
    if not date_str:
        date_str = datetime.now().strftime('%d-%m-%Y')
    
    try:
        url = f"https://api.aladhan.com/v1/timingsByCity/{date_str}"
        params = {
            'city': city,
            'country': country,
            'method': 2  # University of Islamic Sciences, Karachi
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            timings = data['data']['timings']
            
            return {
                'fajr': timings['Fajr'],
                'dhuhr': timings['Dhuhr'],
                'asr': timings['Asr'],
                'maghrib': timings['Maghrib'],
                'isha': timings['Isha']
            }
    except Exception as e:
        print(f"Error fetching prayer times: {e}")
    
    # Return fallback times
    return FALLBACK_PRAYER_TIMES.get(city, FALLBACK_PRAYER_TIMES['default'])


def get_timetable_for_day(student_id, day_name):
    """
    Get timetable subjects for a specific day
    First checks custom timetable, then falls back to uploaded timetable
    """
    subjects = []
    
    # Try custom timetable first
    custom_entries = CustomTimetable.query.filter_by(
        student_id=student_id,
        day_of_week=day_name
    ).order_by(CustomTimetable.period_number).all()
    
    if custom_entries:
        subjects = [entry.subject_name for entry in custom_entries]
        return subjects
    
    # Fallback to uploaded timetable
    student = Student.query.get(student_id)
    if student and student.batch_id:
        # Get day mapping
        day_mapping = {
            'Monday': 'Monday',
            'Tuesday': 'Tuesday',
            'Wednesday': 'Wednesday',
            'Thursday': 'Thursday',
            'Friday': 'Friday',
            'Saturday': 'Saturday',
            'Sunday': None
        }
        
        timetable_day = day_mapping.get(day_name)
        if timetable_day:
            timetable_entries = Timetable.query.filter_by(
                batch_id=student.batch_id,
                day=timetable_day
            ).order_by(Timetable.period).all()
            
            subjects = [entry.subject for entry in timetable_entries if entry.subject]
    
    return subjects


def parse_time(time_str):
    """Parse time string (HH:MM) to datetime object"""
    try:
        return datetime.strptime(time_str, '%H:%M')
    except:
        return None


def format_time(dt):
    """Format datetime to HH:MM string"""
    return dt.strftime('%H:%M')


def add_minutes(time_str, minutes):
    """Add minutes to time string and return new time string"""
    dt = parse_time(time_str)
    if dt:
        new_dt = dt + timedelta(minutes=minutes)
        return format_time(new_dt)
    return time_str


def time_to_minutes(time_str):
    """Convert HH:MM to minutes from midnight"""
    dt = parse_time(time_str)
    if dt:
        return dt.hour * 60 + dt.minute
    return 0


def generate_schedule(student_id, date_obj=None, preferences=None):
    """
    Main schedule generation algorithm
    Returns list of time slot dicts
    """
    if not date_obj:
        date_obj = datetime.now().date()
    
    # Get student settings
    settings = UserScheduleSettings.query.filter_by(student_id=student_id).first()
    
    if not settings:
        # Create default settings
        settings = UserScheduleSettings(student_id=student_id)
        db.session.add(settings)
        db.session.commit()
    
    # Use preferences if provided, else use settings
    prefs = preferences or {
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
    
    # Determine day type
    day_name = date_obj.strftime('%A')
    is_weekend = day_name in ['Saturday', 'Sunday']
    day_type = 'weekend' if is_weekend else 'weekday'
    
    # Get prayer times
    date_str = date_obj.strftime('%d-%m-%Y')
    prayer_times = fetch_prayer_times(prefs['city'], prefs['country'], date_str)
    
    # Initialize slots list
    slots = []
    current_time = prefs['wake_time']
    wake_time_dt = parse_time(prefs['wake_time'])
    sleep_time_dt = parse_time(prefs['sleep_time'])
    
    # Helper to add slot
    def add_slot(time, label, slot_type, duration, icon='circle'):
        slots.append({
            'time': time,
            'label': label,
            'type': slot_type,
            'duration': duration,
            'completed': False,
            'icon': icon
        })
        return add_minutes(time, duration)
    
    # PRIORITY 1: Wake up routine
    current_time = add_slot(current_time, 'Wake up & freshen up', 'routine', 15, 'sunrise')
    
    # PRIORITY 1: Prayer times (religion-specific)
    religion = prefs['religion']
    
    if religion == 'Muslim':
        # All 5 prayers
        for prayer_name, prayer_time in prayer_times.items():
            prayer_labels = {
                'fajr': 'Fajr prayer',
                'dhuhr': 'Dhuhr prayer',
                'asr': 'Asr prayer',
                'maghrib': 'Maghrib prayer',
                'isha': 'Isha prayer'
            }
            
            # Only add prayer if it's after wake time and before sleep time
            if time_to_minutes(prayer_time) > time_to_minutes(prefs['wake_time']) and \
               time_to_minutes(prayer_time) < time_to_minutes(prefs['sleep_time']):
                current_time = add_slot(prayer_time, prayer_labels[prayer_name], 'prayer', 15, 'moon')
    
    elif religion == 'Hindu':
        # Morning puja after wake-up
        current_time = add_slot(current_time, 'Morning puja', 'prayer', 15, 'sun')
        # Evening aarti around 6:30 PM
        current_time = add_slot('18:30', 'Evening aarti', 'prayer', 10, 'sunset')
    
    elif religion == 'Christian':
        # Morning prayer after wake-up
        current_time = add_slot(current_time, 'Morning prayer', 'prayer', 10, 'sun')
        # Evening prayer around 7:00 PM
        current_time = add_slot('19:00', 'Evening prayer', 'prayer', 10, 'sunset')
    
    # PRIORITY 3: Breakfast
    current_time = add_slot(current_time, 'Breakfast', 'meal', 30, 'coffee')
    
    # PRIORITY 4: Gym (if enabled and morning preference)
    if prefs['gym_enabled'] and prefs['gym_time_pref'] == 'Morning' and not is_weekend:
        current_time = add_slot(current_time, 'Gym workout', 'gym', prefs['gym_duration'], 'dumbbell')
    
    # PRIORITY 2: College block (weekdays only)
    if not is_weekend:
        college_subjects = get_timetable_for_day(student_id, day_name)
        
        # Leave home
        current_time = prefs['leave_home_time']
        current_time = add_slot(current_time, 'Travel to college', 'routine', 
                               time_to_minutes(prefs['college_start_time']) - time_to_minutes(prefs['leave_home_time']), 
                               'car')
        
        # College hours
        if college_subjects:
            # Split college time into periods based on subjects
            college_duration = time_to_minutes(prefs['college_end_time']) - time_to_minutes(prefs['college_start_time'])
            period_duration = college_duration // len(college_subjects)
            
            period_start = prefs['college_start_time']
            for i, subject in enumerate(college_subjects):
                period_label = f"College - {subject}"
                period_end = add_minutes(period_start, period_duration)
                
                slots.append({
                    'time': period_start,
                    'label': period_label,
                    'type': 'college',
                    'duration': period_duration,
                    'completed': False,
                    'icon': 'book'
                })
                
                period_start = period_end
        else:
            # No subjects, just block college time
            college_duration = time_to_minutes(prefs['college_end_time']) - time_to_minutes(prefs['college_start_time'])
            current_time = add_slot(prefs['college_start_time'], 'College hours', 'college', college_duration, 'book')
        
        # Return home
        current_time = prefs['arrive_home_time']
        current_time = add_slot(current_time, 'Travel back home', 'routine', 30, 'car')
        current_time = add_slot(current_time, 'Rest & refresh', 'routine', 30, 'rest')
    
    # PRIORITY 3: Lunch
    if time_to_minutes(current_time) <= time_to_minutes('12:30'):
        current_time = '12:30'
    current_time = add_slot(current_time, 'Lunch', 'meal', 60, 'utensils')
    
    # PRIORITY 4: Gym (if enabled and evening preference)
    if prefs['gym_enabled'] and prefs['gym_time_pref'] == 'Evening':
        current_time = add_slot(current_time, 'Gym workout', 'gym', prefs['gym_duration'], 'dumbbell')
    
    # PRIORITY 5: ECA activities
    day_abbrev = day_name[:3]  # Mon, Tue, etc.
    eca_details = prefs.get('eca_details', [])
    
    for eca in eca_details:
        if day_abbrev in eca.get('days', []) or day_name in eca.get('days', []):
            current_time = add_slot(current_time, f"ECA - {eca['name']}", 'eca', 
                                   eca.get('duration', 60), 'music')
    
    # PRIORITY 6: Play/Recreation
    current_time = add_slot(current_time, 'Play / Recreation', 'play', prefs['play_duration'], 'trophy')
    
    # PRIORITY 3: Dinner
    if time_to_minutes(current_time) <= time_to_minutes('19:30'):
        current_time = '19:30'
    current_time = add_slot(current_time, 'Dinner', 'meal', 60, 'utensils')
    
    # PRIORITY 7: Study sessions (fill remaining time)
    study_block = prefs['study_block_length']
    break_duration = prefs['break_duration']
    priority_subjects = prefs.get('priority_subjects', [])
    
    # Get subjects for study
    if is_weekend:
        # Weekend: prioritize priority_subjects, then add general revision
        study_subjects = priority_subjects[:3] if priority_subjects else ['Revision', 'Practice']
    else:
        # Weekday: study today's college subjects
        study_subjects = get_timetable_for_day(student_id, day_name)
        if not study_subjects:
            study_subjects = priority_subjects[:2] if priority_subjects else ['Revision']
    
    # Add study blocks
    while time_to_minutes(current_time) + study_block <= time_to_minutes(prefs['sleep_time']) - 60:
        for subject in study_subjects:
            if time_to_minutes(current_time) + study_block > time_to_minutes(prefs['sleep_time']) - 60:
                break
            
            current_time = add_slot(current_time, f"Study - {subject}", 'study', study_block, 'book-open')
            
            # Add break if there's time
            if time_to_minutes(current_time) + break_duration <= time_to_minutes(prefs['sleep_time']) - 60:
                current_time = add_slot(current_time, 'Break', 'break', break_duration, 'coffee')
    
    # PRIORITY 8: Free time / Wind down
    if time_to_minutes(current_time) < time_to_minutes(prefs['sleep_time']) - 30:
        free_duration = time_to_minutes(prefs['sleep_time']) - time_to_minutes(current_time) - 30
        if free_duration > 0:
            current_time = add_slot(current_time, 'Free time / Relaxation', 'free', free_duration, 'smile')
    
    # Sleep
    current_time = add_slot(prefs['sleep_time'], 'Sleep', 'sleep', 480, 'moon')  # 8 hours
    
    # Sort slots by time
    slots.sort(key=lambda x: time_to_minutes(x['time']))
    
    # If auto_optimize is ON, reorder for productivity
    if prefs.get('auto_optimize', True):
        slots = optimize_schedule(slots, prefs)
    
    return slots, day_type, day_name


def optimize_schedule(slots, prefs):
    """
    Optimize schedule order for better productivity
    - Hard subjects in morning (high energy)
    - Easy subjects after lunch
    - Physical activities when energy dips
    """
    # Simple optimization: ensure study blocks are well-distributed
    # This is a basic implementation - can be enhanced with AI
    
    study_slots = [s for s in slots if s['type'] == 'study']
    other_slots = [s for s in slots if s['type'] != 'study']
    
    # Keep current order for now (already logically ordered)
    # Future enhancement: Use ML to predict best study times
    return slots


def regenerate_all_schedules():
    """
    Regenerate schedules for all active students
    Called by APScheduler daily at 6:00 AM
    """
    from app import app
    
    with app.app_context():
        active_students = Student.query.filter_by(status='Live').all()
        today = datetime.now().date()
        
        for student in active_students:
            try:
                slots, day_type, day_name = generate_schedule(student.admission_number, today)
                
                # Save to database
                existing = DailySchedule.query.filter_by(
                    student_id=student.admission_number,
                    date=today
                ).first()
                
                if existing:
                    existing.slots = slots
                    existing.day_type = day_type
                    existing.generated_at = datetime.utcnow()
                else:
                    new_schedule = DailySchedule(
                        student_id=student.admission_number,
                        date=today,
                        day_type=day_type,
                        slots=slots,
                        generated_at=datetime.utcnow()
                    )
                    db.session.add(new_schedule)
                
                db.session.commit()
            except Exception as e:
                print(f"Error regenerating schedule for student {student.admission_number}: {e}")
                db.session.rollback()
