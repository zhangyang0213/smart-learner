"""
SmartLearner 种子数据脚本
运行方式: python -m app.seed
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select

from app.database.connection import async_session, init_db
from app.models.models import (
    User, Course, UserCourse, KnowledgeItem,
    StudyPlan, StudyRecord, Team, TeamMember,
)


async def seed():
    await init_db()

    async with async_session() as db:
        # 检查是否已有数据
        result = await db.execute(select(User).where(User.student_id == "2024001"))
        if result.scalar_one_or_none():
            print("种子数据已存在，跳过")
            return

        # 1. 创建演示用户
        user = User(
            student_id="2024001",
            name="张三",
            college="计算机科学与技术学院",
            major="软件工程",
            grade="2024",
            role="student",
        )
        db.add(user)
        await db.flush()

        # 2. 创建5门演示课程
        courses_data = [
            {
                "name": "数据结构与算法",
                "code": "CS201",
                "teacher": "李教授",
                "semester": "2024秋",
                "schedule": {"day": "周一", "time": "1-2节", "location": "教三301"},
            },
            {
                "name": "操作系统",
                "code": "CS301",
                "teacher": "王教授",
                "semester": "2024秋",
                "schedule": {"day": "周二", "time": "3-4节", "location": "教四205"},
            },
            {
                "name": "计算机网络",
                "code": "CS302",
                "teacher": "赵教授",
                "semester": "2024秋",
                "schedule": {"day": "周三", "time": "5-6节", "location": "教二102"},
            },
            {
                "name": "数据库系统",
                "code": "CS303",
                "teacher": "陈教授",
                "semester": "2024秋",
                "schedule": {"day": "周四", "time": "1-2节", "location": "教一408"},
            },
            {
                "name": "软件工程",
                "code": "CS401",
                "teacher": "刘教授",
                "semester": "2024秋",
                "schedule": {"day": "周五", "time": "3-4节", "location": "教五301"},
            },
        ]
        courses = []
        for c in courses_data:
            course = Course(
                name=c["name"],
                code=c["code"],
                teacher=c["teacher"],
                semester=c["semester"],
                schedule=c["schedule"],
            )
            db.add(course)
            await db.flush()
            courses.append(course)

            # 用户关联课程
            uc = UserCourse(
                user_id=user.id,
                course_id=course.id,
                is_favorite=(c["code"] in ["CS201", "CS401"]),
            )
            db.add(uc)

        # 3. 创建演示知识条目
        knowledge_data = [
            {
                "title": "红黑树性质总结",
                "content": "红黑树是一种自平衡二叉搜索树，具有以下性质：1. 每个节点是红色或黑色；2. 根节点是黑色；3. 每个叶子节点（NIL）是黑色；4. 如果一个节点是红色，则它的两个子节点都是黑色；5. 从任一节点到其每个叶子的所有路径都包含相同数目的黑色节点。",
                "source": "数据结构与算法课堂笔记",
                "category": "数据结构",
                "tags": ["红黑树", "平衡树", "二叉搜索树"],
            },
            {
                "title": "进程与线程的区别",
                "content": "进程是资源分配的基本单位，线程是CPU调度的基本单位。进程拥有独立的地址空间，线程共享所属进程的地址空间。进程间通信需要IPC机制，线程间可以直接访问共享数据。进程切换开销大，线程切换开销小。",
                "source": "操作系统教材第三章",
                "category": "操作系统",
                "tags": ["进程", "线程", "并发"],
            },
            {
                "title": "TCP三次握手",
                "content": "TCP建立连接需要三次握手：1. 客户端发送SYN包；2. 服务器回复SYN+ACK包；3. 客户端发送ACK包确认。三次握手确保了双方都有发送和接收的能力，防止了已失效的连接请求报文段突然传到服务器而产生错误。",
                "source": "计算机网络课堂笔记",
                "category": "计算机网络",
                "tags": ["TCP", "三次握手", "网络协议"],
            },
            {
                "title": "SQL注入防范方法",
                "content": "SQL注入防范的主要方法：1. 使用参数化查询（预编译语句）；2. 使用存储过程；3. 对用户输入进行严格校验；4. 使用ORM框架；5. 最小权限原则配置数据库账户；6. 避免在错误信息中暴露数据库结构。",
                "source": "数据库系统课程实验",
                "category": "数据库",
                "tags": ["SQL注入", "安全", "参数化查询"],
            },
            {
                "title": "敏捷开发Scrum流程",
                "content": "Scrum是敏捷开发的一种框架，核心角色包括：产品负责人、Scrum Master、开发团队。核心活动：Sprint计划会议、每日站会、Sprint评审会议、Sprint回顾会议。关键工件：产品待办列表、Sprint待办列表、产品增量。",
                "source": "软件工程教材",
                "category": "软件工程",
                "tags": ["敏捷", "Scrum", "迭代开发"],
            },
        ]
        for k in knowledge_data:
            item = KnowledgeItem(
                user_id=user.id,
                title=k["title"],
                content=k["content"],
                source=k["source"],
                category=k["category"],
                tags=k["tags"],
            )
            db.add(item)

        # 4. 创建演示学习计划
        plan = StudyPlan(
            user_id=user.id,
            title="期末复习计划 - 数据结构与算法",
            goal="系统复习数据结构与算法，为期末考试做准备",
            plan_type="考试",
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=30),
            milestones=[
                {"name": "基础回顾", "days": 7, "status": "completed"},
                {"name": "重点突破：树与图", "days": 10, "status": "in_progress"},
                {"name": "算法设计专项", "days": 8, "status": "pending"},
                {"name": "综合模拟测试", "days": 5, "status": "pending"},
            ],
            progress=0.35,
            status="active",
        )
        db.add(plan)

        # 5. 创建演示团队
        team = Team(
            name="数据结构学习小组",
            description="一起攻克数据结构与算法",
            course_id=courses[0].id,
            announcements=[
                {"title": "本周讨论主题：红黑树", "content": "请大家提前复习红黑树的插入和删除操作", "date": datetime.utcnow().isoformat()},
                {"title": "期中复习安排", "content": "周六下午2点图书馆3楼集合", "date": (datetime.utcnow() - timedelta(days=3)).isoformat()},
            ],
            shared_todos=[
                {"task": "完成第6章习题", "assignee": "张三", "done": True},
                {"task": "整理图论算法笔记", "assignee": "李四", "done": False},
                {"task": "准备期末复习提纲", "assignee": "张三", "done": False},
            ],
        )
        db.add(team)
        await db.flush()

        # 团队成员
        tm = TeamMember(team_id=team.id, user_id=user.id, role="leader")
        db.add(tm)

        # 6. 创建过去7天的学习记录
        activity_types = ["阅读", "练习", "讨论", "测验"]
        subjects = ["数据结构与算法", "操作系统", "计算机网络", "数据库系统", "软件工程"]
        durations = [45, 60, 90, 30, 120, 75, 50]

        for day_offset in range(7):
            record_date = datetime.utcnow() - timedelta(days=day_offset)
            # 每天2-4条记录
            num_records = 2 + (day_offset % 3)
            for i in range(num_records):
                record = StudyRecord(
                    user_id=user.id,
                    date=record_date.replace(
                        hour=8 + i * 3, minute=0, second=0, microsecond=0
                    ),
                    duration=durations[(day_offset + i) % len(durations)],
                    subject=subjects[(day_offset + i) % len(subjects)],
                    activity_type=activity_types[i % len(activity_types)],
                    summary=f"学习了{subjects[(day_offset + i) % len(subjects)]}相关内容",
                )
                db.add(record)

        await db.commit()

    print("种子数据创建完成！")
    print("  用户: 张三 (2024001)")
    print("  课程: 5门")
    print("  知识条目: 5条")
    print("  学习计划: 1个")
    print("  团队: 1个")
    print("  学习记录: 过去7天")


if __name__ == "__main__":
    asyncio.run(seed())
