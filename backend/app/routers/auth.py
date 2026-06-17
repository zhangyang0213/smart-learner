from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from datetime import datetime
from typing import Optional

from app.database.connection import get_db
from app.models.models import User
from app.services.cas_auth import cas_auth_service
from app.services.study_analyzer import study_analyzer

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.get("/cas/login")
async def cas_login():
    """获取CAS登录地址"""
    login_url = await cas_auth_service.get_login_url()
    return {"login_url": login_url}


@router.get("/cas/callback")
async def cas_callback(ticket: str = Query(...), db: AsyncSession = Depends(get_db)):
    """CAS认证回调"""
    user_info = await cas_auth_service.validate_ticket(ticket)
    if not user_info:
        raise HTTPException(status_code=401, detail="CAS认证失败")

    # 查找或创建用户
    result = await db.execute(select(User).where(User.student_id == user_info["student_id"]))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            student_id=user_info["student_id"],
            name=user_info.get("name", ""),
            college=user_info.get("college", ""),
            major=user_info.get("major", ""),
            grade=user_info.get("grade", ""),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # 更新用户信息
        user.name = user_info.get("name", user.name)
        user.college = user_info.get("college", user.college)
        user.major = user_info.get("major", user.major)
        user.updated_at = datetime.utcnow()
        await db.commit()

    return {
        "user_id": user.id,
        "student_id": user.student_id,
        "name": user.name,
        "college": user.college,
        "major": user.major,
    }


@router.get("/schedule/{user_id}")
async def get_schedule(user_id: int, semester: Optional[str] = None,
                       db: AsyncSession = Depends(get_db)):
    """获取课表"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    schedule = await cas_auth_service.fetch_schedule(user.student_id, semester)
    return {"schedule": schedule, "semester": semester or "2025-2026-2"}


@router.get("/profile/{user_id}")
async def get_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    """获取用户资料"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return {
        "id": user.id,
        "student_id": user.student_id,
        "name": user.name,
        "college": user.college,
        "major": user.major,
        "grade": user.grade,
        "avatar_url": user.avatar_url,
    }
