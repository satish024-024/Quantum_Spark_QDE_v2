"""Email sending for Quantum Spark (password resets, notifications).

Uses SMTP via environment variables so no secrets live in the repo:

    SMTP_HOST  - SMTP server host (default: smtp.gmail.com)
    SMTP_PORT  - SMTP server port (default: 587, STARTTLS)
    SMTP_USER  - SMTP username (for Gmail: your full Gmail address)
    SMTP_PASS  - SMTP password (for Gmail: an App Password, NOT your login password)
    SMTP_FROM  - From address shown on emails (default: SMTP_USER)
    SMTP_USE_TLS - '0' to disable STARTTLS (default: enabled)

Gmail setup (2 minutes):
    1. Go to https://myaccount.google.com/apppasswords (requires 2FA enabled)
    2. Create an app password for "Mail"
    3. In Vercel: Project Settings -> Environment Variables, add
       SMTP_USER = your Gmail address
       SMTP_PASS = the 16-character app password
    4. Redeploy.

If SMTP is not configured, send_email() returns (False, reason) and callers
should fall back to showing the link/content directly.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def is_configured():
    """True when SMTP credentials are present."""
    return bool(os.environ.get('SMTP_USER') and os.environ.get('SMTP_PASS'))


def send_email(to_email, subject, html_body, text_body=None):
    """Send an HTML email. Returns (ok, message)."""
    host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    port = int(os.environ.get('SMTP_PORT', '587'))
    user = os.environ.get('SMTP_USER', '')
    password = os.environ.get('SMTP_PASS', '')
    from_addr = os.environ.get('SMTP_FROM', user)
    use_tls = os.environ.get('SMTP_USE_TLS', '1') != '0'

    if not user or not password:
        return False, 'Email not configured (set SMTP_USER / SMTP_PASS)'

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_addr
        msg['To'] = to_email
        if text_body:
            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP(host, port, timeout=20) as server:
            if use_tls:
                server.starttls()
            server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
        return True, 'Email sent'
    except Exception as e:
        print(f'⚠️ Email send failed: {e}')
        return False, f'Email failed: {str(e)}'


def send_password_reset_email(to_email, reset_url):
    """Send the forgot-password email with the reset link."""
    subject = 'Reset your Quantum Spark password'
    html_body = f"""\
<html><body style="font-family: sans-serif; color: #222; max-width: 560px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #0072ff;">Reset your password</h2>
  <p>You asked to reset the password for your Quantum Spark account ({to_email}).</p>
  <p>Click the link below to choose a new password. The link <b>expires in 1 hour</b> and can be used only once.</p>
  <p style="margin: 24px 0;">
    <a href="{reset_url}" style="background: #0072ff; color: #fff; padding: 12px 24px;
       border-radius: 8px; text-decoration: none; font-weight: bold;">Reset password</a>
  </p>
  <p style="color: #666; font-size: 13px;">If the button doesn't work, copy this link into your browser:<br>
  <span style="word-break: break-all;">{reset_url}</span></p>
  <p style="color: #666; font-size: 13px;">If you didn't ask for this, just ignore this email — your password stays unchanged.</p>
</body></html>"""
    text_body = (
        f"You asked to reset your Quantum Spark password.\n\n"
        f"Open this link (expires in 1 hour, single use):\n{reset_url}\n\n"
        f"If you didn't ask for this, ignore this email."
    )
    return send_email(to_email, subject, html_body, text_body)
