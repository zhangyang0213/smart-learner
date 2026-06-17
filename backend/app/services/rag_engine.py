import re
from typing import Optional, AsyncGenerator
from app.services.embedding_service import embedding_service
from app.services.vector_service import vector_service
from app.services.llm_service import llm_service


class DocumentParser:
    """文档解析器 - 支持多种文档格式"""

    @staticmethod
    def parse_text(content: str) -> str:
        """纯文本解析"""
        return content.strip()

    @staticmethod
    def parse_markdown(content: str) -> str:
        """Markdown解析，提取纯文本"""
        # 移除图片标签
        text = re.sub(r'!\[.*?\]\(.*?\)', '', content)
        # 移除链接，保留文本
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
        # 移除标题标记
        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
        # 移除粗体/斜体标记
        text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
        return text.strip()


class SemanticChunker:
    """语义分块器 - 智能文本分块"""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50,
                 min_chunk_size: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size

    def chunk_by_paragraph(self, text: str) -> list[str]:
        """按段落分块"""
        paragraphs = re.split(r'\n\s*\n', text)
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) <= self.chunk_size:
                current_chunk += "\n\n" + para if current_chunk else para
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                # 如果单个段落超过chunk_size，需要进一步分割
                if len(para) > self.chunk_size:
                    sub_chunks = self._split_long_text(para)
                    chunks.extend(sub_chunks[:-1])
                    current_chunk = sub_chunks[-1] if sub_chunks else ""
                else:
                    current_chunk = para

        if current_chunk and len(current_chunk) >= self.min_chunk_size:
            chunks.append(current_chunk.strip())

        return chunks

    def _split_long_text(self, text: str) -> list[str]:
        """分割超长文本"""
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            # 尝试在句子边界处分割
            if end < len(text):
                # 找最近的句号、问号、感叹号
                for sep in ['。', '！', '？', '.', '!', '?', '\n']:
                    last_sep = text.rfind(sep, start, end)
                    if last_sep > start:
                        end = last_sep + 1
                        break
            chunks.append(text[start:end].strip())
            start = end - self.chunk_overlap
        return [c for c in chunks if len(c) >= self.min_chunk_size]

    def chunk_with_metadata(self, text: str, source: str = "",
                            doc_type: str = "") -> list[dict]:
        """分块并附加元数据"""
        chunks = self.chunk_by_paragraph(text)
        return [
            {
                "content": chunk,
                "source": source,
                "doc_type": doc_type,
                "chunk_index": i,
                "char_count": len(chunk),
            }
            for i, chunk in enumerate(chunks)
        ]


