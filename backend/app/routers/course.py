from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import os
import hashlib
import uuid
import json

from app.database.connection import get_db
from app.models.models import Course, UserCourse, Document
from app.services.rag_engine import rag_engine
from app.services.llm_service import llm_service
from app.services.file_parser import file_parser

router = APIRouter(prefix="/api/course", tags=["课程问答"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/list")
async def list_courses(user_id: int = Query(...), db: AsyncSession = Depends(get_db)):
    """获取用户的课程列表"""
    result = await db.execute(
        select(UserCourse, Course)
        .join(Course, UserCourse.course_id == Course.id)
        .where(UserCourse.user_id == user_id)
    )
    rows = result.all()
    courses = [
        {
            "id": course.id,
            "name": course.name,
            "code": course.code,
            "teacher": course.teacher,
            "semester": course.semester,
            "schedule": course.schedule,
            "is_favorite": uc.is_favorite,
        }
        for uc, course in rows
    ]
    return {"courses": courses}


@router.post("/add")
async def add_course(
    name: str = Form(...),
    code: str = Form(...),
    teacher: str = Form(default=""),
    semester: str = Form(default=""),
    user_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """添加课程"""
    course = Course(name=name, code=code, teacher=teacher, semester=semester)
    db.add(course)
    await db.commit()
    await db.refresh(course)

    user_course = UserCourse(user_id=user_id, course_id=course.id)
    db.add(user_course)
    await db.commit()

    return {"message": "课程添加成功", "course_id": course.id}


@router.post("/upload")
async def upload_document(
    course_id: int = Form(...),
    user_id: int = Form(...),
    doc_type: str = Form(default="课件"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """上传课程文档"""
    # 保存文件
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    content_hash = hashlib.sha256(content).hexdigest()

    # 使用文件解析器读取文本内容（支持PDF、DOCX等）
    text_content = await file_parser.parse_file(file_path)

    # 创建文档记录
    document = Document(
        course_id=course_id,
        user_id=user_id,
        title=file.filename,
        doc_type=doc_type,
        file_path=file_path,
        file_size=len(content),
        content_hash=content_hash,
        status="processing",
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # 异步索引到向量数据库
    try:
        vector_ids = await rag_engine.index_document(
            text=text_content,
            user_id=user_id,
            source=file.filename,
            doc_type=doc_type,
            title=file.filename,
        )
        document.chunk_count = len(vector_ids)
        document.status = "completed"
    except Exception as e:
        document.status = "failed"
        print(f"索引失败: {e}")

    await db.commit()

    return {
        "message": "文档上传成功",
        "document_id": document.id,
        "status": document.status,
        "chunk_count": document.chunk_count,
    }


@router.post("/ask")
async def ask_course_question(
    question: str = Form(...),
    user_id: int = Form(...),
    course_id: Optional[int] = Form(default=None),
):
    """课程问答"""
    result = await rag_engine.query_course(question, user_id, course_id)
    return result


@router.post("/ask/stream")
async def ask_course_question_stream(
    question: str = Form(...),
    user_id: int = Form(...),
    course_id: Optional[int] = Form(default=None),
):
    """课程问答 - 流式响应"""
    async def event_generator():
        async for chunk in rag_engine.query_course_stream(question, user_id, course_id):
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/quiz/generate")
async def generate_quiz(
    document_id: int = Form(...),
    num_questions: int = Form(default=5),
    difficulty: str = Form(default="medium"),
    db: AsyncSession = Depends(get_db),
):
    """根据课程文档生成测验"""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 读取文档内容
    with open(document.file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    quiz_data = await llm_service.generate_quiz(content, num_questions, difficulty)
    return {"quiz": quiz_data, "document_title": document.title}
