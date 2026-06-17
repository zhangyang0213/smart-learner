from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database.connection import get_db
from app.models.models import LessonCourse, LessonContent, LearnerProfile, ExamRecord
from app.services.lesson_service import lesson_service

router = APIRouter(prefix="/api/lesson", tags=["课程学习"])


class OutlineRequest(BaseModel):
    materials: list[str]
    course_name: str
    user_id: int


class LessonGenerateRequest(BaseModel):
    course_name: str
    unit_name: str
    unit_index: int
    knowledge_points: list[str]
    materials: str
    learner_background: Optional[dict] = None


class FeedbackRequest(BaseModel):
    user_feedback: dict
    lesson_content: dict


class EvaluateRequest(BaseModel):
    user_feedback: dict
    lesson_content: dict


class ExamRequest(BaseModel):
    course_id: int
    exam_type: str = "final"


class GradeRequest(BaseModel):
    exam_id: int
    user_answers: dict


class ConsolidationRequest(BaseModel):
    exam_id: int
    round_num: int = 1


class ProfileUpdateRequest(BaseModel):
    goals: Optional[list] = None
    background: Optional[dict] = None
    preferences: Optional[dict] = None
    knowledge_transfer: Optional[list] = None


@router.post("/outline")
async def generate_outline(req: OutlineRequest, db: AsyncSession = Depends(get_db)):
    """生成课程脉络"""
    outline = await lesson_service.generate_course_outline(
        materials=req.materials,
        course_name=req.course_name,
        user_id=req.user_id,
    )

    lesson_course = LessonCourse(
        user_id=req.user_id,
        course_name=req.course_name,
        outline=outline,
        status="draft",
    )
    db.add(lesson_course)
    await db.commit()
    await db.refresh(lesson_course)

    return {"course_id": lesson_course.id, "outline": outline}


@router.post("/generate")
async def generate_lesson(req: LessonGenerateRequest, db: AsyncSession = Depends(get_db)):
    """生成单课内容"""
    # Find the lesson course
    result = await db.execute(
        select(LessonCourse).where(
            LessonCourse.course_name == req.course_name,
        ).order_by(LessonCourse.id.desc()).limit(1)
    )
    lesson_course = result.scalar_one_or_none()

    lesson_data = await lesson_service.generate_lesson(
        course_name=req.course_name,
        unit_name=req.unit_name,
        unit_index=req.unit_index,
        knowledge_points=req.knowledge_points,
        materials=req.materials,
        learner_background=req.learner_background,
    )

    lesson_content = LessonContent(
        lesson_course_id=lesson_course.id if lesson_course else 0,
        unit_index=req.unit_index,
        unit_name=req.unit_name,
        content=lesson_data,
        mastery_level="未接触",
    )
    db.add(lesson_content)
    await db.commit()
    await db.refresh(lesson_content)

    return {"lesson_id": lesson_content.id, "lesson": lesson_data}


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    """提交学习反馈"""
    evaluation = await lesson_service.evaluate_mastery(
        user_feedback=req.user_feedback,
        lesson_content=req.lesson_content,
    )
    return {"evaluation": evaluation}


@router.post("/evaluate")
async def evaluate_mastery(req: EvaluateRequest):
    """评估掌握度"""
    evaluation = await lesson_service.evaluate_mastery(
        user_feedback=req.user_feedback,
        lesson_content=req.lesson_content,
    )
    return {"evaluation": evaluation}


@router.post("/exam")
async def generate_exam(req: ExamRequest, db: AsyncSession = Depends(get_db)):
    """生成考试"""
    result = await db.execute(
        select(LessonCourse).where(LessonCourse.id == req.course_id)
    )
    lesson_course = result.scalar_one_or_none()
    if not lesson_course:
        raise HTTPException(status_code=404, detail="课程不存在")

    # Get all lesson contents for this course
    result = await db.execute(
        select(LessonContent).where(LessonContent.lesson_course_id == req.course_id)
    )
    lessons = result.scalars().all()

    lessons_data = [
        {"unit_name": l.unit_name, "content": l.content}
        for l in lessons
    ]

    exam_data = await lesson_service.generate_exam(
        course_outline=lesson_course.outline or {},
        lessons=lessons_data,
        exam_type=req.exam_type,
    )

    exam_record = ExamRecord(
        lesson_course_id=req.course_id,
        exam_type=req.exam_type,
        questions=exam_data.get("questions", []),
        round_num=1,
    )
    db.add(exam_record)
    await db.commit()
    await db.refresh(exam_record)

    return {"exam_id": exam_record.id, "exam": exam_data}


@router.post("/grade")
async def grade_exam(req: GradeRequest, db: AsyncSession = Depends(get_db)):
    """批改考试"""
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.id == req.exam_id)
    )
    exam_record = result.scalar_one_or_none()
    if not exam_record:
        raise HTTPException(status_code=404, detail="考试记录不存在")

    grading = await lesson_service.grade_exam(
        exam={"title": "", "questions": exam_record.questions},
        user_answers=req.user_answers,
    )

    exam_record.user_answers = req.user_answers
    exam_record.score = grading.get("total_score", 0)
    exam_record.graded = grading
    await db.commit()

    return {"grading": grading}


@router.post("/consolidation")
async def generate_consolidation(req: ConsolidationRequest, db: AsyncSession = Depends(get_db)):
    """生成巩固卷"""
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.id == req.exam_id)
    )
    exam_record = result.scalar_one_or_none()
    if not exam_record:
        raise HTTPException(status_code=404, detail="考试记录不存在")

    weak_points = exam_record.graded.get("weak_points", []) if exam_record.graded else []

    consolidation = await lesson_service.generate_consolidation(
        weak_points=weak_points,
        round_num=req.round_num,
    )

    new_exam = ExamRecord(
        lesson_course_id=exam_record.lesson_course_id,
        exam_type="consolidation",
        questions=consolidation.get("questions", []),
        round_num=req.round_num,
    )
    db.add(new_exam)
    await db.commit()
    await db.refresh(new_exam)

    return {"exam_id": new_exam.id, "consolidation": consolidation}


@router.get("/profile/{user_id}")
async def get_learner_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    """获取学习者背景"""
    result = await db.execute(
        select(LearnerProfile).where(LearnerProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return {"profile": {"goals": [], "background": {}, "preferences": {}, "knowledge_transfer": []}}
    return {
        "profile": {
            "goals": profile.goals or [],
            "background": profile.background or {},
            "preferences": profile.preferences or {},
            "knowledge_transfer": profile.knowledge_transfer or [],
        }
    }


@router.put("/profile/{user_id}")
async def update_learner_profile(user_id: int, req: ProfileUpdateRequest,
                                  db: AsyncSession = Depends(get_db)):
    """更新学习者背景"""
    result = await db.execute(
        select(LearnerProfile).where(LearnerProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        profile = LearnerProfile(
            user_id=user_id,
            goals=req.goals or [],
            background=req.background or {},
            preferences=req.preferences or {},
            knowledge_transfer=req.knowledge_transfer or [],
        )
        db.add(profile)
    else:
        if req.goals is not None:
            profile.goals = req.goals
        if req.background is not None:
            profile.background = req.background
        if req.preferences is not None:
            profile.preferences = req.preferences
        if req.knowledge_transfer is not None:
            profile.knowledge_transfer = req.knowledge_transfer

    await db.commit()
    await db.refresh(profile)

    return {
        "profile": {
            "goals": profile.goals or [],
            "background": profile.background or {},
            "preferences": profile.preferences or {},
            "knowledge_transfer": profile.knowledge_transfer or [],
        }
    }
