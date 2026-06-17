from fastapi import APIRouter, Depends, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.models import Team, TeamMember
from app.services.study_analyzer import study_analyzer

router = APIRouter(prefix="/api/team", tags=["团队协作"])


@router.post("/create")
async def create_team(
    name: str = Form(...),
    description: str = Form(default=""),
    course_id: Optional[int] = Form(default=None),
    user_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """创建学习小组"""
    team = Team(
        name=name,
        description=description,
        course_id=course_id,
        announcements=[],
        shared_todos=[],
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)

    # 创建者自动成为组长
    member = TeamMember(team_id=team.id, user_id=user_id, role="leader")
    db.add(member)
    await db.commit()

    return {"message": "小组创建成功", "team_id": team.id}


@router.post("/join")
async def join_team(
    team_id: int = Form(...),
    user_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """加入学习小组"""
    # 检查是否已在小组中
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    if result.scalar_one_or_none():
        return {"message": "已在小组中"}

    member = TeamMember(team_id=team_id, user_id=user_id, role="member")
    db.add(member)
    await db.commit()
    return {"message": "加入成功"}


@router.get("/list")
async def list_teams(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """获取用户的学习小组"""
    result = await db.execute(
        select(TeamMember, Team)
        .join(Team, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == user_id)
    )
    rows = result.all()

    return {
        "teams": [
            {
                "id": team.id,
                "name": team.name,
                "description": team.description,
                "role": member.role,
                "announcements": team.announcements,
                "shared_todos": team.shared_todos,
            }
            for member, team in rows
        ]
    }


@router.post("/announcement")
async def add_announcement(
    team_id: int = Form(...),
    content: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """添加小组公告"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        return {"message": "小组不存在"}

    announcements = team.announcements or []
    announcements.append({
        "content": content,
        "created_at": datetime.utcnow().isoformat(),
    })
    team.announcements = announcements
    await db.commit()
    return {"message": "公告发布成功"}


@router.post("/todo")
async def add_shared_todo(
    team_id: int = Form(...),
    title: str = Form(...),
    assignee_id: Optional[int] = Form(default=None),
    deadline: Optional[str] = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    """添加共享待办"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        return {"message": "小组不存在"}

    todos = team.shared_todos or []
    todos.append({
        "title": title,
        "assignee_id": assignee_id,
        "deadline": deadline,
        "completed": False,
        "created_at": datetime.utcnow().isoformat(),
    })
    team.shared_todos = todos
    await db.commit()
    return {"message": "待办添加成功"}


@router.put("/todo/{team_id}/{todo_index}")
async def toggle_todo(
    team_id: int,
    todo_index: int,
    db: AsyncSession = Depends(get_db),
):
    """切换待办完成状态"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team or not team.shared_todos:
        return {"message": "待办不存在"}

    if 0 <= todo_index < len(team.shared_todos):
        team.shared_todos[todo_index]["completed"] = not team.shared_todos[todo_index]["completed"]
        await db.commit()
        return {"message": "状态更新成功"}
    return {"message": "待办索引无效"}
