import json
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from fastapi.responses import StreamingResponse
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
async def generate_lesson(
    lesson_course_id: int = Form(...),
    unit_index: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """生成单课内容 - 使用存储的课件材料"""
    # Get the lesson course with stored materials
    result = await db.execute(
        select(LessonCourse).where(LessonCourse.id == lesson_course_id)
    )
    lesson_course = result.scalar_one_or_none()
    if not lesson_course:
        raise HTTPException(status_code=404, detail="课程不存在")

    outline = lesson_course.outline or {}
    units = outline.get("units", [])

    if unit_index < 0 or unit_index >= len(units):
        raise HTTPException(status_code=400, detail="单元索引超出范围")

    unit = units[unit_index]
    materials = lesson_course.materials_text or ""

    lesson_data = await lesson_service.generate_lesson(
        course_name=lesson_course.course_name,
        unit_name=unit.get("name", f"第{unit_index+1}单元"),
        unit_index=unit_index,
        knowledge_points=unit.get("knowledge_points", []),
        materials=materials,
    )

    # Save to database
    lesson_content = LessonContent(
        lesson_course_id=lesson_course_id,
        unit_index=unit_index,
        unit_name=unit.get("name", ""),
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
async def evaluate_mastery(
    lesson_course_id: int = Form(...),
    unit_index: int = Form(...),
    can_retell: str = Form(default=""),
    stuck_at: str = Form(default=""),
    difficulty: int = Form(default=3),
    db: AsyncSession = Depends(get_db),
):
    """评估掌握度"""
    # Get the lesson content
    result = await db.execute(
        select(LessonContent).where(
            LessonContent.lesson_course_id == lesson_course_id,
            LessonContent.unit_index == unit_index,
        ).order_by(LessonContent.id.desc()).limit(1)
    )
    lesson = result.scalar_one_or_none()

    lesson_content = lesson.content if lesson else {}
    user_feedback = {
        "can_retell": can_retell,
        "stuck_at": stuck_at,
        "difficulty": difficulty,
    }

    evaluation = await lesson_service.evaluate_mastery(
        user_feedback=user_feedback,
        lesson_content=lesson_content,
    )

    # Update mastery level
    if lesson:
        lesson.mastery_level = evaluation.get("mastery_level", "未接触")
        await db.commit()

    return {"evaluation": evaluation}


@router.post("/exam")
async def generate_exam(
    lesson_course_id: int = Form(...),
    exam_type: str = Form(default="final"),
    db: AsyncSession = Depends(get_db),
):
    """生成考试"""
    result = await db.execute(
        select(LessonCourse).where(LessonCourse.id == lesson_course_id)
    )
    lesson_course = result.scalar_one_or_none()
    if not lesson_course:
        raise HTTPException(status_code=404, detail="课程不存在")

    # Get all lesson contents for this course
    result = await db.execute(
        select(LessonContent).where(LessonContent.lesson_course_id == lesson_course_id)
    )
    lessons = result.scalars().all()

    lessons_data = [
        {"unit_name": l.unit_name, "content": l.content}
        for l in lessons
    ]

    # If no lesson contents yet, use the outline and materials
    if not lessons_data:
        lessons_data = [{"unit_name": "课程材料", "content": {"text": lesson_course.materials_text or ""}}]

    exam_data = await lesson_service.generate_exam(
        course_outline=lesson_course.outline or {},
        lessons=lessons_data,
        exam_type=exam_type,
    )

    exam_record = ExamRecord(
        lesson_course_id=lesson_course_id,
        exam_type=exam_type,
        questions=exam_data.get("questions", []),
        round_num=1,
    )
    db.add(exam_record)
    await db.commit()
    await db.refresh(exam_record)

    return {"exam_id": exam_record.id, "exam": exam_data}


@router.post("/grade")
async def grade_exam(
    exam_id: int = Form(...),
    user_answers: str = Form(default="{}"),  # JSON string
    db: AsyncSession = Depends(get_db),
):
    """批改考试"""
    import json as _json
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.id == exam_id)
    )
    exam_record = result.scalar_one_or_none()
    if not exam_record:
        raise HTTPException(status_code=404, detail="考试记录不存在")

    try:
        answers_dict = _json.loads(user_answers)
    except:
        answers_dict = {}

    grading = await lesson_service.grade_exam(
        exam={"title": "", "questions": exam_record.questions},
        user_answers=answers_dict,
    )

    exam_record.user_answers = answers_dict
    exam_record.score = grading.get("total_score", 0)
    exam_record.graded = grading
    await db.commit()

    return {"grading": grading}


