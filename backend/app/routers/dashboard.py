from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Optional

from app.database.connection import get_db
from app.models.models import User, Course, Document, KnowledgeItem, StudyRecord, StudyPlan
from app.services.study_analyzer import study_analyzer

router = APIRouter(prefix="/api/dashboard", tags=["仪表盘"])


@router.get("/overview")
async def get_overview(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """获取仪表盘概览数据"""
    # 课程数
    course_count = await db.execute(
        select(func.count()).select_from(
            Course.__table__.join(
                "user_courses",
                Course.id == __import__("sqlalchemy").column("user_courses", "course_id")
            )
        )
    )

    # 简化查询
    # 知识条目数
    knowledge_count = await db.execute(
        select(func.count(KnowledgeItem.id)).where(
            KnowledgeItem.user_id == user_id,
            KnowledgeItem.is_archived == False,
        )
    )

    # 文档数
    doc_count = await db.execute(
        select(func.count(Document.id)).where(Document.user_id == user_id)
    )

    # 今日学习时长
    today = datetime.utcnow().replace(hour=0, minute=0, second=0)
    today_duration = await db.execute(
        select(func.sum(StudyRecord.duration)).where(
            StudyRecord.user_id == user_id,
            StudyRecord.date >= today,
        )
    )

    # 活跃学习计划
    active_plans = await db.execute(
        select(func.count(StudyPlan.id)).where(
            StudyPlan.user_id == user_id,
            StudyPlan.status == "active",
        )
    )

    # 本周学习记录
    week_ago = datetime.utcnow() - timedelta(days=7)
    week_records = await db.execute(
        select(StudyRecord).where(
            StudyRecord.user_id == user_id,
            StudyRecord.date >= week_ago,
        )
    )
    records = week_records.all()
    records_data = [
        {
            "subject": r.subject,
            "duration": r.duration,
            "activity_type": r.activity_type,
            "date": r.date.isoformat() if r.date else None,
        }
        for r in records
    ]

    stats = study_analyzer.calculate_study_stats(records_data)
    efficiency = study_analyzer.get_efficiency_score(records_data)

    return {
        "course_count": course_count.scalar() or 0,
        "knowledge_count": knowledge_count.scalar() or 0,
        "document_count": doc_count.scalar() or 0,
        "today_study_minutes": today_duration.scalar() or 0,
        "active_plans": active_plans.scalar() or 0,
        "weekly_stats": stats,
        "efficiency_score": efficiency,
        "streak_days": stats["streak_days"],
    }


@router.get("/recent-activities")
async def get_recent_activities(
    user_id: int = Query(...),
    limit: int = Query(default=10),
    db: AsyncSession = Depends(get_db),
):
    """获取最近活动"""
    # 最近学习记录
    recent_records = await db.execute(
        select(StudyRecord)
        .where(StudyRecord.user_id == user_id)
        .order_by(StudyRecord.created_at.desc())
        .limit(limit)
    )
    records = recent_records.all()

    # 最近知识条目
    recent_knowledge = await db.execute(
        select(KnowledgeItem)
        .where(KnowledgeItem.user_id == user_id)
        .order_by(KnowledgeItem.created_at.desc())
        .limit(limit)
    )
    knowledge_items = recent_knowledge.all()

    activities = []

    for r in records:
        activities.append({
            "type": "study",
            "subject": r.subject,
            "duration": r.duration,
            "activity_type": r.activity_type,
            "time": r.created_at.isoformat() if r.created_at else None,
        })

    for k in knowledge_items:
        activities.append({
            "type": "knowledge",
            "title": k.title,
            "category": k.category,
            "time": k.created_at.isoformat() if k.created_at else None,
        })

    # 按时间排序
    activities.sort(key=lambda x: x.get("time", ""), reverse=True)

    return {"activities": activities[:limit]}
