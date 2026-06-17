import httpx
import json
from typing import AsyncGenerator
from app.config import get_settings


class LLMService:
    """阿里云DashScope通义千问服务"""

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.dashscope_api_key
        self.base_url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
        self.model = self.settings.llm_model

    async def chat(self, messages: list[dict], temperature: float = None,
                   max_tokens: int = None, stream: bool = False) -> str:
        """通用对话接口"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        params = {
            "model": self.model,
            "input": {
                "messages": messages
            },
            "parameters": {
                "temperature": temperature or self.settings.llm_temperature,
                "max_tokens": max_tokens or self.settings.llm_max_tokens,
                "result_format": "message",
            }
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(self.base_url, headers=headers, json=params)
            response.raise_for_status()
            result = response.json()
            return result["output"]["choices"][0]["message"]["content"]

    async def chat_stream(self, messages: list[dict], temperature: float = None,
                          max_tokens: int = None) -> AsyncGenerator[str, None]:
        """流式对话接口，逐token返回"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-SSE": "enable",
        }
        params = {
            "model": self.model,
            "input": {
                "messages": messages
            },
            "parameters": {
                "temperature": temperature or self.settings.llm_temperature,
                "max_tokens": max_tokens or self.settings.llm_max_tokens,
                "result_format": "message",
                "incremental_output": True,
            }
        }

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", self.base_url, headers=headers, json=params) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data_str = line[len("data:"):].strip()
                    if not data_str:
                        continue
                    try:
                        data = json.loads(data_str)
                        content = data["output"]["choices"][0]["message"]["content"]
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

    async def chat_with_context(self, query: str, context: list[str],
                                system_prompt: str = None) -> str:
        """基于上下文的RAG对话"""
        context_text = "\n\n".join([f"【参考资料{i+1}】\n{c}" for i, c in enumerate(context)])

        default_system = f"""你是一个专业的学习助手和知识管家。请基于以下参考资料回答用户的问题。
如果参考资料中没有相关信息，请明确说明，并尝试根据你的知识给出合理的回答。
回答时要标注信息来源的参考编号。

{context_text}"""

        messages = [
            {"role": "system", "content": system_prompt or default_system},
            {"role": "user", "content": query}
        ]
        return await self.chat(messages)

    async def summarize(self, text: str, max_length: int = 500) -> str:
        """文本摘要"""
        messages = [
            {"role": "system", "content": "你是一个专业的文本摘要助手。请对以下内容进行精炼摘要，保留核心观点和关键信息。"},
            {"role": "user", "content": f"请摘要以下内容（不超过{max_length}字）：\n\n{text}"}
        ]
        return await self.chat(messages, temperature=0.3)

    async def generate_quiz(self, content: str, num_questions: int = 5,
                            difficulty: str = "medium") -> list[dict]:
        """根据内容生成测验题"""
        messages = [
            {"role": "system", "content": """你是一个专业的出题助手。请根据提供的学习内容生成测验题目。
返回JSON格式，每题包含：question(题目), options(选项列表), answer(正确答案), explanation(解析)。
难度级别：easy/medium/hard"""},
            {"role": "user", "content": f"""请根据以下内容生成{num_questions}道选择题，难度：{difficulty}

内容：
{text}"""
        }
        ]
        result = await self.chat(messages, temperature=0.5)
        try:
            # 尝试解析JSON
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return [{"question": "生成题目解析失败", "raw": result}]

    async def analyze_paper(self, paper_text: str) -> dict:
        """论文深度分析"""
        messages = [
            {"role": "system", "content": """你是一个专业的论文分析助手。请对论文进行深度分析，返回JSON格式：
{
    "title": "论文标题",
    "authors": "作者",
    "abstract_summary": "摘要总结",
    "research_question": "研究问题",
    "methodology": "研究方法",
    "key_findings": ["核心发现1", "核心发现2"],
    "contributions": ["贡献1", "贡献2"],
    "limitations": ["局限性1"],
    "related_topics": ["相关主题1"],
    "reading_difficulty": "阅读难度评估(1-5)",
    "key_terms": [{"term": "术语", "definition": "定义"}]
}"""},
            {"role": "user", "content": f"请分析以下论文：\n\n{paper_text[:8000]}"}
        ]
        result = await self.chat(messages, temperature=0.3)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"raw_analysis": result}

    async def plan_study(self, goal: str, duration_days: int,
                         subjects: list[str] = None) -> dict:
        """学习路径规划"""
        subjects_text = "、".join(subjects) if subjects else "综合"
        messages = [
            {"role": "system", "content": """你是一个专业的学习规划师。请根据用户的目标和时间制定学习计划，返回JSON格式：
{
    "plan_title": "计划标题",
    "daily_hours": 建议每日学习时长,
    "phases": [
        {
            "name": "阶段名",
            "duration_days": 天数,
            "tasks": ["任务1", "任务2"],
            "milestones": ["里程碑1"]
        }
    ],
    "resources": ["推荐资源1"],
    "tips": ["学习建议1"]
}"""},
            {"role": "user", "content": f"我的学习目标：{goal}，可用时间：{duration_days}天，涉及科目：{subjects_text}"}
        ]
        result = await self.chat(messages, temperature=0.5)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"raw_plan": result}

    async def generate_daily_report(self, study_records: list[dict]) -> str:
        """生成智能学习日报"""
        records_text = "\n".join([
            f"- {r.get('subject', '未知')}: {r.get('activity_type', '未知')} {r.get('duration', 0)}分钟"
            for r in study_records
        ])
        messages = [
            {"role": "system", "content": """你是一个学习分析助手。请根据今日学习记录生成一份智能日报，包含：
1. 今日学习总结
2. 时间分配分析
3. 学习效率评估
4. 改进建议
5. 明日建议安排"""},
            {"role": "user", "content": f"今日学习记录：\n{records_text}"}
        ]
        return await self.chat(messages, temperature=0.5)


llm_service = LLMService()
