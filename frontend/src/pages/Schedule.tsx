import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { auth } from '@/services/api';
import { useAppStore } from '@/store';
import type { ScheduleItem } from '@/types';

const mockSchedule: ScheduleItem[] = [
  // Monday
  { course_name: '编译原理', course_code: '003', teacher: '王晓亮', location: '敬亭学堂321', start_section: 1, end_section: 2, weeks: [12,13,14,15,16], weeks_str: '12~16周', day_of_week: 1 },
  { course_name: '网络与信息安全技术', course_code: '001', teacher: '顾辰', location: '新安学堂416', start_section: 3, end_section: 4, weeks: [1,2,3,4,5,6], weeks_str: '1~6周', day_of_week: 1 },
  { course_name: '深度学习', course_code: '001', teacher: '张涛林', location: '新安学堂416', start_section: 5, end_section: 6, weeks: [5,6,7,8], weeks_str: '5~8周', day_of_week: 1 },
  { course_name: '数据库系统', course_code: '006', teacher: '胡敏', location: '新安学堂316', start_section: 7, end_section: 8, weeks: [9,10,12,13,14,15], weeks_str: '9~10,12~15周', day_of_week: 1 },
  // Tuesday
  { course_name: '通用学术英语', course_code: '001', teacher: '张和', location: '新安学堂310', start_section: 3, end_section: 4, weeks: [2,4,5,6,7,9,10,11,12,14,15], weeks_str: '2~4(双),5~7,9~12,14~15周', day_of_week: 2 },
  { course_name: '计算机组成原理', course_code: '002', teacher: '贾伟', location: '敬亭学堂120', start_section: 5, end_section: 6, weeks: [1,2,3,4,5,6], weeks_str: '1~6周', day_of_week: 2 },
  { course_name: '软件工程', course_code: '001', teacher: '张弛', location: '新安学堂230', start_section: 7, end_section: 8, weeks: [3,4,5,6,7,8,9,10], weeks_str: '3~10周', day_of_week: 2 },
  // Wednesday
  { course_name: '毛泽东思想与中国特色社会主义理论体系概论', course_code: '013', teacher: '朱镕君', location: '敬亭学堂405', start_section: 1, end_section: 2, weeks: [1,2,3,4,5,6,7,8,9,10], weeks_str: '1~10周', day_of_week: 3 },
  { course_name: '编译原理', course_code: '003', teacher: '程乐超', location: '敬亭学堂323', start_section: 3, end_section: 4, weeks: [7,8,9,10,11], weeks_str: '7~11周', day_of_week: 3 },
  { course_name: '智能信息处理', course_code: '003', teacher: '刁云峰', location: '敬亭学堂416', start_section: 5, end_section: 6, weeks: [6,7,8], weeks_str: '6~8周', day_of_week: 3 },
  { course_name: '大学体育（4）', course_code: '042', teacher: '刘茜', location: '风雨操场', start_section: 7, end_section: 8, weeks: [1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18], weeks_str: '1~6,8~18周', day_of_week: 3 },
  // Thursday
  { course_name: '数据库系统', course_code: '006', teacher: '胡敏', location: '新安学堂316', start_section: 1, end_section: 2, weeks: [9,10,11,12,13,14,15], weeks_str: '9~15周', day_of_week: 4 },
  { course_name: '嵌入式人工智能', course_code: '001', teacher: '卫星', location: '新安学堂416', start_section: 5, end_section: 6, weeks: [12,13,14,15], weeks_str: '12~15周', day_of_week: 4 },
  { course_name: '深度学习', course_code: '001', teacher: '赵志伟', location: '新安学堂416', start_section: 5, end_section: 6, weeks: [1,2,3,4], weeks_str: '1~4周', day_of_week: 4 },
  { course_name: '计算机组成原理', course_code: '002', teacher: '贾伟', location: '敬亭学堂120', start_section: 7, end_section: 8, weeks: [4], weeks_str: '4周', day_of_week: 4 },
  // Friday
  { course_name: '嵌入式人工智能', course_code: '001', teacher: '卫星', location: '敬亭学堂405', start_section: 1, end_section: 2, weeks: [16,17], weeks_str: '16~17周', day_of_week: 5 },
  { course_name: '大学物理实验（下）', course_code: '015', teacher: '叶英豪', location: '物理实验室', start_section: 3, end_section: 4, weeks: [2,3,4,5,6,7,8,9], weeks_str: '2~9周', day_of_week: 5 },
  { course_name: '机器学习基础', course_code: '003', teacher: '刘建', location: '敬亭学堂218', start_section: 5, end_section: 6, weeks: [2,3,4,5,6], weeks_str: '2~6周', day_of_week: 5 },
  { course_name: '就业指导', course_code: '003', teacher: '孙子尧', location: '新安学堂414', start_section: 5, end_section: 6, weeks: [9,10,11,12], weeks_str: '9~12周', day_of_week: 5 },
  // Saturday
  { course_name: '大学体育（4）', course_code: '042', teacher: '刘茜', location: '风雨操场', start_section: 7, end_section: 8, weeks: [10], weeks_str: '10周', day_of_week: 6 },
];

const COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-orange-100 border-orange-400 text-orange-800',
  'bg-pink-100 border-pink-400 text-pink-800',
  'bg-teal-100 border-teal-400 text-teal-800',
  'bg-indigo-100 border-indigo-400 text-indigo-800',
  'bg-yellow-100 border-yellow-400 text-yellow-800',
];

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const sectionLabels = [
  { label: '1-2节', start: 1, end: 2, time: '08:00-09:35' },
  { label: '3-4节', start: 3, end: 4, time: '10:05-11:40' },
  { label: '5-6节', start: 5, end: 6, time: '13:30-15:05' },
  { label: '7-8节', start: 7, end: 8, time: '15:25-17:00' },
];

