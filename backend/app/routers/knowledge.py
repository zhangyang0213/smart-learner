from fastapi import APIRouter, Depends, HTTPException, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import json

from app.database.connection import get_db
from app.models.models import KnowledgeItem
from app.services.rag_engine import rag_engine
from app.services.llm_service import llm_service
from app.services.embedding_service import embedding_service

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])


@router.post("/add")
async def add_knowledge(
    title: str = Form(...),
    content: str = Form(...),
    source: str = Form(default=""),
    category: str = Form(default="未分类"),
    tags: str = Form(default=""),
    user_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """添加知识条目"""
    tags_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    # 索引到向量数据库
    vector_ids = await rag_engine.index_document(
        text=content,
        user_id=user_id,
        source=source or title,
        doc_type="knowledge",
        title=title,
    )

    knowledge = KnowledgeItem(
        user_id=user_id,
        title=title,
        content=content,
        source=source,
        category=category,
        tags=tags_list,
        vector_id=vector_ids[0] if vector_ids else None,
    )
    db.add(knowledge)
    await db.commit()
    await db.refresh(knowledge)

    return {"message": "知识条目添加成功", "id": knowledge.id}


@router.get("/search")
async def search_knowledge(
    query: str = Query(...),
    user_id: int = Query(...),
    top_k: int = Query(default=10),
    category: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """自然语言搜索知识库"""
    # 向量检索
    results = await rag_engine.search(query, user_id, top_k)

    # 如果指定了分类，额外过滤
    if category:
        stmt = select(KnowledgeItem).where(
            KnowledgeItem.user_id == user_id,
            KnowledgeItem.category == category,
            KnowledgeItem.is_archived == False,
        )
        db_result = await db.execute(stmt)
        db_items = db_result.all()
        # 合并结果
        for item in db_items:
            results.append({
                "id": item.id,
                "title": item.title,
                "source": item.source,
                "category": item.category,
                "tags": item.tags,
                "score": 0,
            })

    return {"results": results, "query": query}


@router.post("/ask")
async def ask_knowledge_base(
    question: str = Form(...),
    user_id: int = Form(...),
):
    """知识库问答"""
    result = await rag_engine.query_knowledge_base(question, user_id)
    return result


@router.post("/ask/stream")
async def ask_knowledge_base_stream(
    question: str = Form(...),
    user_id: int = Form(...),
):
    """知识库问答 - 流式响应"""
    async def event_generator():
        async for chunk in rag_engine.query_knowledge_base_stream(question, user_id):
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


@router.get("/categories")
async def list_categories(user_id: int = Query(...), db: AsyncSession = Depends(get_db)):
    """获取知识分类列表"""
    stmt = select(KnowledgeItem.category).where(
        KnowledgeItem.user_id == user_id,
        KnowledgeItem.is_archived == False,
    ).distinct()
    result = await db.execute(stmt)
    categories = [row[0] for row in result.all()]
    return {"categories": categories}


@router.get("/items")
async def list_knowledge_items(
    user_id: int = Query(...),
    category: Optional[str] = Query(default=None),
    page: int = Query(default=1),
    page_size: int = Query(default=20),
    db: AsyncSession = Depends(get_db),
):
    """获取知识条目列表"""
    stmt = select(KnowledgeItem).where(
        KnowledgeItem.user_id == user_id,
        KnowledgeItem.is_archived == False,
    )
    if category:
        stmt = stmt.where(KnowledgeItem.category == category)
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    items = result.all()

    return {
        "items": [
            {
                "id": item.id,
                "title": item.title,
                "source": item.source,
                "category": item.category,
                "tags": item.tags,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
        "page": page,
        "page_size": page_size,
    }


@router.put("/{item_id}/archive")
async def archive_knowledge(item_id: int, db: AsyncSession = Depends(get_db)):
    """归档知识条目"""
    result = await db.execute(select(KnowledgeItem).where(KnowledgeItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="知识条目不存在")

    item.is_archived = True
    await db.commit()
    return {"message": "归档成功"}
