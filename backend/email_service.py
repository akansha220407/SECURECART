"""
Email Service for SecureCart
Handles OTP and notification emails
"""

import os
import random
import string
from datetime import datetime, timedelta
from flask import current_app
from flask_mail import Mail, Message
from models import db, OTP, User

# Initialize Flask-Mail
mail = Mail()


def is_email_delivery_configured():
    """Return True when SMTP credentials are configured."""
    return bool(
        current_app.config.get('MAIL_USERNAME') and
        current_app.config.get('MAIL_PASSWORD')
    )

def init_email_service(app):
    """Initialize email service with Flask app"""
    # Email configuration
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USE_SSL'] = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@securecart.com')
    
    mail.init_app(app)

def generate_otp(length=6):
    """Generate a random OTP"""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(email, otp_code, purpose='login'):
    """Send OTP email to user"""
    try:
        mail_username = current_app.config.get('MAIL_USERNAME')
        mail_password = current_app.config.get('MAIL_PASSWORD')

        # Development fallback: allow login to proceed even when SMTP is not configured.
        if not mail_username or not mail_password:
            print(f"[DEV OTP] {email} ({purpose}): {otp_code}")
            return True

        # Get user info for personalization
        user = User.query.filter_by(email=email).first()
        user_name = f"{user.first_name} {user.last_name}" if user else "User"
        
        # Email templates
        if purpose == 'login':
            subject = "SecureCart - Login Verification Code"
            template = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb;">SecureCart</h1>
                    </div>
                    
                    <h2>Hello {user_name}!</h2>
                    
                    <p>You're trying to log in to your SecureCart account. For security purposes, please use the verification code below:</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 4px;">{otp_code}</h1>
                    </div>
                    
                    <p><strong>This code will expire in 10 minutes.</strong></p>
                    
                    <p>If you didn't request this code, please ignore this email or contact our support team.</p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                    
                    <p style="font-size: 14px; color: #6b7280;">
                        This is an automated message from SecureCart. Please do not reply to this email.
                    </p>
                </div>
            </body>
            </html>
            """
        else:
            subject = "SecureCart - Verification Code"
            template = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb;">SecureCart</h1>
                    </div>
                    
                    <h2>Hello {user_name}!</h2>
                    
                    <p>Please use the verification code below to complete your request:</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 4px;">{otp_code}</h1>
                    </div>
                    
                    <p><strong>This code will expire in 10 minutes.</strong></p>
                    
                    <p>If you didn't request this code, please ignore this email or contact our support team.</p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                    
                    <p style="font-size: 14px; color: #6b7280;">
                        This is an automated message from SecureCart. Please do not reply to this email.
                    </p>
                </div>
            </body>
            </html>
            """
        
        # Create and send message
        msg = Message(
            subject=subject,
            recipients=[email],
            html=template
        )
        
        mail.send(msg)
        return True
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

def create_otp(user_id, email, purpose='login', expires_minutes=10):
    """Create and store OTP in database"""
    try:
        # Invalidate any existing OTPs for this user and purpose
        OTP.query.filter_by(user_id=user_id, purpose=purpose, is_used=False).update({'is_used': True})
        
        # Generate new OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=expires_minutes)
        
        # Create OTP record
        otp = OTP(
            user_id=user_id,
            email=email,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=expires_at
        )
        
        db.session.add(otp)
        db.session.commit()
        
        return otp_code
        
    except Exception as e:
        print(f"Error creating OTP: {e}")
        db.session.rollback()
        return None

def verify_otp(email, otp_code, purpose='login'):
    """Verify OTP and mark as used"""
    try:
        # Find valid OTP
        otp = OTP.query.filter_by(
            email=email,
            otp_code=otp_code,
            purpose=purpose,
            is_used=False
        ).first()
        
        if not otp:
            return False, "Invalid OTP"
        
        if not otp.is_valid():
            return False, "OTP has expired"
        
        # Mark OTP as used
        otp.is_used = True
        db.session.commit()
        
        return True, "OTP verified successfully"
        
    except Exception as e:
        print(f"Error verifying OTP: {e}")
        db.session.rollback()
        return False, "Error verifying OTP"

def cleanup_expired_otps():
    """Clean up expired OTPs (call this periodically)"""
    try:
        expired_otps = OTP.query.filter(OTP.expires_at < datetime.utcnow()).all()
        for otp in expired_otps:
            db.session.delete(otp)
        db.session.commit()
        return len(expired_otps)
    except Exception as e:
        print(f"Error cleaning up OTPs: {e}")
        return 0
