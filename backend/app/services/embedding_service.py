import httpx
from app.config import get_settings


class EmbeddingService:
    """阿里云文本嵌入服务"""

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.dashscope_api_key
        self.base_url = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding"
        self.model = self.settings.embedding_model

    async def embed(self, text: str) -> list[float]:
        """单文本嵌入"""
        result = await self.embed_batch([text])
        return result[0] if result else []

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """批量文本嵌入"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        params = {
            "model": self.model,
            "input": {
                "texts": texts
            },
            "parameters": {
                "text_type": "document"
            }
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(self.base_url, headers=headers, json=params)
            response.raise_for_status()
            result = response.json()
            embeddings = [item["embedding"] for item in result["output"]["embeddings"]]
            return embeddings


embedding_service = EmbeddingService()
