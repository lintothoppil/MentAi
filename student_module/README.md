# MentAi - Student Module

A complete student management system with registration, profile management, and authentication features.

## Features

### Core Functionality
- ✅ Student Registration with Photo Upload
- ✅ Two-step Registration Process (Basic + Complete Profile)
- ✅ Login with Admission Number + Password
- ✅ OTP-based Password Reset via Gmail
- ✅ Profile Completion Tracking (with % indicator)
- ✅ Student Dashboard with All Details
- ✅ Parent Details Management
- ✅ Academic History Tracking
- ✅ Sibling & Accommodation Information

### Security
- Password encryption using Werkzeug
- Gmail-only email validation
- Unique admission number enforcement
- Session-based authentication

### UI/UX
- College mentoring record form style
- Table-based layouts with grey/black borders
- Profile completion percentage indicator
- Responsive form design
- Mandatory field highlighting

## Database Schema

Tables:
1. `students` - Basic student information and profile status
2. `parents` - Parent details (father/mother info)
3. `academics` - Academic history (10th, 12th, UG, SGPA/CGPA)
4. `other_info` - Siblings, accommodation, transport
5. `login_credentials` - Encrypted passwords

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Edit `.env` file:
```
SECRET_KEY=your_random_secret_key
DATABASE_URL=mysql+pymysql://username:password@localhost/mentorai
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_gmail_app_password
```

### 3. Setup MySQL Database
1. Create database:
```sql
CREATE DATABASE mentorai;
```

2. Run schema:
```bash
mysql -u username -p mentorai < schema.sql
```

### 4. Configure Gmail SMTP
1. Enable 2-factor authentication on your Gmail account
2. Generate App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"

### 5. Run Application
```bash
python app.py
```

Visit: http://localhost:5000

## File Structure
```
student_module/
├── app.py              # Main Flask application
├── models.py           # Database models
├── utils.py            # Helper functions (OTP, email)
├── schema.sql          # Database schema
├── requirements.txt    # Python dependencies
├── .env               # Environment configuration
├── static/
│   ├── style.css      # Styling
│   └── photos/        # Uploaded student photos
└── templates/
    ├── base.html
    ├── login.html
    ├── register.html
    ├── complete_profile.html
    ├── dashboard.html
    ├── forgot_password.html
    ├── verify_otp.html
    └── reset_password.html
```

## API Endpoints

- `GET /` - Redirects to dashboard or login
- `GET/POST /register` - Student registration
- `GET/POST /login` - Student login
- `GET /logout` - Logout
- `GET/POST /forgot_password` - Request password reset
- `GET/POST /verify_otp` - Verify OTP
- `GET/POST /reset_password` - Reset password
- `GET /dashboard` - Student dashboard
- `GET/POST /complete_profile` - Complete/update profile

## Mandatory Fields for 100% Completion

1. Full Name
2. Admission Number
3. Email
4. Mobile Number
5. Permanent Address
6. Father's Name
7. Mother's Name
8. 10th School Name
9. 12th School Name

## Screenshots

The UI follows a formal college mentoring record style with:
- Black/Grey borders
- Table-based layouts
- Section headers
- Professional typography

## Troubleshooting

### Database Connection Error
- Check MySQL service is running
- Verify database credentials in `.env`
- Ensure `mentorai` database exists

### Email Not Sending
- Check Gmail credentials
- Verify App Password is correct
- Ensure 2FA is enabled

### Photo Upload Issues
- Check `static/photos` directory permissions
- Verify file size limits
- Ensure `enctype="multipart/form-data"` in forms

## License
MIT License