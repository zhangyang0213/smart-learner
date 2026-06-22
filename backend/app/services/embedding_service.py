import httpx
from app.config import get_settings


class EmbeddingService:
    """阿里云文本嵌入服务 - 带缓存"""

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.dashscope_api_key
        self.base_url = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding"
        self.model = self.settings.embedding_model
        self._cache: dict[str, list[float]] = {}

    async def embed(self, text: str) -> list[float]:
        """单文本嵌入（带缓存）"""
        cache_key = text[:200]  # 用前200字符做缓存key
        if cache_key in self._cache:
            return self._cache[cache_key]

        result = await self.embed_batch([text])
        if result:
            self._cache[cache_key] = result[0]
            # 限制缓存大小
            if len(self._cache) > 500:
                self._cache.clear()
            return result[0]
        return []

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """批量文本嵌入"""
        if not texts:
            return []

        # 检查缓存
        results: list[list[float] | None] = []
        uncached_indices: list[int] = []
        uncached_texts: list[str] = []

        for i, text in enumerate(texts):
            cache_key = text[:200]
            if cache_key in self._cache:
                results.append(self._cache[cache_key])
            else:
                results.append(None)
                uncached_indices.append(i)
                uncached_texts.append(text)

        # 如果全部命中缓存，直接返回
        if not uncached_texts:
            return results  # type: ignore

        # 调用API获取未缓存的嵌入
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        params = {
            "model": self.model,
            "input": {
                "texts": uncached_texts
            },
            "parameters": {
                "text_type": "document"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(self.base_url, headers=headers, json=params)
                response.raise_for_status()
                result = response.json()
                embeddings = [item["embedding"] for item in result["output"]["embeddings"]]

                # 填充结果并更新缓存
                for idx, embedding in zip(uncached_indices, embeddings):
                    results[idx] = embedding
                    cache_key = uncached_texts[uncached_indices.index(idx)][:200]
                    self._cache[cache_key] = embedding

                # 限制缓存大小
                if len(self._cache) > 500:
                    self._cache.clear()

                return [r for r in results if r is not None]
        except Exception as e:
            print(f"嵌入API调用失败: {e}")
            # 返回空嵌入作为降级
            dim = self.settings.embedding_dimension
            return [[0.0] * dim for _ in texts]


embedding_service = EmbeddingService()
