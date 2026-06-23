from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
import json
import os
import uuid

from app.database.connection import get_db
from app.models.models import User
from app.services.schedule_parser import schedule_parser
from app.services.file_parser import FileParser

router = APIRouter(prefix="/api/auth", tags=["认证与课表"])


@router.post("/register")
async def register_user(
    student_id: str = Form(...),
    name: str = Form(...),
    college: str = Form(default=""),
    major: str = Form(default=""),
    grade: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    """用户注册/登录（填写学号姓名即可）"""
    result = await db.execute(select(User).where(User.student_id == student_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            student_id=student_id,
            name=name,
            college=college,
            major=major,
            grade=grade,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.name = name
        user.college = college or user.college
        user.major = major or user.major
        user.grade = grade or user.grade
        user.updated_at = datetime.utcnow()
        await db.commit()

    return {
        "user_id": user.id,
        "student_id": user.student_id,
        "name": user.name,
        "college": user.college,
        "major": user.major,
        "grade": user.grade,
    }


@router.post("/upload-schedule")
async def upload_schedule(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """上传课表文件（docx格式），解析并存储"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 保存文件
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"schedule_{user_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join("uploads", file_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # 解析文件内容
    try:
        text = await FileParser.parse_file(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="文件内容为空")

    # 解析课表
    schedule_data = schedule_parser.parse_full_schedule(text)

    # 将课表数据存入用户cas_token字段（复用字段存储JSON）
    user.cas_token = json.dumps(schedule_data, ensure_ascii=False)
    await db.commit()

    return {
        "message": "课表上传解析成功",
        "info": schedule_data["info"],
        "current_week": schedule_data["current_week"],
        "total_courses": schedule_data["total_courses"],
        "current_week_courses": schedule_data["current_week_courses"],
    }


@router.get("/schedule/")
async def get_schedule_no_user(
    week: Optional[int] = Query(default=None),
):
    """获取课表（未指定用户ID时返回空课表）"""
    return {
        "schedule": [],
        "current_week": schedule_parser.get_current_week(),
        "message": "请先登录后再查看课表",
    }


@router.get("/schedule/{user_id}")
async def get_schedule(
    user_id: int,
    week: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """获取课表，可指定周次（默认当前周）"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return {
            "schedule": [],
            "current_week": schedule_parser.get_current_week(),
            "message": "用户不存在，请先登录",
        }

    if not user.cas_token:
        return {
            "schedule": [],
            "current_week": schedule_parser.get_current_week(),
            "message": "尚未上传课表",
        }

    try:
        schedule_data = json.loads(user.cas_token)
    except json.JSONDecodeError:
        return {
            "schedule": [],
            "current_week": schedule_parser.get_current_week(),
            "message": "课表数据异常",
        }

    current_week = schedule_parser.get_current_week()
    target_week = week or current_week

    # 过滤指定周次的课程
    all_courses = schedule_data.get("courses", [])
    week_courses = [c for c in all_courses if target_week in c.get("weeks", [])]

    return {
        "info": schedule_data.get("info", {}),
        "schedule": week_courses,
        "all_courses": all_courses,
        "current_week": current_week,
        "target_week": target_week,
        "total_courses": len(all_courses),
    }


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
