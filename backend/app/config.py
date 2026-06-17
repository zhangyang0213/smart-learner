from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # 阿里云服务
    dashscope_api_key: str = ""

    # 数据库（默认SQLite用于本地开发，生产环境切换为MySQL）
    database_url: str = "sqlite+aiosqlite:///./smart_learner.db"

    # ChromaDB本地向量存储
    chroma_persist_dir: str = "./chroma_data"

    # CAS认证
    cas_login_url: str = "https://cas.hfut.edu.cn/cas/login"
    cas_validate_url: str = "https://cas.hfut.edu.cn/cas/serviceValidate"

    # 应用
    app_secret_key: str = "dev-secret-key"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # 嵌入模型
    embedding_model: str = "text-embedding-v2"
    embedding_dimension: int = 1536

    # LLM
    llm_model: str = "qwen-plus"
    llm_max_tokens: int = 4096
    llm_temperature: float = 0.7

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
