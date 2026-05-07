"""Email API endpoints — trigger digest or test email."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models import Job
from app.schemas import SuccessResponse

router = APIRouter()


@router.post("/send-digest", response_model=SuccessResponse)
async def send_digest_now(db: AsyncSession = Depends(get_db)):
    """Manually trigger email digest."""
    from app.workers.tasks import send_email_digest_task
    send_email_digest_task.delay()
    return SuccessResponse(message="Email digest triggered")


@router.post("/test", response_model=SuccessResponse)
async def send_test_email():
    """Send a test email to verify SMTP configuration."""
    from app.emails.sender import send_test_email
    result = await send_test_email()
    if result:
        return SuccessResponse(message="Test email sent successfully")
    return SuccessResponse(ok=False, message="Failed to send test email")
