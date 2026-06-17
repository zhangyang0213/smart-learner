import re
import json
from typing import Optional
from datetime import datetime, date


class ScheduleParser:
    """课表解析服务 - 解析合工大教务系统导出的docx课表"""

    # 合工大2025-2026学年第二学期校历
    # 开学第一周: 2026年2月23日(周一)
    SEMESTER_START = date(2026, 2, 23)
    TOTAL_WEEKS = 18

    @staticmethod
    def get_current_week(today: date = None) -> int:
        """根据校历计算当前是第几周"""
        if today is None:
            today = date.today()
        delta = (today - ScheduleParser.SEMESTER_START).days
        if delta < 0:
            return 0  # 还没开学
        week = delta // 7 + 1
        return min(week, ScheduleParser.TOTAL_WEEKS)

    @staticmethod
    def parse_weeks(weeks_str: str) -> list[int]:
        """解析周次字符串为周次列表
        例如: '1~16' -> [1,2,...,16]
              '1~3,5~6' -> [1,2,3,5,6]
              '2~4(双)' -> [2,4]
              '3,8,13,17' -> [3,8,13,17]
              '1~18(单)' -> [1,3,5,7,9,11,13,15,17]
        """
        result = []
        # 处理(双)和(单)标记
        is_odd = '(单)' in weeks_str
        is_even = '(双)' in weeks_str

        # 移除标记
        clean = weeks_str.replace('(单)', '').replace('(双)', '').strip()

        # 按逗号分割
        parts = clean.split(',')
        for part in parts:
            part = part.strip()
            if '~' in part:
                start, end = part.split('~')
                start, end = int(start.strip()), int(end.strip())
                for w in range(start, end + 1):
                    result.append(w)
            else:
                try:
                    result.append(int(part))
                except ValueError:
                    continue

        # 应用单双周过滤
        if is_even:
            result = [w for w in result if w % 2 == 0]
        elif is_odd:
            result = [w for w in result if w % 2 == 1]

        return sorted(set(result))

    @staticmethod
    def parse_schedule_text(text: str) -> list[dict]:
        """解析课表文本内容，返回课程列表
        
        合工大课表格式示例：
        编译原理 003
        (12~16周) (1-2节) 敬亭学堂321 王晓亮
        """
        courses = []
        seen = set()  # 去重

        # 匹配模式：课程名 + 编号 + (周次) + (节次) + 教室 + 教师
        # 可能有换行
        pattern = re.compile(
            r'([^\n(]+?)\s+(\d{3})\s*\n?'  # 课程名 + 编号
            r'\(([^)]+周)\)\s*'              # 周次
            r'\((\d+)(?:-(\d+))?节\)\s*'     # 节次
            r'([^\n(]+?)\s+'                  # 教室
            r'([^\n(]+?)(?:\s*\n|$)',         # 教师
            re.MULTILINE
        )

        # 更宽松的匹配：逐行解析
        lines = text.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue

            # 尝试匹配课程行（包含课程名和编号）
            course_match = re.match(r'^(.+?)\s+(\d{3}[A-Z]?)\s*$', line)
            if course_match:
                course_name = course_match.group(1).strip()
                course_code = course_match.group(2).strip()

                # 下一行应该是周次和节次信息
                if i + 1 < len(lines):
                    detail_line = lines[i + 1].strip()
                    detail_match = re.match(
                        r'\(([^)]+周)\)\s*\((\d+)(?:-(\d+))?节\)\s*(.+?)\s+(\S+)$',
                        detail_line
                    )
                    if detail_match:
                        weeks_str = detail_match.group(1)
                        start_section = int(detail_match.group(2))
                        end_section = int(detail_match.group(3)) if detail_match.group(3) else start_section
                        location = detail_match.group(4).strip()
                        teacher = detail_match.group(5).strip()

                        # 去重key
                        key = f"{course_name}_{weeks_str}_{start_section}"
                        if key not in seen:
                            seen.add(key)
                            weeks = ScheduleParser.parse_weeks(weeks_str)
                            courses.append({
                                "course_name": course_name,
                                "course_code": course_code,
                                "teacher": teacher,
                                "location": location,
                                "start_section": start_section,
                                "end_section": end_section,
                                "weeks": weeks,
                                "weeks_str": weeks_str,
                            })
                        i += 2
                        continue

            # 尝试单行匹配（课程信息在一行）
            single_match = re.match(
                r'^(.+?)\s+(\d{3}[A-Z]?)\s*\(([^)]+周)\)\s*\((\d+)(?:-(\d+))?节\)\s*(.+?)\s+(\S+)$',
                line
            )
            if single_match:
                course_name = single_match.group(1).strip()
                course_code = single_match.group(2).strip()
                weeks_str = single_match.group(3)
                start_section = int(single_match.group(4))
                end_section = int(single_match.group(5)) if single_match.group(5) else start_section
                location = single_match.group(6).strip()
                teacher = single_match.group(7).strip()

                key = f"{course_name}_{weeks_str}_{start_section}"
                if key not in seen:
                    seen.add(key)
                    weeks = ScheduleParser.parse_weeks(weeks_str)
                    courses.append({
                        "course_name": course_name,
                        "course_code": course_code,
                        "teacher": teacher,
                        "location": location,
                        "start_section": start_section,
                        "end_section": end_section,
                        "weeks": weeks,
                        "weeks_str": weeks_str,
                    })
                i += 1
                continue

            i += 1

        return courses

    @staticmethod
    def parse_docx_table(text: str) -> dict:
        """解析docx课表表格内容，返回按星期×节次组织的课表
        
        返回格式:
        {
            "info": {"grade": "2024", "college": "...", "major": "...", "class": "...", "student_id": "...", "name": "..."},
            "schedule": {
                "1": {  # 星期一
                    "1": [{"course_name": "...", "weeks": [...], ...}],  # 第1节
                    "3": [...],  # 第3节
                },
                "2": {...},  # 星期二
            },
            "courses": [...],  # 所有课程列表(去重)
            "current_week": 15,
            "current_week_schedule": {
                "1": {"1": [...], "3": [...]},
                ...
            }
        }
        """
        # 提取学生信息
        info = {}
        info_patterns = {
            "grade": r'年级[：:]\s*(\S+)',
            "college": r'学院[：:]\s*(\S+)',
            "major": r'专业[：:]\s*(\S+)',
            "class": r'班级[：:]\s*(\S+)',
            "student_id": r'学号[：:]\s*(\S+)',
            "name": r'姓名[：:]\s*(\S+)',
        }
        for key, pattern in info_patterns.items():
            match = re.search(pattern, text)
            if match:
                info[key] = match.group(1).strip()

        # 解析所有课程
        all_courses = ScheduleParser.parse_schedule_text(text)

        # 获取当前周次
        current_week = ScheduleParser.get_current_week()

        # 过滤掉网络课（备注中标注的）
        network_courses = set()
        note_match = re.search(r'备注[：:]\s*(.+)', text, re.DOTALL)
        if note_match:
            notes = note_match.group(1)
            # 提取网络课名称
            net_matches = re.finditer(r'(\d+\.\s*(.+?)(?:--|\s*任务备注))', notes)
            for m in net_matches:
                net_name = m.group(2).strip()
                network_courses.add(net_name)

        # 过滤网络课
        filtered_courses = []
        for c in all_courses:
            is_network = False
            for nc in network_courses:
                if nc in c["course_name"] or c["course_name"] in nc:
                    is_network = True
                    break
            if not is_network:
                filtered_courses.append(c)

        # 按当前周过滤
        current_week_courses = []
        for c in filtered_courses:
            if current_week in c["weeks"]:
                current_week_courses.append(c)

        # 构建按星期×节次组织的课表
        schedule = {}
        current_week_schedule = {}

        for c in filtered_courses:
            for dow in range(1, 8):  # 星期1-7
                day_key = str(dow)
                # 需要从原始文本中判断课程在星期几
                # 这里简化处理：课程列表中没有星期信息，需要从表格位置获取
                pass

        return {
            "info": info,
            "courses": filtered_courses,
            "current_week": current_week,
            "current_week_courses": current_week_courses,
            "total_courses": len(filtered_courses),
        }

    @staticmethod
    def parse_full_schedule(text: str) -> dict:
        """完整解析课表，包括星期和节次的位置信息
        
        从docx表格中解析，表格结构：
        行: 上午1-2, 3-4, 下午5-6, 7-8, 晚9-11
        列: 星期一~星期日
        """
        info = {}
        info_patterns = {
            "grade": r'年级[：:]\s*(\S+)',
            "college": r'学院[：:]\s*(\S+)',
            "major": r'专业[：:]\s*(\S+)',
            "class": r'班级[：:]\s*(\S+)',
            "student_id": r'学号[：:]\s*(\S+)',
            "name": r'姓名[：:]\s*(\S+)',
        }
        for key, pattern in info_patterns.items():
            match = re.search(pattern, text)
            if match:
                info[key] = match.group(1).strip()

        current_week = ScheduleParser.get_current_week()

        # 过滤网络课
        network_keywords = ['形势与政策', '网络课', '慕课']
        note_match = re.search(r'备注[：:]\s*(.+)', text, re.DOTALL)
        if note_match:
            notes = note_match.group(1)
            net_matches = re.finditer(r'\d+\.\s*(.+?)(?:--|\s*任务备注)', notes)
            for m in net_matches:
                network_keywords.append(m.group(1).strip().split('--')[0].strip())

        # 解析所有课程条目
        # 格式: 课程名 编号\n(周次) (节次) 教室 教师
        course_pattern = re.compile(
            r'([^\n(]{2,}?)\s+(\d{3}[A-Z]?)\s*\n?'
            r'\(([^)]*?周)\)\s*'
            r'\((\d+)(?:-(\d+))?节\)\s*'
            r'([^\n(]*?)\s+'
            r'([\u4e00-\u9fa5a-zA-Z·]+)',
            re.MULTILINE
        )

        # 更通用的匹配
        all_entries = []
        # 按行扫描
        lines = text.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            # 匹配课程名+编号行
            m = re.match(r'^(.+?)\s+(\d{3}[A-Z]?)\s*$', line)
            if m and i + 1 < len(lines):
                cname = m.group(1).strip()
                ccode = m.group(2).strip()
                next_line = lines[i + 1].strip()
                # 匹配详情行
                dm = re.match(r'\(([^)]*?周)\)\s*\((\d+)(?:-(\d+))?节\)\s*(.+?)\s+([\u4e00-\u9fa5a-zA-Z·]+)\s*$', next_line)
                if dm:
                    weeks_str = dm.group(1)
                    start_sec = int(dm.group(2))
                    end_sec = int(dm.group(3)) if dm.group(3) else start_sec
                    location = dm.group(4).strip()
                    teacher = dm.group(5).strip()
                    weeks = ScheduleParser.parse_weeks(weeks_str)

                    # 检查是否网络课
                    is_network = any(kw in cname for kw in network_keywords)
                    if not is_network:
                        all_entries.append({
                            "course_name": cname,
                            "course_code": ccode,
                            "teacher": teacher,
                            "location": location,
                            "start_section": start_sec,
                            "end_section": end_sec,
                            "weeks": weeks,
                            "weeks_str": weeks_str,
                        })
                    i += 2
                    continue
            i += 1

        # 去重
        seen = set()
        unique_entries = []
        for e in all_entries:
            key = f"{e['course_name']}_{e['weeks_str']}_{e['start_section']}"
            if key not in seen:
                seen.add(key)
                unique_entries.append(e)

        # 当前周课程
        current_week_entries = [e for e in unique_entries if current_week in e["weeks"]]

        return {
            "info": info,
            "courses": unique_entries,
            "current_week": current_week,
            "current_week_courses": current_week_entries,
            "total_courses": len(unique_entries),
        }


schedule_parser = ScheduleParser()