class RAGEngine:
    """RAG检索增强生成引擎"""

    def __init__(self):
        self.chunker = SemanticChunker()

    async def index_document(self, text: str, user_id: int, source: str = "",
                             doc_type: str = "", title: str = "") -> list[str]:
        """将文档索引到向量数据库"""
        chunks = self.chunker.chunk_with_metadata(text, source, doc_type)

        if not chunks:
            return []

        # 批量生成嵌入
        texts = [c["content"] for c in chunks]
        embeddings = await embedding_service.embed_batch(texts)

        # 构建向量数据
        vectors = []
        vector_ids = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            vector_id = f"{source}_{user_id}_{i}"
            vector_ids.append(vector_id)
            vectors.append({
                "id": vector_id,
                "vector": embedding,
                "fields": {
                    "user_id": user_id,
                    "doc_type": doc_type,
                    "source": source,
                    "title": title or source,
                    "chunk_index": i,
                }
            })

        # 批量插入向量数据库
        await vector_service.batch_insert(vectors)
        return vector_ids

    async def search(self, query: str, user_id: int, top_k: int = 5,
                     doc_type: str = None) -> list[dict]:
        """语义检索"""
        query_embedding = await embedding_service.embed(query)

        # ChromaDB where filter
        where_filter = {"user_id": user_id}
        if doc_type:
            where_filter = {"$and": [{"user_id": user_id}, {"doc_type": doc_type}]}

        results = await vector_service.search(
            vector=query_embedding,
            top_k=top_k,
            filter_expr=where_filter
        )

        return [
            {
                "content": doc.get("document", ""),
                "source": doc.get("metadata", {}).get("source", ""),
                "doc_type": doc.get("metadata", {}).get("doc_type", ""),
                "score": 1 - doc.get("distance", 0),  # Convert cosine distance to similarity
                "chunk_index": doc.get("metadata", {}).get("chunk_index", 0),
                "title": doc.get("metadata", {}).get("title", ""),
            }
            for doc in results
        ]

    async def query(self, question: str, user_id: int, top_k: int = 5,
                    doc_type: str = None, system_prompt: str = None) -> dict:
        """RAG问答：检索 + 生成"""
        # 1. 检索相关文档
        search_results = await self.search(question, user_id, top_k, doc_type)

        # 2. 获取文档内容
        context = [r.get("content", "") for r in search_results if r.get("content")]

        # 3. LLM生成回答
        answer = await llm_service.chat_with_context(
            query=question,
            context=context,
            system_prompt=system_prompt
        )

        return {
            "answer": answer,
            "sources": search_results,
            "question": question,
        }

    async def query_course(self, question: str, user_id: int,
                           course_id: int = None) -> dict:
        """课程专属问答"""
        system_prompt = """你是一个课程专属问答助手。请基于提供的课件和教材内容回答学生的问题。
回答要求：
1. 优先引用课件/教材中的内容
2. 用通俗易懂的语言解释专业概念
3. 如果有相关例题，可以举例说明
4. 标注信息来源"""
        return await self.query(question, user_id, system_prompt=system_prompt)

    async def query_knowledge_base(self, question: str, user_id: int) -> dict:
        """个人知识库问答"""
        system_prompt = """你是一个个人知识库管家。请基于用户收藏和整理的知识内容回答问题。
回答要求：
1. 精准定位相关知识点
2. 提供完整的知识上下文
3. 如有关联知识，一并提及"""
        return await self.query(question, user_id, system_prompt=system_prompt)

    async def query_stream(self, question: str, user_id: int, top_k: int = 5,
                           doc_type: str = None, system_prompt: str = None) -> AsyncGenerator[str, None]:
        """RAG流式问答：检索 + 流式生成"""
        search_results = await self.search(question, user_id, top_k, doc_type)
        context = [r.get("content", "") for r in search_results if r.get("content")]

        context_text = "\n\n".join([f"【参考资料{i+1}】\n{c}" for i, c in enumerate(context)])
        default_system = f"""你是一个专业的学习助手和知识管家。请基于以下参考资料回答用户的问题。
如果参考资料中没有相关信息，请明确说明，并尝试根据你的知识给出合理的回答。
回答时要标注信息来源的参考编号。

{context_text}"""

        messages = [
            {"role": "system", "content": system_prompt or default_system},
            {"role": "user", "content": question}
        ]
        async for chunk in llm_service.chat_stream(messages):
            yield chunk

    async def query_course_stream(self, question: str, user_id: int,
                                  course_id: int = None) -> AsyncGenerator[str, None]:
        """课程专属流式问答"""
        system_prompt = """你是一个课程专属问答助手。请基于提供的课件和教材内容回答学生的问题。
回答要求：
1. 优先引用课件/教材中的内容
2. 用通俗易懂的语言解释专业概念
3. 如果有相关例题，可以举例说明
4. 标注信息来源"""
        async for chunk in self.query_stream(question, user_id, system_prompt=system_prompt):
            yield chunk

    async def query_knowledge_base_stream(self, question: str, user_id: int) -> AsyncGenerator[str, None]:
        """个人知识库流式问答"""
        system_prompt = """你是一个个人知识库管家。请基于用户收藏和整理的知识内容回答问题。
回答要求：
1. 精准定位相关知识点
2. 提供完整的知识上下文
3. 如有关联知识，一并提及"""
        async for chunk in self.query_stream(question, user_id, system_prompt=system_prompt):
            yield chunk


rag_engine = RAGEngine()