@router.post("/consolidation")
async def generate_consolidation(
    exam_id: int = Form(...),
    round_num: int = Form(default=1),
    db: AsyncSession = Depends(get_db),
):
    """生成巩固卷"""
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.id == exam_id)
    )
    exam_record = result.scalar_one_or_none()
    if not exam_record:
        raise HTTPException(status_code=404, detail="考试记录不存在")

    weak_points = exam_record.graded.get("weak_points", []) if exam_record.graded else []

    consolidation = await lesson_service.generate_consolidation(
        weak_points=weak_points,
        round_num=round_num,
    )

    new_exam = ExamRecord(
        lesson_course_id=exam_record.lesson_course_id,
        exam_type="consolidation",
        questions=consolidation.get("questions", []),
        round_num=round_num,
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


@router.post("/upload-and-learn")
async def upload_and_learn(
    files: list[UploadFile] = File(...),
    course_name: str = Form(...),
    user_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """上传多个课件文件，解析内容，索引到向量库，生成课程脉络"""
    from app.services.file_parser import FileParser
    from app.services.rag_engine import rag_engine

    # Ensure uploads directory exists
    os.makedirs("uploads", exist_ok=True)

    all_text = []
    file_records = []

    for file in files:
        # Save file
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join("uploads", file_name)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Parse file
        try:
            text = await FileParser.parse_file(file_path)
            if text:
                all_text.append(text)
                file_records.append({"name": file.filename, "size": len(content), "status": "parsed", "chars": len(text)})
            else:
                file_records.append({"name": file.filename, "size": len(content), "status": "empty"})
        except Exception as e:
            file_records.append({"name": file.filename, "size": len(content), "status": "failed", "error": str(e)})

    if not all_text:
        return {"error": "No text could be extracted from the uploaded files", "files": file_records}

    # Combine all text
    combined_text = "\n\n---\n\n".join(all_text)

    # Index to vector database
    try:
        vector_ids = await rag_engine.index_document(
            text=combined_text,
            user_id=user_id,
            source=course_name,
            doc_type="course_material",
            title=course_name,
        )
    except Exception:
        vector_ids = []

    # Generate course outline using ko-lesson methodology
    outline = await lesson_service.generate_course_outline(
        materials=all_text,
        course_name=course_name,
        user_id=user_id,
    )

    # Save to database
    lesson_course = LessonCourse(
        user_id=user_id,
        course_name=course_name,
        outline=outline,
        materials_text=combined_text,
        status="active",
    )
    db.add(lesson_course)
    await db.commit()
    await db.refresh(lesson_course)

    return {
        "lesson_course_id": lesson_course.id,
        "course_name": course_name,
        "files": file_records,
        "total_chars": len(combined_text),
        "vector_count": len(vector_ids),
        "outline": outline,
    }


@router.post("/chat")
async def chat_about_course(
    lesson_course_id: int = Form(...),
    question: str = Form(...),
    user_id: int = Form(...),
):
    """基于课程材料的RAG问答"""
    from app.services.rag_engine import rag_engine
    result = await rag_engine.query_course(question, user_id, course_id=lesson_course_id)
    return result


@router.post("/chat/stream")
async def chat_about_course_stream(
    lesson_course_id: int = Form(...),
    question: str = Form(...),
    user_id: int = Form(...),
):
    """基于课程材料的RAG流式问答"""
    from app.services.rag_engine import rag_engine

    async def generate():
        async for chunk in rag_engine.query_course_stream(question, user_id, course_id=lesson_course_id):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