function getCourseColor(courseName: string): string {
  let hash = 0;
  for (let i = 0; i < courseName.length; i++) {
    hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Schedule() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const userId = user?.user_id || '1';
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(15);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await auth.getSchedule(userId, currentWeek);
        // Backend returns {schedule, current_week, ...}, not {success, data}
        const r = res as any;
        const scheduleData = r?.schedule || r?.data?.schedule;
        if (Array.isArray(scheduleData)) {
          setSchedule(scheduleData);
          if (r?.target_week) {
            setCurrentWeek(r.target_week);
          } else if (r?.current_week) {
            setCurrentWeek(r.current_week);
          }
          setLoading(false);
          return;
        }
      } catch {
        // Use mock data
      }
      setSchedule(mockSchedule);
      setLoading(false);
    }
    fetchSchedule();
  }, [userId, currentWeek]);

  // Filter schedule for current week
  const filteredSchedule = useMemo(
    () => schedule.filter((item) => item.weeks.includes(currentWeek)),
    [schedule, currentWeek]
  );

  // Build color map by course name
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    const allNames = Array.from(new Set(schedule.map((s) => s.course_name)));
    allNames.forEach((name) => {
      map.set(name, getCourseColor(name));
    });
    return map;
  }, [schedule]);

  // Get current day of week (1=Monday, 7=Sunday)
  const today = new Date().getDay();
  const currentDay = today === 0 ? 7 : today;

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold text-warm-800 mb-6">课程表</h1>
        <div className="card flex flex-col items-center justify-center py-16">
          <p className="text-warm-500 mb-4">请先上传课表</p>
          <button
            onClick={() => navigate('/lesson')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-600 text-white font-medium hover:bg-navy-500 transition-colors"
          >
            <Upload className="w-4 h-4" />
            上传课表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-warm-800">课程表</h1>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}
          disabled={currentWeek <= 1}
          className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className={`text-lg font-bold ${currentWeek === 15 ? 'text-navy-700' : 'text-warm-700'}`}>
          第{currentWeek}周
        </span>
        <button
          onClick={() => setCurrentWeek((w) => Math.min(20, w + 1))}
          disabled={currentWeek >= 20}
          className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Student Info Bar */}
      <div className="text-center text-sm text-warm-500 mb-5">
        {user?.name || '杨灵欣玥'} | {user?.student_id || '2024218652'} | {user?.major || '智能科学与技术'} | 第{currentWeek}周
      </div>

      {/* Schedule Grid */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header Row */}
            <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-warm-200">
              <div className="p-2 text-center text-xs text-warm-400 font-medium border-r border-warm-200">
                节次
              </div>
              {dayLabels.map((label, idx) => (
                <div
                  key={label}
                  className={`p-2 text-center text-sm font-semibold border-r border-warm-200 last:border-r-0 ${
                    currentDay === idx + 1
                      ? 'bg-blue-50 text-navy-700'
                      : 'text-warm-600'
                  }`}
                >
                  <div>{label}</div>
                  {currentDay === idx + 1 && (
                    <div className="text-xs text-blue-500 font-normal">今天</div>
                  )}
                </div>
              ))}
            </div>

            {/* Section Rows */}
            {sectionLabels.map((section) => (
              <div
                key={section.label}
                className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-warm-100 last:border-b-0"
              >
                {/* Section Label */}
                <div className="p-2 text-center border-r border-warm-200 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-warm-700">{section.label}</span>
                  <span className="text-[10px] text-warm-400 mt-0.5">{section.time}</span>
                </div>

                {/* Day Cells */}
                {dayLabels.map((_, dayIdx) => {
                  const dayOfWeek = dayIdx + 1;
                  const items = filteredSchedule.filter(
                    (s) => s.day_of_week === dayOfWeek && s.start_section <= section.end && s.end_section >= section.start
                  );

                  // Only render at the starting section row
                  const startingItems = items.filter((s) => s.start_section === section.start);

                  return (
                    <div
                      key={dayOfWeek}
                      className={`p-1 border-r border-warm-100 last:border-r-0 min-h-[72px] ${
                        currentDay === dayOfWeek ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {startingItems.map((item, idx) => {
                        const colorClass = colorMap.get(item.course_name) || COLORS[0];
                        const spanRows = (item.end_section - item.start_section) / 2 + 1;
                        return (
                          <div
                            key={`${item.course_name}-${item.day_of_week}-${item.start_section}-${idx}`}
                            className={`rounded-lg p-2 text-xs border-l-3 overflow-hidden ${colorClass}`}
                            style={{ minHeight: `${spanRows * 72 - 8}px` }}
                            title={`${item.course_name}\n${item.teacher}\n${item.location}\n${item.weeks_str}`}
                          >
                            <p className="font-bold truncate leading-tight">{item.course_name}</p>
                            <p className="opacity-80 truncate leading-tight mt-0.5">{item.teacher}</p>
                            <p className="opacity-70 truncate leading-tight">{item.location}</p>
                            <p className="opacity-60 truncate leading-tight">{item.weeks_str}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {Array.from(new Set(filteredSchedule.map((s) => s.course_name))).map((name) => {
          const colorClass = colorMap.get(name) || COLORS[0];
          const bgMatch = colorClass.match(/bg-(\w+)-100/);
          const bgColor = bgMatch ? bgMatch[1] : 'blue';
          return (
            <div key={name} className="flex items-center gap-1.5 text-xs text-warm-600">
              <div className={`w-3 h-3 rounded-sm bg-${bgColor}-400`} />
              {name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
