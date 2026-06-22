from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base
import enum


class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(20), unique=True, index=True, comment="学号")
    name = Column(String(50), comment="姓名")
    college = Column(String(100), comment="学院")
    major = Column(String(100), comment="专业")
    grade = Column(String(10), comment="年级")
    role = Column(String(20), default=UserRole.student)
    avatar_url = Column(String(500), nullable=True)
    cas_token = Column(String(500), nullable=True, comment="CAS认证token")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    courses = relationship("UserCourse", back_populates="user")
    knowledge_items = relationship("KnowledgeItem", back_populates="owner")
    study_plans = relationship("StudyPlan", back_populates="user")
    study_records = relationship("StudyRecord", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), comment="课程名称")
    code = Column(String(20), comment="课程代码")
    teacher = Column(String(50), comment="授课教师")
    semester = Column(String(20), comment="学期")
    schedule = Column(JSON, comment="上课时间安排")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    user_courses = relationship("UserCourse", back_populates="course")
    documents = relationship("Document", back_populates="course")
    quizzes = relationship("Quiz", back_populates="course")


class UserCourse(Base):
    __tablename__ = "user_courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    is_favorite = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="courses")
    course = relationship("Course", back_populates="user_courses")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(500))
    doc_type = Column(String(20), comment="课件/教材/论文/笔记")
    file_path = Column(String(500))
    file_size = Column(Integer)
    content_hash = Column(String(64), comment="内容哈希，用于去重")
    chunk_count = Column(Integer, default=0, comment="分块数量")
    status = Column(String(20), default="processing", comment="processing/completed/failed")
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="documents")


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(500))
    content = Column(Text)
    source = Column(String(200), comment="来源")
    category = Column(String(50), comment="分类")
    tags = Column(JSON, default=list)
    vector_id = Column(String(100), comment="DashVector中的ID")
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="knowledge_items")


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200))
    goal = Column(Text, comment="学习目标")
    plan_type = Column(String(20), comment="考试/技能/阅读")
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    milestones = Column(JSON, default=list, comment="里程碑")
    progress = Column(Float, default=0.0, comment="进度百分比")
    status = Column(String(20), default="active", comment="active/completed/paused")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="study_plans")


class StudyRecord(Base):
    __tablename__ = "study_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime, comment="学习日期")
    duration = Column(Integer, comment="学习时长(分钟)")
    subject = Column(String(100), comment="学习科目")
    activity_type = Column(String(20), comment="阅读/练习/讨论/测验")
    summary = Column(Text, nullable=True, comment="AI生成摘要")
    score = Column(Float, nullable=True, comment="测验得分")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="study_records")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    title = Column(String(200))
    questions = Column(JSON, comment="题目列表")
    quiz_type = Column(String(20), comment="自动生成/手动创建")
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="quizzes")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100))
    description = Column(Text, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    announcements = Column(JSON, default=list, comment="公告列表")
    shared_todos = Column(JSON, default=list, comment="共享待办")
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("TeamMember", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(20), default="member", comment="leader/member")
    joined_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


class ChatHistory(Base):
    __tablename__ = "chat_histories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String(50), index=True, comment="会话ID")
    role = Column(String(20), comment="user/assistant")
    content = Column(Text)
    context_docs = Column(JSON, default=list, comment="引用的文档片段")
    created_at = Column(DateTime, default=datetime.utcnow)


class LessonCourse(Base):
    __tablename__ = "lesson_courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    course_name = Column(String(200), comment="课程名称")
    outline = Column(JSON, comment="课程脉络")
    materials_text = Column(Text, nullable=True, comment="解析后的课件原文")
    status = Column(String(20), default="draft", comment="draft/active/completed")
    created_at = Column(DateTime, default=datetime.utcnow)


class LessonContent(Base):
    __tablename__ = "lesson_contents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lesson_course_id = Column(Integer, ForeignKey("lesson_courses.id"))
    unit_index = Column(Integer, comment="单元序号")
    unit_name = Column(String(200), comment="单元名称")
    content = Column(JSON, comment="课程内容")
    mastery_level = Column(String(20), default="未接触", comment="掌握度级别")
    created_at = Column(DateTime, default=datetime.utcnow)


class LearnerProfile(Base):
    __tablename__ = "learner_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    goals = Column(JSON, default=list, comment="学习目标")
    background = Column(JSON, default=dict, comment="背景信息")
    preferences = Column(JSON, default=dict, comment="学习偏好")
    knowledge_transfer = Column(JSON, default=list, comment="知识迁移记录")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExamRecord(Base):
    __tablename__ = "exam_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lesson_course_id = Column(Integer, ForeignKey("lesson_courses.id"))
    exam_type = Column(String(20), comment="final/consolidation")
    questions = Column(JSON, comment="题目列表")
    user_answers = Column(JSON, nullable=True, comment="用户答案")
    score = Column(Float, nullable=True, comment="得分")
    graded = Column(JSON, nullable=True, comment="批改结果")
    round_num = Column(Integer, default=1, comment="巩固轮次")
    created_at = Column(DateTime, default=datetime.utcnow)
