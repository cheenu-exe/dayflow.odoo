import os
from datetime import date
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
import httpx

from app.db import get_db
from app.deps import get_current_user
from app.models import AttendanceRecord, EmployeeProfile, LeaveBalance, LeaveType, User

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):

    role: str  # "user", "assistant", "system"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    groq_api_key: str | None = None
    model: str = "openai/gpt-oss-120b"


class ChatResponse(BaseModel):
    reply: str
    source: str = "dayflow-ai"


DAYFLOW_SYSTEM_PROMPT = """You are Dayflow AI, the intelligent HR Operations Assistant for Dayflow HRMS.

### Identity & Branding Rules:
- You are Dayflow AI. Never mention Groq, OpenAI, LLaMA, GPT, ChatGPT, or underlying model architectures. 
- You are natively integrated into Dayflow HRMS.

### Strict Brevity & Conciseness Guidelines:
- Keep all responses SHORT, CRISP, and TO THE POINT (maximum 3 to 5 concise bullet points or 2-3 short sentences).
- Do not output long essays or walls of text.
- If asked about balances, attendance, or dates, state the exact numbers directly and succinctly.

### Domain Knowledge:
1. **Roles**: HR Admin (Sarah Jenkins), Employee (Alice Chen, Bob Okafor, Clara Vance, David Kim).
2. **Attendance**: 4 shift states (Present >7.5h, Half-day <4h, Absent, On Leave). Check-in window 08:30 - 10:00.
3. **Leave**: Paid Annual (20d), Sick (10d). Real-time ML Staffing Coverage Risk (Green <50%, Amber 50-70%, Red >70% team overlap).
4. **Payroll**: Deterministic calendar-day proration (Eligible Days / Days in Month * Gross). Mid-month joiners (Bob on Aug 15 = 17/31).
5. **Anomaly Engine**: IsolationForest flags >14.5h shifts, late check-ins, weekend shifts.
"""


def get_user_live_context(user: User, db: Session) -> str:
    profile = db.scalar(
        select(EmployeeProfile)
        .options(joinedload(EmployeeProfile.team))
        .where(EmployeeProfile.user_id == user.id)
    )
    if not profile:
        return f"\nActive User: {user.email} (Role: {user.role})"

    today = date.today()
    today_rec = db.scalar(
        select(AttendanceRecord).where(AttendanceRecord.user_id == user.id, AttendanceRecord.local_date == today)
    )
    att_status = "Checked In" if today_rec and not today_rec.check_out_utc else "Completed Shift" if today_rec else "Not Checked In Today"
    worked_str = f"{today_rec.worked_hours} hrs" if today_rec and today_rec.worked_hours else "0 hrs"

    balances = db.scalars(
        select(LeaveBalance)
        .options(joinedload(LeaveBalance.leave_type))
        .where(LeaveBalance.employee_id == profile.id, LeaveBalance.year == today.year)
    ).all()
    bal_str = ", ".join([f"{b.leave_type.name}: {b.remaining}d remaining" for b in balances if b.leave_type])

    return (
        f"\n### Active User Live Context:\n"
        f"- Name: {profile.full_name}, Role: {user.role} ({profile.job_title}), Team: {profile.team.name if profile.team else 'General'}\n"
        f"- Today's Attendance: {att_status} ({worked_str})\n"
        f"- Leave Balances ({today.year}): {bal_str or '20d Annual, 10d Sick'}\n"
    )


@router.post("", response_model=ChatResponse)
async def chat_with_copilot(
    payload: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ChatResponse:
    groq_key = payload.groq_api_key or os.environ.get("GROQ_API_KEY", "")


    user_live_ctx = get_user_live_context(current_user, db)
    full_system = DAYFLOW_SYSTEM_PROMPT + user_live_ctx

    groq_messages = [{"role": "system", "content": full_system}]
    for m in payload.messages:
        groq_messages.append({"role": m.role, "content": m.content})

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": payload.model if payload.model and "gpt-oss" in payload.model else "openai/gpt-oss-120b",
                    "messages": groq_messages,
                    "temperature": 0.3,
                    "max_tokens": 300,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                reply_text = data["choices"][0]["message"]["content"]
                return ChatResponse(reply=reply_text, source="dayflow-ai")
            else:
                return ChatResponse(
                    reply="I am ready to help you with Dayflow attendance, leave requests, or payroll calculations.",
                    source="dayflow-ai",
                )
    except Exception:
        return ChatResponse(
            reply="Hello! I am Dayflow AI. I can assist you with your attendance, leave applications, or payroll questions.",
            source="dayflow-ai",
        )
