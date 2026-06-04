"""
Email delivery via SendGrid (preferred) or SMTP fallback.
"""
from app.core.config import settings


def _sendgrid_send(to: str, subject: str, html_body: str):
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    message = Mail(
        from_email=settings.EMAIL_FROM,
        to_emails=to,
        subject=subject,
        html_content=html_body,
    )
    sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
    sg.send(message)


async def _smtp_send(to: str, subject: str, html_body: str):
    import aiosmtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    use_ssl = settings.SMTP_PORT == 465

    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        use_tls=use_ssl,
        start_tls=not use_ssl,
    )


async def send_email(to: str, subject: str, html_body: str):
    if settings.SENDGRID_API_KEY:
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sendgrid_send, to, subject, html_body)
    elif settings.SMTP_USER:
        await _smtp_send(to, subject, html_body)
    else:
        print(f"\n[EMAIL MOCK] ─────────────────────────────────")
        print(f"  To:      {to}")
        print(f"  Subject: {subject}")
        print(f"  Body:    {html_body[:120]}...")
        print(f"──────────────────────────────────────────────\n")


# ──────────────────────────────────────────────────────────
# Transactional email helpers
# ──────────────────────────────────────────────────────────

async def send_password_reset_email(email: str, reset_url: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#111">ContractPilot</span>
      </div>
      <h2 style="color:#1d4ed8;margin-top:0">Reset your password</h2>
      <p style="color:#374151">We received a request to reset the password for your account.</p>
      <p style="margin:28px 0">
        <a href="{reset_url}"
           style="background:#2563eb;color:#fff;padding:13px 28px;border-radius:6px;
                  text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
          Reset Password
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;line-height:1.6">
        This link expires in <strong>1 hour</strong>.<br>
        If you didn't request this, you can safely ignore this email — your password will not change.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"/>
      <p style="color:#9ca3af;font-size:12px;word-break:break-all">
        If the button doesn't work, paste this URL into your browser:<br>{reset_url}
      </p>
    </div>
    """
    await send_email(email, "Reset your ContractPilot password", html)


async def send_signing_invite(signer_email: str, signer_name: str, contract_title: str, signing_url: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#111">ContractPilot</span>
      </div>
      <h2 style="color:#1d4ed8;margin-top:0">You've been invited to sign a contract</h2>
      <p style="color:#374151">Hi {signer_name or signer_email},</p>
      <p style="color:#374151">You have been invited to review and sign: <strong>{contract_title}</strong></p>
      <p style="margin:28px 0">
        <a href="{signing_url}"
           style="background:#2563eb;color:#fff;padding:13px 28px;border-radius:6px;
                  text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
          Review &amp; Sign Contract
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;line-height:1.6">
        This link is unique to you — do not forward it.<br>
        It expires in <strong>30 days</strong>. You'll need to verify your email with a one-time code before signing.
      </p>
    </div>
    """
    await send_email(signer_email, f"Action Required: Sign '{contract_title}'", html)


async def send_otp_email(signer_email: str, signer_name: str, otp: str, contract_title: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#111">ContractPilot</span>
      </div>
      <h2 style="color:#1d4ed8;margin-top:0">Your verification code</h2>
      <p style="color:#374151">Hi {signer_name or signer_email},</p>
      <p style="color:#374151">To sign <strong>{contract_title}</strong>, enter this code:</p>
      <div style="font-size:44px;font-weight:700;letter-spacing:14px;color:#111;margin:28px 0;
                  padding:24px;background:#f3f4f6;border-radius:10px;text-align:center">
        {otp}
      </div>
      <p style="color:#6b7280;font-size:13px">
        Expires in <strong>15 minutes</strong>. If you didn't request this, ignore this email.
      </p>
    </div>
    """
    await send_email(signer_email, f"Your verification code for '{contract_title}'", html)


async def send_signature_confirmation(signer_email: str, signer_name: str, contract_title: str,
                                      signed_at: str, content_hash: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#111">ContractPilot</span>
      </div>
      <h2 style="color:#16a34a;margin-top:0">✓ Contract Signed</h2>
      <p style="color:#374151">Hi {signer_name},</p>
      <p style="color:#374151">You have successfully signed <strong>{contract_title}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:20px 0;font-size:13px;color:#374151">
        <tr>
          <td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #e5e7eb;width:40%">Signed at</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">{signed_at}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280">Document hash (SHA-256)</td>
          <td style="padding:10px 12px;font-family:monospace;font-size:11px;word-break:break-all">{content_hash}</td>
        </tr>
      </table>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6">
        Keep this email as your signed record. The document hash uniquely identifies the exact
        version of the contract you signed.
      </p>
    </div>
    """
    await send_email(signer_email, f"Signed: '{contract_title}'", html)


async def send_owner_signed_notification(owner_email: str, owner_name: str, signer_name: str, signer_email: str, contract_title: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#111">ContractPilot</span>
      </div>
      <h2 style="color:#16a34a;margin-top:0">✓ Contract Signed</h2>
      <p style="color:#374151">Hi {owner_name or owner_email},</p>
      <p style="color:#374151">
        <strong>{signer_name} ({signer_email})</strong> has signed <strong>'{contract_title}'</strong>.
      </p>
      <p style="color:#9ca3af;font-size:12px">Log in to ContractPilot to view the audit trail.</p>
    </div>
    """
    await send_email(owner_email, f"Signed: '{contract_title}' — {signer_name} has signed", html)


async def send_reminder_email(owner_email: str, contract_title: str, end_date: str):
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#111">ContractPilot</span>
      </div>
      <h2 style="color:#d97706;margin-top:0">Contract Expiry Reminder</h2>
      <p style="color:#374151">
        <strong>{contract_title}</strong> is set to expire on <strong>{end_date}</strong>.
      </p>
      <p style="color:#374151">Please log in to ContractPilot to take action.</p>
    </div>
    """
    await send_email(owner_email, f"Reminder: '{contract_title}' expiring on {end_date}", html)
