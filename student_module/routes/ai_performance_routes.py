"""
AI Performance Analysis & Remedial Class System
Provides AI-driven student performance analysis, remedial class scheduling,
and comprehensive reporting for mentors and subject handlers.
"""

from flask import Blueprint, request, jsonify, session
from models import db, Student, StudentAnalytics, SubjectHandlerMark, SubjectHandlerAttendance
from models import RemedialClass, AIPerformanceReport, RemedialNotification, Faculty, MentoringSession, Alert, MentorIntervention
from datetime import datetime
from functools import wraps
from collections import Counter, defaultdict
import json

ai_performance_bp = Blueprint('ai_performance', __name__)


def role_required(*roles):
    """Decorator to check if user has required role."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            requested_role = request.args.get('user_role') or request.headers.get('X-User-Role')
            session_role = session.get('user_role') or session.get('role')
            session_roles = session.get('user_roles') or session.get('allowed_roles') or []

            allowed_session_roles = set()
            if isinstance(session_roles, (list, tuple, set)):
                allowed_session_roles.update(
                    str(role).strip().lower().replace('_', '-') for role in session_roles if role
                )

            if session_role:
                allowed_session_roles.add(str(session_role).strip().lower().replace('_', '-'))

            normalized_requested = str(requested_role or '').strip().lower().replace('_', '-')
            normalized_allowed = {str(role).strip().lower().replace('_', '-') for role in roles}

            if normalized_requested and normalized_requested not in normalized_allowed:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403

            if normalized_requested:
                if allowed_session_roles and normalized_requested not in allowed_session_roles:
                    return jsonify({'success': False, 'message': 'Unauthorized'}), 403
            elif not (allowed_session_roles & normalized_allowed):
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def _get_ai_provider():
    """Get AI provider (imported from main app)."""
    try:
        import os
        openai_key = os.getenv('OPENAI_API_KEY', '')
        if openai_key:
            return 'openai', {'api_key': openai_key}

        groq_key = os.getenv('GROQ_API_KEY', '')
        if groq_key:
            return 'groq', {'api_key': groq_key}

        return None, None
    except:
        return None, None


def _groq_complete(ai_client, model, system_prompt, user_prompt, max_tokens=800):
    """Call Groq API."""
    import requests
    
    key = ai_client.get('api_key')
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json={
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7
        },
        timeout=15
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _openai_complete(ai_client, model, system_prompt, user_prompt, max_tokens=800):
    """Call OpenAI-compatible chat completions API."""
    import requests

    key = ai_client.get('api_key')
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json={
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
        },
        timeout=20
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _complete_with_ai(provider, ai_client, system_prompt, user_prompt, max_tokens=800):
    if provider == 'openai':
        return _openai_complete(ai_client, 'gpt-4o-mini', system_prompt, user_prompt, max_tokens=max_tokens)
    if provider == 'groq':
        return _groq_complete(ai_client, 'llama-3.3-70b-versatile', system_prompt, user_prompt, max_tokens=max_tokens)
    raise RuntimeError('No AI provider configured')


def _status_label(raw_status, adjusted_risk):
    status = str(raw_status or '').strip().lower()
    if status in {'improving', 'stable', 'declining'}:
        return status
    risk = float(adjusted_risk or 0)
    if risk >= 60:
        return 'declining'
    if risk <= 30:
        return 'improving'
    return 'stable'


def _risk_band(score):
    score = float(score or 0)
    if score >= 80:
        return 'High'
    if score >= 50:
        return 'Medium'
    return 'Low'


def _normalize_subject_code(value):
    raw = str(value or '').strip()
    if not raw:
        return ''
    return raw.split(' - ', 1)[0].strip().upper()


def _subject_display_label(value):
    raw = str(value or '').strip()
    normalized = _normalize_subject_code(raw)
    return raw or normalized


# Module-level subject name cache so DB is only queried once per code per worker
_subject_name_cache: dict = {}

def _get_subject_name(code: str) -> str:
    """Resolve a subject code like IMCA501 to its full name like 'Python for Data Science (IMCA501)'.
    Looks up the Subject table (name format: '{CODE} - {Full Name} ({Branch})') and caches results.
    Falls back to the raw code if nothing is found.
    """
    if not code:
        return code
    code = str(code).strip().upper()
    if code in _subject_name_cache:
        return _subject_name_cache[code]
    try:
        from models import Subject
        row = Subject.query.filter(Subject.name.ilike(f"{code} - %")).first()
        if row:
            # Format: 'IMCA501 - Python for Data Science (MCA)'
            parts = row.name.split(' - ', 1)
            if len(parts) > 1:
                # Strip branch suffix like '(MCA)', '(CSE)' from the end
                name_part = parts[1].rsplit(' (', 1)[0].strip()
                result = f"{name_part} ({code})"
                _subject_name_cache[code] = result
                return result
    except Exception:
        pass
    _subject_name_cache[code] = code
    return code


def _bounded_percentage(marks_obtained, max_marks):
    maximum = float(max_marks or 0)
    if maximum <= 0:
        return 0.0
    obtained = max(0.0, min(float(marks_obtained or 0), maximum))
    return round((obtained / maximum) * 100.0, 2)


def _student_scope_filter(students, department=None, batch=None):
    filtered = []
    for student in students:
        if department and str(student.branch or '').strip() != str(department).strip():
            continue
        if batch and str(student.batch or '').strip() != str(batch).strip():
            continue
        filtered.append(student)
    return filtered


def _student_subject_snapshot(student, subject_code, analytics_map, marks_map, attendance_map):
    sid = student.admission_number
    analytics = analytics_map.get(sid)
    marks_rows = marks_map.get(sid, [])
    attendance_rows = attendance_map.get(sid, [])

    subject_scores = []
    failed_assessments = 0
    for row in marks_rows:
        score = _bounded_percentage(row.marks_obtained, row.max_marks)
        subject_scores.append(score)
        if score < 40:
            failed_assessments += 1

    avg_marks = round(sum(subject_scores) / len(subject_scores), 2) if subject_scores else 0.0
    total_attendance = len(attendance_rows)
    present_count = sum(1 for row in attendance_rows if str(row.status or '').lower() == 'present')
    attendance_pct = round((present_count / total_attendance) * 100.0, 2) if total_attendance else 0.0
    adjusted_risk = float(analytics.adjusted_risk if analytics and analytics.adjusted_risk is not None else (analytics.risk_score if analytics else 0.0))
    performance_status = _status_label(analytics.status if analytics else None, adjusted_risk)

    weak_areas = []
    if avg_marks < 40:
        weak_areas.append('Low marks')
    elif avg_marks < 55:
        weak_areas.append('Average marks below target')

    if attendance_pct and attendance_pct < 75:
        weak_areas.append('Low attendance')

    if failed_assessments > 0:
        weak_areas.append('Repeated assessment failures')

    if performance_status == 'declining':
        weak_areas.append('Declining trend')

    if not weak_areas and performance_status != 'improving':
        weak_areas.append('Needs monitoring')

    recommendations = []
    if 'Low marks' in weak_areas or 'Repeated assessment failures' in weak_areas:
        recommendations.append('Run concept-by-concept remedial sessions with worked examples')
    if 'Low attendance' in weak_areas:
        recommendations.append('Track attendance weekly and speak with the student about barriers')
    if 'Declining trend' in weak_areas:
        recommendations.append('Give short weekly checkpoint quizzes and follow-up review')
    if avg_marks >= 55 and attendance_pct >= 75 and performance_status == 'stable':
        recommendations.append('Maintain progress with revision tasks and practice problems')

    return {
        'student_id': sid,
        'student_name': student.full_name,
        'batch': student.batch,
        'department': student.branch,
        'subject_code': subject_code,
        'subject_avg_marks': avg_marks,
        'subject_attendance_pct': attendance_pct,
        'failed_assessments': failed_assessments,
        'overall_risk': round(adjusted_risk, 2),
        'risk_band': _risk_band(adjusted_risk),
        'performance_status': performance_status,
        'weak_areas': weak_areas,
        'recommended_remedial': list(dict.fromkeys(recommendations)),
    }


def _build_subject_overview(subject_code, students, analytics_map, marks_map, attendance_map):
    student_rows = [
        _student_subject_snapshot(student, subject_code, analytics_map, marks_map, attendance_map)
        for student in students
    ]
    student_rows.sort(
        key=lambda row: (
            {'High': 0, 'Medium': 1, 'Low': 2}.get(row['risk_band'], 3),
            -row['failed_assessments'],
            row['subject_avg_marks'],
            row['subject_attendance_pct'],
        )
    )

    status_counter = Counter()
    stability_counter = Counter()
    risk_counter = Counter()
    weak_area_counter = Counter()
    recommendation_counter = Counter()

    for row in student_rows:
        status_counter[row['performance_status'].capitalize()] += 1
        stability_counter['Stable' if row['performance_status'] == 'stable' else 'Non-stable'] += 1
        risk_counter[row['risk_band']] += 1
        for area in row['weak_areas']:
            weak_area_counter[area] += 1
        for recommendation in row['recommended_remedial']:
            recommendation_counter[recommendation] += 1

    analyzed = len(student_rows)
    avg_marks = round(sum(row['subject_avg_marks'] for row in student_rows) / analyzed, 2) if analyzed else 0.0
    avg_attendance = round(sum(row['subject_attendance_pct'] for row in student_rows) / analyzed, 2) if analyzed else 0.0
    weak_students = [row for row in student_rows if row['risk_band'] != 'Low' or row['failed_assessments'] > 0][:12]

    overview = {
        'subject_code': subject_code,
        'subject_label': subject_code,
        'total_students': analyzed,
        'analyzed_students': analyzed,
        'avg_marks': avg_marks,
        'avg_attendance': avg_attendance,
        'status_distribution': [{'label': label, 'value': count} for label, count in status_counter.items()],
        'stability_distribution': [{'label': label, 'value': count} for label, count in stability_counter.items()],
        'risk_distribution': [{'label': label, 'value': count} for label, count in risk_counter.items()],
        'weak_area_distribution': [{'label': label, 'value': count} for label, count in weak_area_counter.most_common(6)],
        'weak_students': weak_students,
        'faculty_recommendations': [item for item, _count in recommendation_counter.most_common(6)],
        'remedial_methods': [item for item, _count in recommendation_counter.most_common(8)],
        'ai_summary': '',
    }

    return overview


def _rule_based_subject_summary(overview):
    weak_students = overview.get('weak_students', [])
    high_risk = [student for student in weak_students if student.get('risk_band') == 'High']
    weak_areas = overview.get('weak_area_distribution', [])
    top_area = weak_areas[0]['label'] if weak_areas else 'mixed performance issues'
    status_parts = ", ".join(f"{row['label']} {row['value']}" for row in overview.get('status_distribution', [])) or 'no status data'

    summary = (
        f"{overview.get('subject_code')} analysis shows {overview.get('analyzed_students', 0)} students evaluated. "
        f"Average marks are {overview.get('avg_marks', 0)}% and average attendance is {overview.get('avg_attendance', 0)}%. "
        f"Status distribution is {status_parts}. "
        f"The main weakness area is {top_area.lower()}. "
        f"{len(high_risk)} students need immediate faculty attention."
    )

    recommendations = list(overview.get('faculty_recommendations', []))
    if not recommendations:
        recommendations = [
            'Review the weakest topic cluster using short remedial drills',
            'Monitor attendance and missed assessments every week',
            'Group high-risk students for faculty-led recovery sessions',
        ]

    methods = list(overview.get('remedial_methods', []))
    if not methods:
        methods = [
            'Micro-remedial classes focused on failed topics',
            'Weekly checkpoint quizzes',
            'Peer-supported revision and past-question practice',
        ]

    return {
        'ai_summary': summary,
        'faculty_recommendations': recommendations,
        'remedial_methods': methods,
        'graph_summary': [
            f"Status chart: {status_parts}.",
            f"Risk chart: {len(high_risk)} high-risk learners need immediate intervention.",
            f"Weak-area chart: the strongest signal is {top_area.lower()}.",
        ],
    }


def _rule_based_analysis(context, marks_by_subject, attendance_by_subject):
    """Rule-based performance analysis when AI is not available."""
    strengths = []
    weaknesses = []
    recommendations = []
    mentor_action_items = []
    remedial_subjects = []
    subject_analysis = {}
    root_causes = []
    risk_factors = []

    for subject_code in sorted(set(list(marks_by_subject.keys()) + list(attendance_by_subject.keys()))):
        scores = marks_by_subject.get(subject_code, [])
        attendance = attendance_by_subject.get(subject_code, {'present': 0, 'total': 0})
        marks_avg = round(sum(scores) / len(scores), 1) if scores else None
        attendance_pct = round(attendance['present'] / attendance['total'] * 100, 1) if attendance['total'] > 0 else None

        subject = _get_subject_name(subject_code)

        status = 'average'
        summary_bits = []

        if marks_avg is not None:
            if marks_avg >= 75:
                strengths.append(f"{subject}: strong academic performance with an average of {marks_avg:.1f}%")
                status = 'good'
            elif marks_avg < 50:
                weaknesses.append(f"{subject}: marks are critically low at {marks_avg:.1f}%")
                remedial_subjects.append(subject)
                recommendations.append(f"Plan targeted remedial support in {subject} for weak concepts and revision.")
                mentor_action_items.append(f"Discuss the learning gaps in {subject} during the next mentoring review.")
                root_causes.append(f"{subject}: repeated low scores show unresolved concept gaps.")
                risk_factors.append(f"{subject}: current marks trend increases subject failure risk.")
                status = 'poor'
            else:
                recommendations.append(f"Provide focused practice in {subject} to push the average beyond 60%.")
            summary_bits.append(f"marks average {marks_avg:.1f}%")

        if attendance_pct is not None:
            if attendance_pct >= 85:
                strengths.append(f"{subject}: attendance is consistent at {attendance_pct:.1f}%")
            elif attendance_pct < 75:
                weaknesses.append(f"{subject}: attendance is below expectation at {attendance_pct:.1f}%")
                if subject not in remedial_subjects and (marks_avg is None or marks_avg < 60):
                    remedial_subjects.append(subject)
                recommendations.append(f"Improve attendance in {subject} and monitor class participation closely.")
                mentor_action_items.append(f"Check attendance barriers for {subject} and follow up with the student.")
                root_causes.append(f"{subject}: low attendance is reducing classroom continuity and revision time.")
                risk_factors.append(f"{subject}: missed classes make internal and remedial recovery slower.")
                status = 'poor' if status != 'poor' else status
            summary_bits.append(f"attendance {attendance_pct:.1f}%")

        if not summary_bits:
            summary_bits.append("limited academic data available")

        subject_analysis[subject] = {
            'marks_avg': marks_avg if marks_avg is not None else 0,
            'attendance_pct': attendance_pct if attendance_pct is not None else 0,
            'status': status,
            'summary': ', '.join(summary_bits),
        }

    risk_score = float(context.get('risk_score') or 0)
    trend_raw = str(context.get('performance_trend') or 'stable').strip().lower()
    if trend_raw not in {'improving', 'stable', 'declining'}:
        trend_raw = 'declining' if risk_score >= 60 else 'stable'

    if risk_score >= 60:
        risk_assessment = 'high'
    elif risk_score >= 30:
        risk_assessment = 'medium'
    else:
        risk_assessment = 'low'

    overall_attendance = float(context.get('overall_attendance') or 0)
    if overall_attendance >= 85:
        strengths.append(f"Overall attendance is healthy at {overall_attendance:.1f}%")
    elif overall_attendance and overall_attendance < 75:
        weaknesses.append(f"Overall attendance needs intervention at {overall_attendance:.1f}%")
        root_causes.append(f"Overall attendance at {overall_attendance:.1f}% is below the safe threshold.")
        risk_factors.append("Attendance below 75% puts both exam eligibility and performance stability at risk.")

    if risk_score >= 60:
        risk_factors.append(f"Adjusted risk score is {risk_score:.1f}, which places the student in a high-risk band.")
    elif risk_score >= 30:
        risk_factors.append(f"Adjusted risk score is {risk_score:.1f}, signalling medium risk that can worsen without follow-up.")

    if trend_raw == 'declining':
        root_causes.append("Recent performance trend is declining, so earlier strategies are not producing recovery yet.")
        risk_factors.append("A declining trend means the next assessment cycle could cause another drop or backlog.")

    if not strengths:
        strengths.append("The available records show consistent engagement in at least part of the monitored coursework.")
    if not weaknesses:
        weaknesses.append("No severe academic red flags were detected in the current dataset, but continued monitoring is advised.")
    if not root_causes:
        root_causes.append("No single root cause dominates the current data, so the student needs steady monitoring across marks and attendance.")
    if not risk_factors:
        risk_factors.append("Current risk is manageable, but continued tracking is needed to prevent a fresh decline.")

    if not recommendations:
        recommendations.append("Maintain the current study rhythm and review progress after the next assessment cycle.")

    if risk_assessment == 'high':
        mentor_action_items.extend([
            "Meet the student personally this week and agree on a recovery plan.",
            "Track attendance and assessment completion every week until the risk level improves.",
        ])
    elif risk_assessment == 'medium':
        mentor_action_items.extend([
            "Review the student's weekly study routine and missed submissions.",
            "Coordinate with subject staff on the weakest subject before the next internal exam.",
        ])
    else:
        mentor_action_items.append("Keep the student encouraged and review progress during the regular mentoring cycle.")

    mentor_action_items = list(dict.fromkeys(mentor_action_items))
    recommendations = list(dict.fromkeys(recommendations))
    remedial_subjects = list(dict.fromkeys(remedial_subjects))
    root_causes = list(dict.fromkeys(root_causes))
    risk_factors = list(dict.fromkeys(risk_factors))

    top_strength = strengths[0]
    top_risk = weaknesses[0]
    ai_insights = (
        f"{context['student_name']} from {context.get('department') or 'the department'} shows a {trend_raw} "
        f"performance pattern with a {risk_assessment} risk profile. {top_strength}. "
        f"The main concern right now is {top_risk.lower()}. "
        f"{'Immediate structured intervention is recommended.' if risk_assessment == 'high' else 'Close monitoring and focused support should help improve outcomes.'}"
    )
    root_cause_summary = " ".join(root_causes[:3])
    risk_summary = " ".join(risk_factors[:3])
    subject_handler_plan = [
        "Review the weakest subject evidence with the student and identify one concept gap that must be fixed first.",
        "Use the AI analysis plus API-backed insights to create a short weekly recovery sheet with daily practice targets.",
        "Run one focused remedial session, then measure progress with a quick checkpoint quiz within 3 to 5 days.",
        "Track attendance, submissions, and marks every week and update the plan immediately if risk stays flat or worsens.",
    ]
    detailed_summary = (
        f"Root cause summary: {root_cause_summary} "
        f"Risk summary: {risk_summary} "
        f"Recommended handler plan: {' '.join(subject_handler_plan[:2])}"
    )

    return {
        'performance_trend': trend_raw,
        'risk_assessment': risk_assessment,
        'strengths': strengths,
        'weaknesses': weaknesses,
        'root_causes': root_causes,
        'risk_factors': risk_factors,
        'root_cause_summary': root_cause_summary,
        'risk_summary': risk_summary,
        'subject_analysis': subject_analysis,
        'recommendations': recommendations,
        'remedial_needed': len(remedial_subjects) > 0,
        'remedial_subjects': remedial_subjects,
        'ai_insights': ai_insights,
        'mentor_action_items': mentor_action_items,
        'subject_handler_plan': subject_handler_plan,
        'detailed_summary': detailed_summary,
    }


def _normalize_analysis_payload(analysis_data, context):
    analysis_data = dict(analysis_data or {})
    risk_assessment = str(analysis_data.get('risk_assessment') or 'medium').strip().lower()
    if risk_assessment not in {'low', 'medium', 'high'}:
        risk_assessment = 'high' if float(context.get('risk_score') or 0) >= 60 else ('medium' if float(context.get('risk_score') or 0) >= 30 else 'low')
    analysis_data['risk_assessment'] = risk_assessment

    trend = str(analysis_data.get('performance_trend') or context.get('performance_trend') or 'stable').strip().lower()
    if trend not in {'improving', 'stable', 'declining'}:
        trend = 'stable'
    analysis_data['performance_trend'] = trend

    for key in ('strengths', 'weaknesses', 'recommendations', 'remedial_subjects', 'mentor_action_items', 'subject_handler_plan', 'root_causes', 'risk_factors'):
        value = analysis_data.get(key)
        if isinstance(value, list):
            analysis_data[key] = [str(item).strip() for item in value if str(item).strip()]
        elif value:
            analysis_data[key] = [str(value).strip()]
        else:
            analysis_data[key] = []

    if not analysis_data['root_causes']:
        analysis_data['root_causes'] = [
            "Low marks and attendance patterns suggest unresolved concept gaps in the selected subject.",
        ]
    if not analysis_data['risk_factors']:
        analysis_data['risk_factors'] = [
            f"Current {risk_assessment} risk profile needs continued monitoring.",
        ]

    analysis_data['root_cause_summary'] = str(
        analysis_data.get('root_cause_summary') or " ".join(analysis_data['root_causes'][:3])
    ).strip()
    analysis_data['risk_summary'] = str(
        analysis_data.get('risk_summary') or " ".join(analysis_data['risk_factors'][:3])
    ).strip()

    if not analysis_data['subject_handler_plan']:
        analysis_data['subject_handler_plan'] = [
            "Review the latest marks and attendance trend with the student.",
            "Use the AI engine output with a valid API key to refresh the recovery plan after each new assessment.",
            "Set a 1-week checkpoint and update remedial focus based on the next quiz result.",
        ]

    analysis_data['detailed_summary'] = str(
        analysis_data.get('detailed_summary')
        or f"Root cause: {analysis_data['root_cause_summary']} Risk: {analysis_data['risk_summary']} Handler plan: {' '.join(analysis_data['subject_handler_plan'][:2])}"
    ).strip()
    analysis_data['ai_insights'] = str(
        analysis_data.get('ai_insights') or analysis_data['detailed_summary'] or analysis_data['root_cause_summary']
    ).strip()

    analysis_data['api_key_status'] = 'configured' if _get_ai_provider()[0] else 'missing'
    return analysis_data


def _safe_float(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _mentor_student_monitoring_payload(student):
    analytics = StudentAnalytics.query.filter_by(student_id=student.admission_number).first()
    remedials = RemedialClass.query.filter_by(student_id=student.admission_number).order_by(RemedialClass.scheduled_date.desc()).all()
    sessions = MentoringSession.query.filter_by(student_admission_number=student.admission_number).order_by(MentoringSession.date.desc(), MentoringSession.created_at.desc()).limit(6).all()
    interventions = MentorIntervention.query.filter_by(student_id=student.admission_number).order_by(MentorIntervention.created_at.desc()).limit(6).all()
    alerts = Alert.query.filter_by(student_admission_number=student.admission_number, mentor_id=student.mentor_id).order_by(Alert.created_at.desc()).limit(10).all()
    latest_report = AIPerformanceReport.query.filter_by(student_id=student.admission_number, report_type='individual').order_by(AIPerformanceReport.generated_at.desc()).first()
    analysis_data = latest_report.analysis_data if latest_report and isinstance(latest_report.analysis_data, dict) else {}

    risk_score = _safe_float(getattr(analytics, 'adjusted_risk', None) if analytics else 0)
    if risk_score <= 0 and analytics:
        risk_score = _safe_float(getattr(analytics, 'risk_score', 0))
    attendance = _safe_float(getattr(analytics, 'attendance_percentage', 0) if analytics else 0)

    personalized_note_alerts = [
        {
            'id': alert.id,
            'message': alert.message,
            'created_at': alert.created_at.isoformat() if alert.created_at else None,
            'is_read': bool(alert.is_read),
        }
        for alert in alerts
        if str(alert.type or '').upper() == 'PERSONALIZED_NOTE_REQUEST'
    ]

    remedial_rows = [{
        'id': row.id,
        'title': row.title,
        'subject_code': row.subject_code,
        'scheduled_date': row.scheduled_date.isoformat() if row.scheduled_date else None,
        'time_slot': row.time_slot,
        'status': row.status,
        'reason': row.reason,
        'feedback': row.feedback,
        'attended': bool(row.attended),
        'updated_at': row.updated_at.isoformat() if row.updated_at else None,
    } for row in remedials]

    session_rows = [{
        'id': row.id,
        'date': row.date.isoformat() if row.date else None,
        'time_slot': row.time_slot,
        'status': row.status,
        'session_type': row.session_type,
        'meeting_link': row.meeting_link,
        'notes': row.notes,
    } for row in sessions]

    intervention_rows = [{
        'id': row.id,
        'intervention_type': row.intervention_type,
        'notes': row.notes,
        'week_start': row.week_start.isoformat() if row.week_start else None,
        'risk_snapshot': row.risk_snapshot,
        'created_at': row.created_at.isoformat() if row.created_at else None,
    } for row in interventions]

    remedial_actions = []
    for item in analysis_data.get('subject_handler_plan') or []:
        text = str(item or '').strip()
        if text:
            remedial_actions.append(text)
    for item in analysis_data.get('recommendations') or []:
        text = str(item or '').strip()
        if text and text not in remedial_actions:
            remedial_actions.append(text)
    for item in analysis_data.get('mentor_action_items') or []:
        text = str(item or '').strip()
        if text and text not in remedial_actions:
            remedial_actions.append(text)

    latest_remedial = remedials[0] if remedials else None
    latest_session = sessions[0] if sessions else None

    progress_summary = []
    if attendance:
        progress_summary.append(f"Attendance is currently {attendance:.1f}%.")
    if risk_score:
        progress_summary.append(f"Current risk score is {risk_score:.1f}.")
    if latest_remedial:
        progress_summary.append(
            f"Latest remedial action is '{latest_remedial.title}' with status {latest_remedial.status}."
        )
    elif remedial_actions:
        progress_summary.append("No remedial class is scheduled yet, but AI remedial actions are available for follow-up.")
    if latest_session:
        progress_summary.append(
            f"Latest mentoring session status is {latest_session.status} on {latest_session.date.isoformat() if latest_session.date else 'scheduled date unavailable'}."
        )

    recommended_actions = []
    if risk_score >= 60:
        recommended_actions.append("Schedule an immediate mentoring session and review the latest remedial outcome.")
    if personalized_note_alerts:
        recommended_actions.append("Review the subject handler's personalized support request and monitor the student's follow-up closely.")
    if latest_remedial and latest_remedial.status == 'scheduled':
        recommended_actions.append("Monitor whether the scheduled remedial class was attended and capture feedback after completion.")
    if not latest_remedial and remedial_actions:
        recommended_actions.append("Convert the listed remedial actions into a formal remedial class or checkpoint plan.")
    if not recommended_actions:
        recommended_actions.append("Continue weekly monitoring and keep the student on the current improvement plan.")

    return {
        'student_id': student.admission_number,
        'student_name': student.full_name,
        'attendance_percentage': attendance,
        'risk_score': risk_score,
        'performance_trend': getattr(analytics, 'status', 'Stable') if analytics else 'Stable',
        'recommended_mentor_session': risk_score >= 60,
        'remedial_classes': remedial_rows,
        'recent_sessions': session_rows,
        'mentor_interventions': intervention_rows,
        'remedial_actions': remedial_actions,
        'personalized_note_alerts': personalized_note_alerts,
        'progress_summary': progress_summary,
        'recommended_actions': recommended_actions,
        'latest_remedial_status': latest_remedial.status if latest_remedial else None,
        'latest_session_status': latest_session.status if latest_session else None,
    }


@ai_performance_bp.route('/api/ai/performance-analysis', methods=['POST'])
@role_required('subject-handler', 'mentor')
def ai_performance_analysis():
    """Generate AI-powered performance analysis for a student."""
    try:
        data = request.get_json(force=True) or {}
        student_id = str(data.get('student_id') or '').strip().upper()
        subject_code = str(data.get('subject_code') or '').strip()
        normalized_subject_code = _normalize_subject_code(subject_code)
        subject_label = _subject_display_label(subject_code)
        report_type = data.get('report_type', 'individual')
        
        if not student_id:
            return jsonify({'success': False, 'message': 'student_id required'}), 400
        
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        
        # Gather performance data
        analytics = StudentAnalytics.query.filter_by(student_id=student_id).first()
        
        # Get marks data
        subject_marks = SubjectHandlerMark.query.filter_by(student_id=student_id).all()
        if normalized_subject_code:
            subject_marks = [m for m in subject_marks if _normalize_subject_code(m.subject_code) == normalized_subject_code]
        
        # Get attendance data
        subject_attendance = SubjectHandlerAttendance.query.filter_by(student_id=student_id).all()
        if normalized_subject_code:
            subject_attendance = [a for a in subject_attendance if _normalize_subject_code(a.subject_code) == normalized_subject_code]
        
        # Calculate statistics
        marks_by_subject = {}
        for mark in subject_marks:
            if mark.subject_code not in marks_by_subject:
                marks_by_subject[mark.subject_code] = []
            marks_by_subject[mark.subject_code].append(_bounded_percentage(mark.marks_obtained, mark.max_marks))
        
        attendance_by_subject = {}
        for att in subject_attendance:
            if att.subject_code not in attendance_by_subject:
                attendance_by_subject[att.subject_code] = {'present': 0, 'total': 0}
            attendance_by_subject[att.subject_code]['total'] += 1
            if att.status == 'Present':
                attendance_by_subject[att.subject_code]['present'] += 1
        
        # Helper to resolve subject name
        def get_subject_name(code):
            from models import Subject
            if not code: return code
            try:
                subj = Subject.query.filter(Subject.name.ilike(f"{code} - %")).first()
                if subj:
                    parts = subj.name.split(' - ', 1)
                    if len(parts) > 1:
                        name_part = parts[1].split(' (')[0]
                        return f"{name_part} ({code})"
                common = {'IMCA501': 'Cloud Computing', 'IMCA503': 'Internet of Things', 'IMCA505': 'Cyber Security', 'IMCA507': 'Data Science'}
                if code in common: return f"{common[code]} ({code})"
            except: pass
            return code

        # Prepare context for AI
        context = {
            'student_name': student.full_name,
            'student_id': student_id,
            'batch': student.batch,
            'department': student.branch,
            'overall_attendance': analytics.attendance_percentage if analytics else 0,
            'risk_score': analytics.adjusted_risk if analytics else 0,
            'performance_trend': analytics.status if analytics else 'Stable',
            'selected_subject': _get_subject_name(normalized_subject_code) if normalized_subject_code else (subject_label or ''),
            'subject_marks': {
                _get_subject_name(subj): f"Avg: {sum(scores)/len(scores):.1f}%" 
                for subj, scores in marks_by_subject.items()
            },
            'subject_attendance': {
                _get_subject_name(subj): f"{data['present']}/{data['total']} ({data['present']/data['total']*100:.1f}%)" 
                for subj, data in attendance_by_subject.items()
            },
        }
        
        # Generate AI analysis using Groq
        provider, ai_client = _get_ai_provider()
        
        if provider and ai_client:
            system_prompt = """You are an expert educational AI analyst. Analyze student performance data and provide:
