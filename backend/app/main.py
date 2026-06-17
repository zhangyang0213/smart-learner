from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import os

from app.database.connection import init_db
from app.routers import auth, course, knowledge, paper, study_plan, team, dashboard, lesson


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库
    await init_db()
    yield


app = FastAPI(
    title="SmartLearner - 个性化学习与知识管理Agent",
    description="真正懂你、服务于你的个人知识管家，实现知识的主动获取、深度消化与高效复用",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {"code": 500, "message": "Internal Server Error", "detail": str(exc)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": 422, "message": "Validation Error", "detail": str(exc)}},
    )


from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.status_code, "message": exc.detail, "detail": exc.detail}},
    )


# 注册路由
app.include_router(auth.router)
app.include_router(course.router)
app.include_router(knowledge.router)
app.include_router(paper.router)
app.include_router(study_plan.router)
app.include_router(team.router)
app.include_router(dashboard.router)
app.include_router(lesson.router)

# 静态文件服务 - uploads目录
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    return {
        "app": "SmartLearner",
        "version": "1.0.0",
        "description": "个性化学习与知识管理Agent",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
