from fastapi_mail import FastMail, MessageSchema
from .email_config import conf

async def send_reset_email(email: str, reset_link: str):

    message = MessageSchema(
        subject="Reset your password",
        recipients=[email],
        body=f"""
Hello,

We received a request to reset the password for your Payroll Management account.

To reset your password, please click the secure link below:

{reset_link}

This link will expire in 30 minutes for security reasons.

If you did not request a password reset, please ignore this email. Your account will remain secure.

For assistance, please contact your system administrator.

Best regards,
Payroll Management System
""",
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(message)




async def send_employee_credentials(email: str, password: str):
    message = MessageSchema(
        subject="Welcome to Company - Login Details",
        recipients=[email],
        body=f"""
Welcome to the Company!

Your account has been created successfully.

Login Details:
Email: {email}
Password: {password}

⚠️ Please change your password after first login.

Regards,
HR Team
""",
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(message)