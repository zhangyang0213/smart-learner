from datetime import datetime, timedelta
from collections import defaultdict
from app.services.llm_service import llm_service


class StudyAnalyzer:
    """学习数据分析服务"""

    @staticmethod
    def calculate_study_stats(records: list[dict]) -> dict:
        """计算学习统计数据"""
        if not records:
            return {
                "total_duration": 0,
                "total_sessions": 0,
                "avg_duration": 0,
                "subject_distribution": {},
                "activity_distribution": {},
                "daily_trend": [],
                "streak_days": 0,
            }

        total_duration = sum(r.get("duration", 0) for r in records)
        total_sessions = len(records)

        # 科目分布
        subject_dist = defaultdict(int)
        for r in records:
            subject_dist[r.get("subject", "未知")] += r.get("duration", 0)

        # 活动类型分布
        activity_dist = defaultdict(int)
        for r in records:
            activity_dist[r.get("activity_type", "未知")] += r.get("duration", 0)

        # 每日趋势（最近7天）
        daily_trend = []
        today = datetime.utcnow().date()
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            day_duration = sum(
                r.get("duration", 0) for r in records
                if r.get("date") and datetime.strptime(r["date"], "%Y-%m-%d").date() == date
            )
            daily_trend.append({
                "date": date.isoformat(),
                "duration": day_duration
            })

        # 连续学习天数
        streak = 0
        check_date = today
        while True:
            day_records = [
                r for r in records
                if r.get("date") and datetime.strptime(r["date"], "%Y-%m-%d").date() == check_date
            ]
            if day_records:
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break

        return {
            "total_duration": total_duration,
            "total_sessions": total_sessions,
            "avg_duration": round(total_duration / total_sessions, 1) if total_sessions else 0,
            "subject_distribution": dict(subject_dist),
            "activity_distribution": dict(activity_dist),
            "daily_trend": daily_trend,
            "streak_days": streak,
        }

    @staticmethod
    def get_weekly_summary(records: list[dict]) -> dict:
        """获取周报数据"""
        stats = StudyAnalyzer.calculate_study_stats(records)
        return {
            "total_hours": round(stats["total_duration"] / 60, 1),
            "sessions": stats["total_sessions"],
            "top_subject": max(stats["subject_distribution"].items(), key=lambda x: x[1])[0]
            if stats["subject_distribution"] else "无",
            "streak": stats["streak_days"],
            "daily_trend": stats["daily_trend"],
        }

    @staticmethod
    async def generate_ai_report(records: list[dict]) -> str:
        """AI生成智能日报"""
        return await llm_service.generate_daily_report(records)

    @staticmethod
    def get_efficiency_score(records: list[dict]) -> float:
        """计算学习效率评分（0-100）"""
        if not records:
            return 0.0

        stats = StudyAnalyzer.calculate_study_stats(records)

        # 基于多个维度计算效率
        score = 50.0  # 基础分

        # 连续学习加分
        score += min(stats["streak_days"] * 2, 20)

        # 科目均衡度加分
        num_subjects = len(stats["subject_distribution"])
        if num_subjects >= 3:
            score += 10
        elif num_subjects >= 2:
            score += 5

        # 总时长加分
        total_hours = stats["total_duration"] / 60
        if total_hours >= 8:
            score += 15
        elif total_hours >= 4:
            score += 10
        elif total_hours >= 2:
            score += 5

        return min(round(score, 1), 100.0)


study_analyzer = StudyAnalyzer()