1. Performance trends (improving/stable/declining)
2. Subject-wise strengths and weaknesses
3. Attendance patterns
4. Risk assessment (low/medium/high)
5. Specific actionable recommendations
6. Whether remedial classes are needed

Return JSON format:
{
  "performance_trend": "improving/stable/declining",
  "risk_assessment": "low/medium/high",
  "strengths": ["list of strengths"],
  "weaknesses": ["list of weaknesses"],
  "root_causes": ["root causes behind subject failure risk"],
  "risk_factors": ["specific risks that can worsen outcomes"],
  "root_cause_summary": "short summary",
  "risk_summary": "short summary",
  "subject_analysis": {"subject_code": {"marks_avg": X, "attendance_pct": Y, "status": "good/average/poor"}},
  "recommendations": ["specific recommendations"],
  "remedial_needed": true/false,
  "remedial_subjects": ["subjects needing remedial"],
  "ai_insights": "detailed analysis paragraph",
  "mentor_action_items": ["actions for mentor"],
  "subject_handler_plan": ["detailed action plan for the subject handler to get the student back on track"],
  "detailed_summary": "full summary combining root cause, risk, and action plan"
}"""
            
            user_prompt = f"""Analyze this student's performance:
Student: {context['student_name']} ({context['student_id']})
Batch: {context['batch']}
Department: {context['department']}
Selected Subject: {context['selected_subject']}
Overall Attendance: {context['overall_attendance']}%
Risk Score: {context['risk_score']}
Performance Trend: {context['performance_trend']}

