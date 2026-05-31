import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


async def send_email(to: str, subject: str, html_body: str):
    if not settings.SMTP_USER:
        print(f"[EMAIL MOCK] To: {to} | Subject: {subject}")
        print(html_body[:200])
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        start_tls=True,
    )


async def send_signing_invite(signer_email: str, signer_name: str, contract_title: str, signing_url: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">Action Required: Sign a Contract</h2>
      <p>Hi {signer_name or signer_email},</p>
      <p>You have been invited to review and sign: <strong>{contract_title}</strong></p>
      <p style="margin:24px 0">
        <a href="{signing_url}" style="background:#2563eb;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">
          Review &amp; Sign Contract
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px">
        This link is unique to you — do not forward it.<br>
        It expires in 30 days. You will be asked to verify your email with a one-time code before signing.
      </p>
    </div>
    """
    await send_email(signer_email, f"Action Required: Sign '{contract_title}'", html)


async def send_otp_email(signer_email: str, signer_name: str, otp: str, contract_title: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">Your Verification Code</h2>
      <p>Hi {signer_name or signer_email},</p>
      <p>To sign <strong>{contract_title}</strong>, enter this code:</p>
      <div style="font-size:40px;font-weight:700;letter-spacing:12px;color:#111;margin:24px 0;padding:20px;background:#f3f4f6;border-radius:8px;text-align:center">
        {otp}
      </div>
      <p style="color:#6b7280;font-size:13px">
        This code expires in 15 minutes. If you did not request this, ignore this email.
      </p>
    </div>
    """
    await send_email(signer_email, f"Your verification code for '{contract_title}'", html)


async def send_signature_confirmation(signer_email: str, signer_name: str, contract_title: str, signed_at: str, content_hash: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#16a34a">✓ Contract Signed Successfully</h2>
      <p>Hi {signer_name},</p>
      <p>You have successfully signed <strong>{contract_title}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:20px 0;font-size:13px">
        <tr><td style="padding:8px;color:#6b7280;border-bottom:1px solid #e5e7eb">Signed at</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{signed_at}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Document hash (SHA-256)</td><td style="padding:8px;font-family:monospace;font-size:11px;word-break:break-all">{content_hash}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px">
        Keep this email as your record. The document hash uniquely identifies the exact version you signed.
      </p>
    </div>
    """
    await send_email(signer_email, f"Signed: '{contract_title}'", html)


async def send_reminder_email(owner_email: str, contract_title: str, end_date: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#d97706">Contract Expiry Reminder</h2>
      <p>This is a reminder that <strong>{contract_title}</strong> expires on <strong>{end_date}</strong>.</p>
      <p>Please log in to ContractPilot to take action.</p>
    </div>
    """
    await send_email(owner_email, f"Reminder: '{contract_title}' expiring on {end_date}", html)
