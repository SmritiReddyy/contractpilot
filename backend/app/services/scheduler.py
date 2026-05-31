from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import date
from app.core.database import SessionLocal
from app.models.contract import Contract, ContractStatus
from app.services.email_service import send_reminder_email
import asyncio

scheduler = AsyncIOScheduler()


async def check_reminders():
    db: Session = SessionLocal()
    try:
        today = date.today()

        # Send reminder emails for contracts with reminder_date == today
        contracts = (
            db.query(Contract)
            .filter(
                Contract.reminder_date == today,
                Contract.status.in_([ContractStatus.sent, ContractStatus.draft]),
            )
            .all()
        )

        for contract in contracts:
            if contract.owner and contract.owner.email:
                end_str = contract.end_date.isoformat() if contract.end_date else "unknown"
                await send_reminder_email(contract.owner.email, contract.title, end_str)

        # Mark expired contracts
        expired = (
            db.query(Contract)
            .filter(
                Contract.end_date < today,
                Contract.status.notin_([ContractStatus.expired, ContractStatus.signed]),
            )
            .all()
        )
        for contract in expired:
            contract.status = ContractStatus.expired
        db.commit()

    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(check_reminders, CronTrigger(hour=8, minute=0), id="daily_reminders", replace_existing=True)
    scheduler.start()