Subject Marks: {context['subject_marks']}
Subject Attendance: {context['subject_attendance']}

Provide detailed analysis in JSON format."""
            
            try:
                raw = _complete_with_ai(provider, ai_client, system_prompt, user_prompt, max_tokens=1000)
                raw = raw.strip()
                if '```' in raw:
                    parts = raw.split('```')
                    for part in parts:
                        cleaned_part = part.strip()
                        if cleaned_part.startswith('json'):
                            raw = cleaned_part[4:].strip()
                            break
                        if cleaned_part.startswith('{'):
                            raw = cleaned_part
                            break
                if not raw.startswith('{'):
                    start = raw.find('{')
                    end = raw.rfind('}')
                    if start != -1 and end != -1 and end > start:
                        raw = raw[start:end + 1]
                
                import json as _json
                analysis_data = _normalize_analysis_payload(_json.loads(raw), context)
                
                # Save report
                report = AIPerformanceReport(
                    student_id=student_id,
                    subject_code=normalized_subject_code if normalized_subject_code else None,
                    handler_id=int(data.get('handler_id') or 0) or None,
                    mentor_id=int(data.get('mentor_id') or 0) or None,
                    report_type=report_type,
                    analysis_data=analysis_data,
                    ai_insights=analysis_data.get('ai_insights', ''),
                    recommendations='\n'.join(analysis_data.get('recommendations', [])),
                    risk_assessment=analysis_data.get('risk_assessment', 'medium'),
                    performance_trend=analysis_data.get('performance_trend', 'stable'),
                    generated_by='groq_ai'
                )
                db.session.add(report)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': analysis_data,
                    'report_id': report.id,
                    'source': 'groq_ai'
                }), 200
                
            except Exception:
                analysis_data = _rule_based_analysis(context, marks_by_subject, attendance_by_subject)
        else:
            analysis_data = _rule_based_analysis(context, marks_by_subject, attendance_by_subject)

        analysis_data = _normalize_analysis_payload(analysis_data, context)

        report = AIPerformanceReport(
            student_id=student_id,
            subject_code=normalized_subject_code if normalized_subject_code else None,
            handler_id=int(data.get('handler_id') or 0) or None,
            mentor_id=int(data.get('mentor_id') or 0) or None,
            report_type=report_type,
            analysis_data=analysis_data,
            ai_insights=analysis_data.get('ai_insights', ''),
            recommendations='\n'.join(analysis_data.get('recommendations', [])),
            risk_assessment=analysis_data.get('risk_assessment', 'medium'),
            performance_trend=analysis_data.get('performance_trend', 'stable'),
            generated_by='rule_based'
        )
        db.session.add(report)
        db.session.commit()

        return jsonify({
            'success': True,
            'data': analysis_data,
            'report_id': report.id,
            'source': 'rule_based'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_performance_bp.route('/api/ai/subject-overview', methods=['POST'])
@role_required('subject-handler', 'mentor')
def ai_subject_overview():
    """Analyze all students for a subject and return graph-ready weak student insights."""
    try:
        data = request.get_json(force=True) or {}
        handler_id = int(data.get('handler_id') or 0)
        subject_code = str(data.get('subject_code') or '').strip()
        normalized_subject_code = _normalize_subject_code(subject_code)
        subject_label = _subject_display_label(subject_code)
        department = str(data.get('department') or '').strip()
        batch = str(data.get('batch') or '').strip()

        if not handler_id or not normalized_subject_code:
            return jsonify({'success': False, 'message': 'handler_id and subject_code required'}), 400

        mark_rows = [
            row for row in SubjectHandlerMark.query.filter_by(subject_handler_id=handler_id).all()
            if _normalize_subject_code(row.subject_code) == normalized_subject_code
        ]
        attendance_rows = [
            row for row in SubjectHandlerAttendance.query.filter_by(subject_handler_id=handler_id).all()
            if _normalize_subject_code(row.subject_code) == normalized_subject_code
        ]
        student_ids = sorted({row.student_id for row in mark_rows} | {row.student_id for row in attendance_rows})
        if not student_ids:
            return jsonify({'success': True, 'data': {
                'subject_code': normalized_subject_code,
                'subject_label': subject_label or normalized_subject_code,
                'scope_label': batch or department or subject_label or normalized_subject_code,
                'total_students': 0,
                'analyzed_students': 0,
                'avg_marks': 0,
                'avg_attendance': 0,
                'status_distribution': [],
                'stability_distribution': [],
                'risk_distribution': [],
                'weak_area_distribution': [],
                'weak_students': [],
                'faculty_recommendations': [],
                'remedial_methods': [],
                'graph_summary': ['No graph summary is available because no subject-wise data has been entered yet.'],
                'ai_summary': 'No subject-wise student data is available yet for this selection.',
                'source': 'rule_based',
                'api_key_status': 'configured' if _get_ai_provider()[0] else 'missing',
            }}), 200

        students = Student.query.filter(Student.admission_number.in_(student_ids)).all()
        students = _student_scope_filter(students, department=department or None, batch=batch or None)

        analytics_rows = StudentAnalytics.query.filter(StudentAnalytics.student_id.in_([student.admission_number for student in students])).all()
        analytics_map = {row.student_id: row for row in analytics_rows}

        marks_map = defaultdict(list)
        for row in mark_rows:
            marks_map[row.student_id].append(row)

        attendance_map = defaultdict(list)
        for row in attendance_rows:
            attendance_map[row.student_id].append(row)

        overview = _build_subject_overview(normalized_subject_code, students, analytics_map, marks_map, attendance_map)
        overview['subject_label'] = subject_label or normalized_subject_code
        overview['scope_label'] = batch or department or subject_label or normalized_subject_code

        provider, ai_client = _get_ai_provider()
        source = 'rule_based'
        ai_payload = _rule_based_subject_summary(overview)

        if provider and ai_client and overview['analyzed_students'] > 0:
            try:
                system_prompt = """You are an academic performance analyst for college faculty.
