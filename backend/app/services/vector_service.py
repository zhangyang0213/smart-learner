import chromadb
from app.config import get_settings


class VectorService:
    """ChromaDB本地向量检索服务"""

    def __init__(self):
        self.settings = get_settings()
        self.persist_dir = self.settings.chroma_persist_dir
        self.collection_name = "smart_learner_knowledge"
        self._client = None
        self._collection = None

    def _get_client(self) -> chromadb.PersistentClient:
        if self._client is None:
            self._client = chromadb.PersistentClient(path=self.persist_dir)
        return self._client

    def _get_collection(self) -> chromadb.Collection:
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    async def create_collection(self, dimension: int = 1536):
        """创建/获取向量集合（ChromaDB自动管理维度）"""
        self._collection = self._get_collection()
        return {"name": self.collection_name, "status": "ready"}

    async def insert(self, vector: list[float], metadata: dict,
                     vector_id: str = None) -> dict:
        """插入向量"""
        collection = self._get_collection()
        import uuid
        if vector_id is None:
            vector_id = str(uuid.uuid4())

        collection.add(
            ids=[vector_id],
            embeddings=[vector],
            metadatas=[metadata],
            documents=[metadata.get("title", "")],
        )
        return {"id": vector_id, "status": "inserted"}

    async def batch_insert(self, vectors: list[dict]) -> dict:
        """批量插入向量
        vectors: [{"vector": [...], "fields": {...}, "id": "..."}]
        """
        collection = self._get_collection()
        ids = []
        embeddings = []
        metadatas = []
        documents = []

        for v in vectors:
            vid = v.get("id") or str(__import__("uuid").uuid4())
            ids.append(vid)
            embeddings.append(v["vector"])
            fields = v.get("fields", {})
            metadatas.append(fields)
            documents.append(fields.get("title", ""))

        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents,
        )
        return {"count": len(ids), "status": "inserted"}

    async def search(self, vector: list[float], top_k: int = 5,
                     filter_expr: dict = None) -> list[dict]:
        """向量检索
        filter_expr: ChromaDB where filter dict, e.g. {"user_id": 1}
        """
        collection = self._get_collection()
        query_params = {
            "query_embeddings": [vector],
            "n_results": top_k,
        }
        if filter_expr:
            query_params["where"] = filter_expr

        results = collection.query(**query_params)

        # Convert ChromaDB results to a consistent format
        docs = []
        if results and results["ids"] and results["ids"][0]:
            for i in range(len(results["ids"][0])):
                doc = {
                    "id": results["ids"][0][i],
                    "distance": results["distances"][0][i] if results.get("distances") else 0,
                    "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                    "document": results["documents"][0][i] if results.get("documents") else "",
                }
                docs.append(doc)
        return docs

    async def delete(self, ids: list[str]) -> dict:
        """删除向量"""
        collection = self._get_collection()
        collection.delete(ids=ids)
        return {"deleted": len(ids), "status": "deleted"}


vector_service = VectorService()
