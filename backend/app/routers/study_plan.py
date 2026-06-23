from fastapi import APIRouter, Depends, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.models import StudyPlan, StudyRecord
from app.services.llm_service import llm_service
from app.services.study_analyzer import study_analyzer

router = APIRouter(prefix="/api/study", tags=["学习规划"])


@router.post("/plan/create")
async def create_study_plan(
    title: str = Form(...),
    goal: str = Form(...),
    plan_type: str = Form(default="考试"),
    start_date: str = Form(...),
    end_date: str = Form(...),
    subjects: str = Form(default=""),
    user_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """创建学习计划"""
    subjects_list = [s.strip() for s in subjects.split(",") if s.strip()]

    # AI生成学习规划
    duration_days = (datetime.strptime(end_date, "%Y-%m-%d") -
                     datetime.strptime(start_date, "%Y-%m-%d")).days
    ai_plan = await llm_service.plan_study(goal, duration_days, subjects_list)

    plan = StudyPlan(
        user_id=user_id,
        title=title,
        goal=goal,
        plan_type=plan_type,
        start_date=datetime.strptime(start_date, "%Y-%m-%d"),
        end_date=datetime.strptime(end_date, "%Y-%m-%d"),
        milestones=ai_plan.get("phases", []),
        status="active",
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return {
        "plan_id": plan.id,
        "ai_plan": ai_plan,
        "message": "学习计划创建成功",
    }


@router.get("/plan/list")
async def list_study_plans(
    user_id: int = Query(...),
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """获取学习计划列表"""
    stmt = select(StudyPlan).where(StudyPlan.user_id == user_id)
    if status:
        stmt = stmt.where(StudyPlan.status == status)
    result = await db.execute(stmt)
    plans = result.scalars().all()

    return {
        "plans": [
            {
                "id": p.id,
                "title": p.title,
                "goal": p.goal,
                "plan_type": p.plan_type,
                "start_date": p.start_date.isoformat() if p.start_date else None,
                "end_date": p.end_date.isoformat() if p.end_date else None,
                "progress": p.progress,
                "status": p.status,
                "milestones": p.milestones,
            }
            for p in plans
        ]
    }


@router.post("/record")
async def add_study_record(
    user_id: int = Form(...),
    subject: str = Form(...),
    duration: int = Form(...),
    activity_type: str = Form(default="阅读"),
    date: str = Form(default=None),
    summary: str = Form(default=""),
    score: Optional[float] = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    """记录学习活动"""
    record = StudyRecord(
        user_id=user_id,
        date=datetime.strptime(date, "%Y-%m-%d") if date else datetime.utcnow(),
        duration=duration,
        subject=subject,
        activity_type=activity_type,
        summary=summary,
        score=score,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return {"message": "学习记录添加成功", "record_id": record.id}


@router.get("/stats")
async def get_study_stats(
    user_id: int = Query(...),
    days: int = Query(default=7),
    db: AsyncSession = Depends(get_db),
):
    """获取学习统计"""
    since = datetime.utcnow() - __import__("datetime").timedelta(days=days)
    stmt = select(StudyRecord).where(
        StudyRecord.user_id == user_id,
        StudyRecord.date >= since,
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    records_data = [
        {
            "subject": r.subject,
            "duration": r.duration,
            "activity_type": r.activity_type,
            "date": r.date.isoformat() if r.date else None,
            "score": r.score,
        }
        for r in records
    ]

    stats = study_analyzer.calculate_study_stats(records_data)
    efficiency = study_analyzer.get_efficiency_score(records_data)

    return {"stats": stats, "efficiency_score": efficiency}


@router.get("/daily-report")
async def get_daily_report(
    user_id: int = Query(...),
    date: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """获取智能日报"""
    target_date = datetime.strptime(date, "%Y-%m-%d") if date else datetime.utcnow()
    start = target_date.replace(hour=0, minute=0, second=0)
    end = target_date.replace(hour=23, minute=59, second=59)

    stmt = select(StudyRecord).where(
        StudyRecord.user_id == user_id,
        StudyRecord.date >= start,
        StudyRecord.date <= end,
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    records_data = [
        {
            "subject": r.subject,
            "duration": r.duration,
            "activity_type": r.activity_type,
        }
        for r in records
    ]

    if not records_data:
        return {"report": "今日暂无学习记录，开始学习吧！", "date": target_date.isoformat()}

    report = await study_analyzer.generate_ai_report(records_data)
    return {"report": report, "date": target_date.isoformat()}