Return strict JSON with keys:
ai_summary: string
faculty_recommendations: string[]
remedial_methods: string[]
graph_summary: string[]
Focus on weak students, weak areas, and practical faculty actions.
Keep recommendations concise, specific, and classroom-usable."""

                weak_students = [
                    {
                        'student_id': student['student_id'],
                        'risk_band': student['risk_band'],
                        'performance_status': student['performance_status'],
                        'avg_marks': student['subject_avg_marks'],
                        'attendance': student['subject_attendance_pct'],
                        'failed_assessments': student['failed_assessments'],
                        'weak_areas': student['weak_areas'],
                    }
                    for student in overview['weak_students'][:10]
                ]

                user_prompt = (
                    f"Subject: {subject_label or normalized_subject_code}\n"
                    f"Scope: {overview['scope_label']}\n"
                    f"Students analyzed: {overview['analyzed_students']}\n"
                    f"Average marks: {overview['avg_marks']}\n"
                    f"Average attendance: {overview['avg_attendance']}\n"
                    f"Status distribution: {overview['status_distribution']}\n"
                    f"Risk distribution: {overview['risk_distribution']}\n"
                    f"Weak area distribution: {overview['weak_area_distribution']}\n"
                    f"Weak students: {weak_students}\n"
                )

                raw = _complete_with_ai(provider, ai_client, system_prompt, user_prompt, max_tokens=900)
                import json as _json
                ai_payload = _json.loads(raw)
                source = provider
            except Exception:
                source = 'rule_based'

        overview['ai_summary'] = ai_payload.get('ai_summary') or overview.get('ai_summary') or ''
        overview['faculty_recommendations'] = ai_payload.get('faculty_recommendations') or overview.get('faculty_recommendations') or []
        overview['remedial_methods'] = ai_payload.get('remedial_methods') or overview.get('remedial_methods') or []
        overview['graph_summary'] = ai_payload.get('graph_summary') or []
        overview['source'] = source
        overview['api_key_status'] = 'configured' if provider else 'missing'

        return jsonify({'success': True, 'data': overview, 'source': source}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_performance_bp.route('/api/remedial-classes', methods=['POST'])
@role_required('subject-handler')
def create_remedial_class():
    """Schedule a remedial class for a student."""
    try:
        data = request.get_json(force=True) or {}
        
        required = ['student_id', 'subject_code', 'handler_id', 'title', 'scheduled_date', 'time_slot']
        for field in required:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} required'}), 400
        
        student_id = str(data['student_id']).strip().upper()
        subject_code = _normalize_subject_code(data['subject_code'])
        handler_id = int(data['handler_id'])
        
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        
        # Create remedial class
        remedial = RemedialClass(
            student_id=student_id,
            subject_code=subject_code,
            handler_id=handler_id,
            mentor_id=student.mentor_id,
            title=str(data['title']).strip(),
            description=data.get('description', ''),
            scheduled_date=datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date(),
            time_slot=str(data['time_slot']).strip(),
            duration_minutes=int(data.get('duration_minutes', 60)),
            mode=data.get('mode', 'online'),
            meeting_link=data.get('meeting_link', ''),
            reason=data.get('reason', 'Performance improvement needed')
        )
        db.session.add(remedial)
        db.session.flush()
        
        # Create notifications
        student_notification = RemedialNotification(
            remedial_class_id=remedial.id,
            student_id=student_id,
            handler_id=handler_id,
            mentor_id=student.mentor_id,
            notification_type='scheduled',
            message=f"Remedial class scheduled: {remedial.title} on {remedial.scheduled_date} at {remedial.time_slot}. {'Join: ' + remedial.meeting_link if remedial.meeting_link else ''}"
        )
        db.session.add(student_notification)
        
        if student.mentor_id:
            mentor_notification = RemedialNotification(
                remedial_class_id=remedial.id,
                student_id=student_id,
                handler_id=handler_id,
                mentor_id=student.mentor_id,
                notification_type='scheduled',
                message=f"Remedial class scheduled for {student.full_name} ({student_id}): {remedial.title} on {remedial.scheduled_date} at {remedial.time_slot}."
            )
            db.session.add(mentor_notification)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': remedial.id,
                'student_id': student_id,
                'subject_code': subject_code,
                'scheduled_date': remedial.scheduled_date.isoformat(),
                'time_slot': remedial.time_slot,
                'meeting_link': remedial.meeting_link
            },
            'message': 'Remedial class scheduled successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_performance_bp.route('/api/remedial-classes', methods=['GET'])
@role_required('subject-handler', 'mentor')
def get_remedial_classes():
    """Get remedial classes for handler/mentor."""
    try:
        user_id = request.args.get('user_id')
        user_role = request.args.get('user_role')
        student_id = request.args.get('student_id')
        status = request.args.get('status')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'user_id required'}), 400
        
        query = RemedialClass.query
        
        if user_role == 'subject-handler':
            query = query.filter_by(handler_id=int(user_id))
        elif user_role == 'mentor':
            query = query.filter_by(mentor_id=int(user_id))
        
        if student_id:
            query = query.filter_by(student_id=str(student_id).strip().upper())
        
        if status:
            query = query.filter_by(status=status)
        
        remedial_classes = query.order_by(RemedialClass.scheduled_date.desc()).all()
        
        data = []
        for r in remedial_classes:
            data.append({
                'id': r.id,
                'student_id': r.student_id,
                'student_name': r.student.full_name if r.student else 'Unknown',
                'subject_code': r.subject_code,
                'title': r.title,
                'description': r.description,
                'scheduled_date': r.scheduled_date.isoformat() if r.scheduled_date else None,
                'time_slot': r.time_slot,
                'duration_minutes': r.duration_minutes,
                'mode': r.mode,
                'meeting_link': r.meeting_link,
                'status': r.status,
                'reason': r.reason,
                'attended': r.attended,
                'feedback': r.feedback,
                'created_at': r.created_at.isoformat() if r.created_at else None
            })
        
        return jsonify({'success': True, 'data': data}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_performance_bp.route('/api/remedial-classes/<int:remedial_id>', methods=['PUT'])
@role_required('subject-handler')
def update_remedial_class(remedial_id):
    """Update remedial class status."""
    try:
        data = request.get_json(force=True) or {}
        remedial = RemedialClass.query.get(remedial_id)
        
        if not remedial:
            return jsonify({'success': False, 'message': 'Remedial class not found'}), 404
        
        if 'status' in data:
            old_status = remedial.status
            remedial.status = data['status']
            
            notification = RemedialNotification(
                remedial_class_id=remedial.id,
                student_id=remedial.student_id,
                handler_id=remedial.handler_id,
                mentor_id=remedial.mentor_id,
                notification_type=data['status'],
                message=f"Remedial class '{remedial.title}' status changed from {old_status} to {data['status']}."
            )
            db.session.add(notification)
        
        if 'attended' in data:
            remedial.attended = bool(data['attended'])
        
        if 'feedback' in data:
            remedial.feedback = str(data['feedback'])
        
        if 'meeting_link' in data:
            remedial.meeting_link = str(data['meeting_link'])
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Remedial class updated'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_performance_bp.route('/api/ai/mentor-reports', methods=['GET'])
@role_required('mentor')
def ai_mentor_reports():
    """Generate AI-powered reports for mentor's mentees."""
    try:
        mentor_id = request.args.get('mentor_id') or session.get('user_id')
        
        if not mentor_id:
            return jsonify({'success': False, 'message': 'mentor_id required'}), 400
        
        mentees = Student.query.filter_by(mentor_id=int(mentor_id), status='Live').all()
        
        if not mentees:
            return jsonify({
                'success': True,
                'data': {
                    'students': [],
                    'high_risk_students': [],
                    'students_needing_remedial': [],
                    'summary': {
                        'total_mentees': 0,
                        'high_risk_count': 0,
                        'students_needing_remedial': 0,
                        'avg_attendance': 0,
                        'avg_risk_score': 0,
                        'common_interventions': [],
                    }
                }
            }), 200
        
        students_data = []
        high_risk_students = []
        students_needing_remedial = []
        mentor_interventions = MentorIntervention.query.filter_by(mentor_id=int(mentor_id)).all()
        intervention_counter = Counter(
            str(item.intervention_type or 'General follow-up').strip() or 'General follow-up'
            for item in mentor_interventions
        )
        
        for student in mentees:
            analytics = StudentAnalytics.query.filter_by(student_id=student.admission_number).first()
            monitor_payload = _mentor_student_monitoring_payload(student)
            
            remedial_count = RemedialClass.query.filter_by(
                student_id=student.admission_number,
                status='scheduled'
            ).count()
            
            student_data = {
                'student_id': student.admission_number,
                'student_name': student.full_name,
                'batch': student.batch,
                'department': student.branch,
                'attendance_percentage': _safe_float(analytics.attendance_percentage if analytics else 0),
                'risk_score': _safe_float((analytics.adjusted_risk if analytics and getattr(analytics, 'adjusted_risk', None) is not None else (analytics.risk_score if analytics else 0))),
                'performance_trend': analytics.status if analytics else 'Stable',
                'pending_remedial_classes': remedial_count,
                'recommended_mentor_session': monitor_payload['recommended_mentor_session'],
                'latest_remedial_status': monitor_payload['latest_remedial_status'],
                'latest_session_status': monitor_payload['latest_session_status'],
                'personalized_note_alert_count': len(monitor_payload['personalized_note_alerts']),
                'progress_summary': monitor_payload['progress_summary'][:2],
            }
            
            students_data.append(student_data)
            
            if student_data['risk_score'] >= 60:
                high_risk_students.append(student_data)
            
            if remedial_count > 0:
                students_needing_remedial.append(student_data)
        
        summary = {
            'total_mentees': len(mentees),
            'high_risk_count': len(high_risk_students),
            'students_needing_remedial': len(students_needing_remedial),
            'avg_attendance': sum(s['attendance_percentage'] for s in students_data) / len(students_data) if students_data else 0,
            'avg_risk_score': sum(s['risk_score'] for s in students_data) / len(students_data) if students_data else 0,
            'common_interventions': [
                {'label': label, 'value': count}
                for label, count in intervention_counter.most_common(5)
            ],
        }
        
        return jsonify({
            'success': True,
            'data': {
                'students': students_data,
                'high_risk_students': high_risk_students,
                'students_needing_remedial': students_needing_remedial,
                'summary': summary
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_performance_bp.route('/api/ai/mentor-student-monitor/<string:student_id>', methods=['GET'])
@role_required('mentor')
def ai_mentor_student_monitor(student_id):
    try:
        mentor_id = int(request.args.get('mentor_id') or session.get('user_id') or 0)
        sid = str(student_id or '').strip().upper()
        if not mentor_id or not sid:
            return jsonify({'success': False, 'message': 'mentor_id and student_id are required'}), 400

        student = Student.query.get(sid)
        if not student or int(student.mentor_id or 0) != mentor_id:
            return jsonify({'success': False, 'message': 'Student not found for this mentor'}), 404

        return jsonify({
            'success': True,
            'data': _mentor_student_monitoring_payload(student),
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_performance_bp.route('/api/remedial-notifications', methods=['GET'])
@role_required('subject-handler', 'mentor', 'student')
def get_remedial_notifications():
    """Get notifications for remedial classes."""
    try:
        user_id = request.args.get('user_id')
        user_role = request.args.get('user_role')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'user_id required'}), 400
        
        query = RemedialNotification.query
        
        if user_role == 'student':
            query = query.filter_by(student_id=str(user_id).strip().upper())
        elif user_role == 'subject-handler':
            query = query.filter_by(handler_id=int(user_id))
        elif user_role == 'mentor':
            query = query.filter_by(mentor_id=int(user_id))
        
        notifications = query.order_by(RemedialNotification.created_at.desc()).limit(50).all()
        
        data = []
        for n in notifications:
            data.append({
                'id': n.id,
                'notification_type': n.notification_type,
                'message': n.message,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat() if n.created_at else None
            })
        
        return jsonify({'success': True, 'data': data}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
