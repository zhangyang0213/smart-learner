import { useEffect, useState } from 'react';
import { auth } from '@/services/api';
import { useAppStore } from '@/store';
import type { ScheduleItem } from '@/types';

const mockSchedule: ScheduleItem[] = [
  { id: '1', title: '数据结构与算法', day: 1, start_time: '08:00', end_time: '09:35', location: '逸夫楼 301', teacher: '王教授', color: '#1E3A5F' },
  { id: '2', title: '高等数学', day: 1, start_time: '10:05', end_time: '11:40', location: '教学楼 A201', teacher: '赵教授', color: '#10B981' },
  { id: '3', title: '操作系统', day: 2, start_time: '08:00', end_time: '09:35', location: '计算机楼 102', teacher: '李教授', color: '#F59E0B' },
  { id: '4', title: '计算机网络', day: 2, start_time: '14:00', end_time: '15:35', location: '教学楼 B305', teacher: '张教授', color: '#8B5CF6' },
  { id: '5', title: '数据结构与算法', day: 3, start_time: '08:00', end_time: '09:35', location: '逸夫楼 301', teacher: '王教授', color: '#1E3A5F' },
  { id: '6', title: '数据库系统', day: 3, start_time: '10:05', end_time: '11:40', location: '计算机楼 203', teacher: '陈教授', color: '#EF4444' },
  { id: '7', title: '高等数学', day: 4, start_time: '10:05', end_time: '11:40', location: '教学楼 A201', teacher: '赵教授', color: '#10B981' },
  { id: '8', title: '人工智能导论', day: 4, start_time: '14:00', end_time: '15:35', location: '教学楼 C401', teacher: '刘教授', color: '#06B6D4' },
  { id: '9', title: '操作系统', day: 5, start_time: '08:00', end_time: '09:35', location: '计算机楼 102', teacher: '李教授', color: '#F59E0B' },
  { id: '10', title: '计算机网络', day: 5, start_time: '10:05', end_time: '11:40', location: '教学楼 B305', teacher: '张教授', color: '#8B5CF6' },
  { id: '11', title: '数据库系统', day: 5, start_time: '14:00', end_time: '15:35', location: '计算机楼 203', teacher: '陈教授', color: '#EF4444' },
];

// Time sections: 1-12 节, each section is 45 minutes
// Section 1-2: 08:00-09:35, Section 3-4: 10:05-11:40, Section 5-6: 13:30-15:05
// Section 7-8: 15:25-17:00, Section 9-10: 18:30-20:05, Section 11-12: 20:20-21:55
const timeSections = [
  { section: 1, time: '08:00' },
  { section: 2, time: '08:50' },
  { section: 3, time: '10:05' },
  { section: 4, time: '10:55' },
  { section: 5, time: '13:30' },
  { section: 6, time: '14:20' },
  { section: 7, time: '15:25' },
  { section: 8, time: '16:15' },
  { section: 9, time: '18:30' },
  { section: 10, time: '19:20' },
  { section: 11, time: '20:20' },
  { section: 12, time: '21:10' },
];

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// Map start_time to section number
function timeToSection(time: string): number {
  const map: Record<string, number> = {
    '08:00': 1, '08:50': 2,
    '10:05': 3, '10:55': 4,
    '13:30': 5, '14:20': 6,
    '15:25': 7, '16:15': 8,
    '18:30': 9, '19:20': 10,
    '20:20': 11, '21:10': 12,
  };
  return map[time] || 1;
}

function sectionSpan(start: string, end: string): number {
  const startSec = timeToSection(start);
  const endSec = timeToSection(end);
  return endSec - startSec + 1;
}

export default function Schedule() {
  const user = useAppStore((s) => s.user);
  const userId = user?.user_id || '1';
  const [schedule, setSchedule] = useState<ScheduleItem[]>(mockSchedule);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await auth.getSchedule(userId);
        if (res.success) setSchedule(res.data);
      } catch {
        // Use mock data
      }
      setLoading(false);
    }
    fetchSchedule();
  }, [userId]);

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

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-warm-800 mb-6">课程表</h1>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-warm-200">
              <div className="p-2 text-center text-xs text-warm-400 font-medium border-r border-warm-200">
                节次
              </div>
              {dayLabels.map((label, idx) => (
                <div
                  key={label}
                  className={`p-2 text-center text-sm font-semibold border-r border-warm-200 last:border-r-0 ${
                    currentDay === idx + 1
                      ? 'bg-navy-50 text-navy-700'
                      : 'text-warm-600'
                  }`}
                >
                  <div>{label}</div>
                  {currentDay === idx + 1 && (
                    <div className="text-xs text-navy-500 font-normal">今天</div>
                  )}
                </div>
              ))}
            </div>

            {/* Time Rows */}
            {timeSections.map((section) => (
              <div
                key={section.section}
                className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-warm-100 last:border-b-0 min-h-[48px]"
              >
                {/* Section Label */}
                <div className="p-1 text-center border-r border-warm-200 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-warm-700">{section.section}</span>
                  <span className="text-[10px] text-warm-400">{section.time}</span>
                </div>

                {/* Day Cells */}
                {dayLabels.map((_, dayIdx) => {
                  const day = dayIdx + 1;
                  const items = schedule.filter(
                    (s) => s.day === day && timeToSection(s.start_time) <= section.section && timeToSection(s.end_time) >= section.section
                  );

                  // Only render the course block at its starting section
                  const startingItems = items.filter(
                    (s) => timeToSection(s.start_time) === section.section
                  );

                  return (
                    <div
                      key={day}
                      className={`p-0.5 border-r border-warm-100 last:border-r-0 relative ${
                        currentDay === day ? 'bg-navy-50/30' : ''
                      }`}
                    >
                      {startingItems.map((item) => {
                        const span = sectionSpan(item.start_time, item.end_time);
                        return (
                          <div
                            key={item.id}
                            className="rounded-md p-1.5 text-white text-xs overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            style={{
                              backgroundColor: item.color || '#1E3A5F',
                              height: `${span * 48 - 4}px`,
                            }}
                            title={`${item.title}\n${item.location}\n${item.teacher}\n${item.start_time}-${item.end_time}`}
                          >
                            <p className="font-semibold truncate leading-tight">{item.title}</p>
                            <p className="opacity-80 truncate leading-tight mt-0.5">{item.location}</p>
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
        {Array.from(new Set(schedule.map((s) => s.title))).map((title) => {
          const item = schedule.find((s) => s.title === title);
          return (
            <div key={title} className="flex items-center gap-1.5 text-xs text-warm-600">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item?.color || '#1E3A5F' }}
              />
              {title}
            </div>
          );
        })}
      </div>
    </div>
  );
}
