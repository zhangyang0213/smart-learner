import json
from app.services.llm_service import llm_service


class LessonService:
    """课程学习服务 - 融合 ko-lesson 学习理念"""

    async def generate_course_outline(self, materials: list[str], course_name: str, user_id: int) -> dict:
        """根据课程材料生成课程脉络（由浅入深）
        Returns: {course_name, units: [{name, difficulty, knowledge_points, prerequisites, order, source}]}
        """
        materials_text = "\n\n---\n\n".join(materials)
        messages = [
            {"role": "system", "content": """你是一位资深课程设计专家，擅长将复杂知识体系化、层次化。你的任务是根据提供的课程材料，生成一个由浅入深的课程脉络。

设计原则（ko-lesson理念）：
1. 由浅入深：从直观现象到抽象概念，从简单到复杂
2. 知识点拆解：每个单元聚焦3-5个核心知识点
3. 前置依赖：明确标注每个单元需要的前置知识
4. 难度递进：difficulty从1到5递增
5. 来源追溯：标注每个单元对应原始材料的哪部分

请返回JSON格式：
{
    "course_name": "课程名称",
    "units": [
        {
            "name": "单元名称",
            "difficulty": 1,
            "knowledge_points": ["知识点1", "知识点2"],
            "prerequisites": ["前置知识1"],
            "order": 1,
            "source": "来源说明"
        }
    ]
}"""},
            {"role": "user", "content": f"课程名称：{course_name}\n\n课程材料：\n{materials_text[:12000]}"}
        ]
        result = await llm_service.chat(messages, temperature=0.5)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"course_name": course_name, "units": [], "raw": result}

    async def generate_lesson(self, course_name: str, unit_name: str, unit_index: int,
                              knowledge_points: list[str], materials: str,
                              learner_background: dict = None) -> dict:
        """生成单课内容（ko-lesson风格：生活引入→现象逻辑→正式解释→深挖→应用→反馈入口）
        Returns: {title, objectives, knowledge_points, sections: [{type, content}], quick_check, feedback_entry}
        """
        background_text = ""
        if learner_background:
            background_text = f"\n学习者背景：{json.dumps(learner_background, ensure_ascii=False)}"

        messages = [
            {"role": "system", "content": f"""你是一位ko-lesson风格的教学设计师。ko-lesson的核心理念是：让学习者在理解之前先感受到，在记住之前先明白为什么。

单课结构必须严格遵循以下6段式：
1. 【生活引入】(type: "life_intro")：用一个日常生活中的小现象或小故事引入本课主题，让学习者感到"这个我见过！"
2. 【现象逻辑】(type: "phenomenon_logic")：分析这个生活现象背后的逻辑，引导学习者思考"为什么会这样？"
3. 【正式解释】(type: "formal_explanation")：引入课程核心概念，给出正式的、严谨的解释，连接前面的生活现象
4. 【深挖理解】(type: "deep_dive")：深入探讨概念的内涵、边界条件、常见误区，帮助学习者建立深层理解
5. 【实际应用】(type: "application")：展示该知识在真实场景中的应用，让学习者看到知识的价值
6. 【反馈入口】(type: "feedback_entry")：提供3个快速自检问题和1个开放反馈问题，收集学习者掌握度

同时生成：
- objectives：本课学习目标（3-5条）
- quick_check：快速检测题（2-3道选择题，含答案和解析）
- feedback_entry：反馈入口问题

请返回JSON格式：
{{
    "title": "课时标题",
    "objectives": ["目标1", "目标2"],
    "knowledge_points": ["知识点1"],
    "sections": [
        {{"type": "life_intro", "content": "内容..."}},
        {{"type": "phenomenon_logic", "content": "内容..."}},
        {{"type": "formal_explanation", "content": "内容..."}},
        {{"type": "deep_dive", "content": "内容..."}},
        {{"type": "application", "content": "内容..."}},
        {{"type": "feedback_entry", "content": "内容..."}}
    ],
    "quick_check": [
        {{"question": "题目", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "解析"}}
    ],
    "feedback_entry": "你觉得本课最难理解的部分是什么？"
}}"""},
            {"role": "user", "content": f"""课程：{course_name}
单元：{unit_name}（第{unit_index}单元）
知识点：{', '.join(knowledge_points)}
{background_text}

参考材料：
{materials[:8000]}"""}
        ]
        result = await llm_service.chat(messages, temperature=0.6)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"title": unit_name, "objectives": [], "knowledge_points": knowledge_points,
                    "sections": [], "quick_check": [], "feedback_entry": "", "raw": result}

    async def evaluate_mastery(self, user_feedback: dict, lesson_content: dict) -> dict:
        """评估掌握度（未接触/能听懂/能复述/能做题/能应用/能迁移）
        Returns: {mastery_level, analysis, next_action, need_reinforce}
        """
        messages = [
            {"role": "system", "content": """你是一位学习评估专家。根据学习者的反馈，评估其对课程内容的掌握度。

掌握度6级标准：
1. 未接触：完全没有了解过该知识
2. 能听懂：能理解别人讲的内容，但自己说不出来
3. 能复述：能用自己的话复述核心概念，但不一定能做题
4. 能做题：能正确解答相关练习题，但未必理解深层原理
5. 能应用：能在新情境中正确运用该知识
6. 能迁移：能将该知识的思维方式迁移到其他领域

评估依据：
- 学习者对反馈入口问题的回答质量
- 快速检测题的正确率
- 学习者自述的困难点

请返回JSON格式：
{
    "mastery_level": "能做题",
    "analysis": "详细分析学习者的理解程度...",
    "next_action": "建议的下一步学习行动",
    "need_reinforce": true/false
}"""},
            {"role": "user", "content": f"""课程内容：{json.dumps(lesson_content, ensure_ascii=False)[:4000]}

学习者反馈：{json.dumps(user_feedback, ensure_ascii=False)}"""}
        ]
        result = await llm_service.chat(messages, temperature=0.3)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"mastery_level": "未接触", "analysis": "评估失败", "next_action": "请重新学习", "need_reinforce": True, "raw": result}

    async def generate_exam(self, course_outline: dict, lessons: list[dict],
                            exam_type: str = "final") -> dict:
        """生成期末考试（单选/多选/概念解释/case study）
        Returns: {title, questions: [{type, knowledge_point, question, options, answer, explanation, source}]}
        """
        outline_text = json.dumps(course_outline, ensure_ascii=False)[:3000]
        lessons_text = "\n".join([
            f"单元{l.get('unit_name', '')}：{json.dumps(l.get('content', {}), ensure_ascii=False)[:1500]}"
            for l in lessons
        ])[:8000]

        exam_type_desc = {
            "final": "期末考试，覆盖所有单元，重点考察综合理解和应用能力",
            "midterm": "期中考试，覆盖前半部分单元",
            "consolidation": "巩固测试，针对薄弱知识点强化训练",
        }

        messages = [
            {"role": "system", "content": f"""你是一位专业的出题专家。请根据课程大纲和课程内容生成一份{exam_type_desc.get(exam_type, "综合考试")}。

题目类型要求：
1. 单选题(single_choice)：4个选项，1个正确答案，考察基础概念理解
2. 多选题(multiple_choice)：4-5个选项，2-3个正确答案，考察知识关联能力
3. 概念解释(concept_explanation)：要求学习者用自己的话解释核心概念，考察深层理解
4. 案例分析(case_study)：给出一个实际场景，要求学习者运用知识分析，考察应用和迁移能力

出题原则：
- 每个单元至少1道题
- 题目难度分布：基础40%、中等40%、综合20%
- 每道题标注考察的知识点和来源单元
- 提供详细的答案和解析

请返回JSON格式：
{{
    "title": "考试标题",
    "questions": [
        {{
            "type": "single_choice",
            "knowledge_point": "考察的知识点",
            "question": "题目内容",
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "answer": "A",
            "explanation": "详细解析",
            "source": "来源单元"
        }},
        {{
            "type": "multiple_choice",
            "knowledge_point": "考察的知识点",
            "question": "题目内容",
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "answer": ["A", "C"],
            "explanation": "详细解析",
            "source": "来源单元"
        }},
        {{
            "type": "concept_explanation",
            "knowledge_point": "考察的知识点",
            "question": "请解释XXX的概念",
            "options": [],
            "answer": "参考答案要点",
            "explanation": "评分标准",
            "source": "来源单元"
        }},
        {{
            "type": "case_study",
            "knowledge_point": "考察的知识点",
            "question": "案例描述...请分析...",
            "options": [],
            "answer": "参考分析要点",
            "explanation": "评分标准",
            "source": "来源单元"
        }}
    ]
}}"""},
            {"role": "user", "content": f"""课程大纲：\n{outline_text}

课程内容：\n{lessons_text}"""}
        ]
        result = await llm_service.chat(messages, temperature=0.4)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"title": "考试", "questions": [], "raw": result}

    async def grade_exam(self, exam: dict, user_answers: dict) -> dict:
        """批改考试并生成巩固建议
        Returns: {total_score, graded_questions: [...], weak_points: [...], need_consolidation: bool, consolidation_plan}
        """
        messages = [
            {"role": "system", "content": """你是一位专业的考试批改专家。请根据考试题目和标准答案批改学习者的答卷。

批改要求：
1. 客观题（单选/多选）：直接判断对错
2. 主观题（概念解释/案例分析）：根据答案要点评分，给出部分得分
3. 每题满分10分
4. 识别薄弱知识点（得分低于6分的题目对应的知识点）
5. 判断是否需要巩固训练（总分低于70%或存在多个薄弱点）
6. 如需巩固，给出巩固计划

请返回JSON格式：
{
    "total_score": 85,
    "max_score": 100,
    "graded_questions": [
        {
            "question_index": 0,
            "correct": true/false,
            "score": 10,
            "max_score": 10,
            "feedback": "批改反馈"
        }
    ],
    "weak_points": [
        {
            "knowledge_point": "薄弱知识点",
            "question_indices": [0, 2],
            "suggestion": "巩固建议"
        }
    ],
    "need_consolidation": true/false,
    "consolidation_plan": "巩固计划描述"
}"""},
            {"role": "user", "content": f"""考试题目：\n{json.dumps(exam, ensure_ascii=False)[:6000]}

学习者答案：\n{json.dumps(user_answers, ensure_ascii=False)}"""}
        ]
        result = await llm_service.chat(messages, temperature=0.2)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"total_score": 0, "graded_questions": [], "weak_points": [],
                    "need_consolidation": True, "raw": result}

    async def generate_consolidation(self, weak_points: list[dict], round_num: int) -> dict:
        """生成巩固卷（只针对薄弱知识点）
        Returns: same format as generate_exam but focused on weak points
        """
        weak_points_text = json.dumps(weak_points, ensure_ascii=False)

        messages = [
            {"role": "system", "content": f"""你是一位巩固训练专家。请针对学习者的薄弱知识点生成一份巩固卷。

这是第{round_num}轮巩固训练。{'如果这是第2轮及以上，题目应更加深入，帮助学习者真正掌握。' if round_num > 1 else ''}

巩固卷设计原则：
1. 只覆盖薄弱知识点，不涉及已掌握的内容
2. 每个薄弱点2-3道题，从不同角度考察
3. 题目类型混合：单选、多选、概念解释、案例分析
4. 难度适中，确保学习者能通过练习提升
5. 解析要详细，帮助学习者理解为什么错

请返回JSON格式（与考试格式相同）：
{{
    "title": "巩固卷（第{round_num}轮）",
    "questions": [
        {{
            "type": "single_choice/multiple_choice/concept_explanation/case_study",
            "knowledge_point": "对应薄弱知识点",
            "question": "题目内容",
            "options": [],
            "answer": "答案",
            "explanation": "详细解析",
            "source": "对应薄弱点"
        }}
    ]
}}"""},
            {"role": "user", "content": f"薄弱知识点：\n{weak_points_text}"}
        ]
        result = await llm_service.chat(messages, temperature=0.4)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"title": f"巩固卷（第{round_num}轮）", "questions": [], "raw": result}

    async def update_learner_profile(self, user_id: int, feedback: dict,
                                      mastery_data: dict) -> dict:
        """更新学习者背景信息（跨课程积累）
        Returns: updated profile
        """
        messages = [
            {"role": "system", "content": """你是一位学习分析专家。根据学习者的最新反馈和掌握度数据，更新其学习者画像。

学习者画像包含：
1. goals：学习目标列表
2. background：背景信息（专业、年级、已学课程等）
3. preferences：学习偏好（偏好的学习方式、节奏等）
4. knowledge_transfer：知识迁移记录（哪些知识可以迁移到新领域）

请返回JSON格式：
{
    "goals": ["目标1", "目标2"],
    "background": {
        "major": "专业",
        "level": "年级",
        "strengths": ["擅长领域1"],
        "weaknesses": ["薄弱领域1"],
        "courses_taken": ["已学课程1"]
    },
    "preferences": {
        "learning_style": "偏好风格",
        "pace": "快/中/慢",
        "preferred_time": "偏好学习时间"
    },
    "knowledge_transfer": [
        {
            "from": "源知识领域",
            "to": "可迁移到",
            "strength": "强/中/弱"
        }
    ]
}"""},
            {"role": "user", "content": f"""学习者ID：{user_id}
最新反馈：{json.dumps(feedback, ensure_ascii=False)}
掌握度数据：{json.dumps(mastery_data, ensure_ascii=False)}"""}
        ]
        result = await llm_service.chat(messages, temperature=0.3)
        try:
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif "```" in result:
                result = result.split("```")[1].split("```")[0]
            return json.loads(result.strip())
        except json.JSONDecodeError:
            return {"goals": [], "background": {}, "preferences": {}, "knowledge_transfer": [], "raw": result}


lesson_service = LessonService()
