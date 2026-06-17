import httpx
import re
from urllib.parse import urljoin, urlparse, parse_qs
from typing import Optional
from app.config import get_settings


class CASAuthService:
    """合工大统一身份认证(CAS)服务"""

    def __init__(self):
        self.settings = get_settings()
        self.cas_login_url = self.settings.cas_login_url
        self.cas_validate_url = self.settings.cas_validate_url
        self.service_url = "http://localhost:8000/api/auth/cas/callback"

    async def get_login_url(self) -> str:
        """获取CAS登录URL"""
        return f"{self.cas_login_url}?service={self.service_url}"

    async def validate_ticket(self, ticket: str) -> Optional[dict]:
        """验证CAS ticket，获取用户信息"""
        validate_url = f"{self.cas_validate_url}?service={self.service_url}&ticket={ticket}"

        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            response = await client.get(validate_url)
            response.raise_for_status()

            # 解析CAS XML响应
            user_info = self._parse_cas_response(response.text)
            return user_info

    def _parse_cas_response(self, xml_response: str) -> Optional[dict]:
        """解析CAS验证返回的XML"""
        # 简化的XML解析 - 合工大CAS返回格式
        success_match = re.search(
            r'<cas:authenticationSuccess>', xml_response
        )
        if not success_match:
            return None

        user_match = re.search(r'<cas:user>(.*?)</cas:user>', xml_response)
        if not user_match:
            return None

        student_id = user_match.group(1)

        # 提取额外属性
        attrs = {}
        attr_patterns = {
            "name": r'<cas:姓名>(.*?)</cas:姓名>',
            "college": r'<cas:学院>(.*?)</cas:学院>',
            "major": r'<cas:专业>(.*?)</cas:专业>',
            "grade": r'<cas:年级>(.*?)</cas:年级>',
            "name_cn": r'<cas:userDisplayName>(.*?)</cas:userDisplayName>',
        }

        for key, pattern in attr_patterns.items():
            match = re.search(pattern, xml_response)
            if match:
                attrs[key] = match.group(1)

        return {
            "student_id": student_id,
            "name": attrs.get("name") or attrs.get("name_cn", ""),
            "college": attrs.get("college", ""),
            "major": attrs.get("major", ""),
            "grade": attrs.get("grade", ""),
        }

    async def fetch_schedule(self, student_id: str, semester: str = None) -> list[dict]:
        """从教务系统获取课表（模拟实现）"""
        # 注意：实际对接需要分析教务系统的API接口
        # 这里提供一个框架，具体实现需要根据合工大教务系统调整
        #
        # 典型流程：
        # 1. 使用CAS认证后的session访问教务系统
        # 2. 调用课表查询接口
        # 3. 解析返回数据

        # 模拟数据 - 实际使用时替换为真实API调用
        mock_schedule = [
            {
                "course_name": "高等数学",
                "course_code": "MATH101",
                "teacher": "张教授",
                "location": "教学楼A-301",
                "day_of_week": 1,
                "start_section": 1,
                "end_section": 2,
                "weeks": "1-16",
                "semester": semester or "2025-2026-2",
            },
            {
                "course_name": "数据结构",
                "course_code": "CS201",
                "teacher": "李教授",
                "location": "教学楼B-205",
                "day_of_week": 2,
                "start_section": 3,
                "end_section": 4,
                "weeks": "1-16",
                "semester": semester or "2025-2026-2",
            },
            {
                "course_name": "操作系统",
                "course_code": "CS301",
                "teacher": "王教授",
                "location": "教学楼C-102",
                "day_of_week": 3,
                "start_section": 5,
                "end_section": 6,
                "weeks": "1-14",
                "semester": semester or "2025-2026-2",
            },
            {
                "course_name": "英语读写",
                "course_code": "ENG201",
                "teacher": "陈老师",
                "location": "外语楼-408",
                "day_of_week": 4,
                "start_section": 1,
                "end_section": 2,
                "weeks": "1-16",
                "semester": semester or "2025-2026-2",
            },
            {
                "course_name": "计算机网络",
                "course_code": "CS302",
                "teacher": "赵教授",
                "location": "教学楼A-501",
                "day_of_week": 5,
                "start_section": 3,
                "end_section": 4,
                "weeks": "1-16",
                "semester": semester or "2025-2026-2",
            },
        ]
        return mock_schedule


cas_auth_service = CASAuthService()
