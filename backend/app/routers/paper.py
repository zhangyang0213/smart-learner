from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import uuid

from app.database.connection import get_db
from app.models.models import Document
from app.services.llm_service import llm_service
from app.services.file_parser import FileParser

router = APIRouter(prefix="/api/paper", tags=["论文精读"])


@router.post("/analyze")
async def analyze_paper(
    file: UploadFile = File(default=None),
    text: str = Form(default=""),
    user_id: int = Form(default=1),
):
    """论文深度分析"""
    paper_text = text
    if file:
        # 保存文件并用FileParser解析（支持PDF/DOCX/TXT等）
        file_ext = os.path.splitext(file.filename)[1]
        file_name = f"paper_{uuid.uuid4().hex[:8]}{file_ext}"
        file_path = os.path.join("uploads", file_name)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        try:
            paper_text = await FileParser.parse_file(file_path)
        except Exception:
            paper_text = content.decode("utf-8", errors="ignore")

    if not paper_text:
        raise HTTPException(status_code=400, detail="请提供论文文本或上传文件")

    analysis = await llm_service.analyze_paper(paper_text)
    return {"analysis": analysis}


@router.post("/summarize")
async def summarize_paper(
    text: str = Form(...),
    max_length: int = Form(default=500),
):
    """论文摘要"""
    summary = await llm_service.summarize(text, max_length)
    return {"summary": summary}


@router.post("/qa")
async def paper_qa(
    question: str = Form(...),
    paper_text: str = Form(...),
):
    """论文问答"""
    from app.services.llm_service import llm_service
    messages = [
        {"role": "system", "content": f"你是一个论文精读教练。请基于以下论文内容回答问题，并给出深入的分析和见解。\n\n论文内容：\n{paper_text[:6000]}"},
        {"role": "user", "content": question}
    ]
    answer = await llm_service.chat(messages)
    return {"answer": answer}


@router.post("/suggest-related")
async def suggest_related(
    paper_text: str = Form(...),
):
    """推荐关联文献"""
    messages = [
        {"role": "system", "content": """你是一个学术文献推荐助手。请根据论文内容，推荐相关的学术方向和关键词。
返回JSON格式：
{
    "related_topics": ["相关主题1", "相关主题2"],
    "search_keywords": ["搜索关键词1", "搜索关键词2"],
    "suggested_directions": ["研究方向1", "研究方向2"]
}"""},
        {"role": "user", "content": f"请分析以下论文并推荐相关文献方向：\n\n{paper_text[:4000]}"}
    ]
    result = await llm_service.chat(messages, temperature=0.5)
    import json
    try:
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0]
        elif "```" in result:
            result = result.split("```")[1].split("```")[0]
        return json.loads(result.strip())
    except json.JSONDecodeError:
        return {"raw_suggestion": result}
