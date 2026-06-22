import type {
  ApiResponse,
  PaginatedResponse,
  ScheduleItem,
  Course,
  Document,
  KnowledgeItem,
  QuizQuestion,
  PaperAnalysis,
  StudyPlan,
  StudyRecord,
  StudyStats,
  Team,
  DashboardOverview,
  Activity,
  ChatMessage,
  UserProfile,
  LessonOutline,
  LessonContent,
  MasteryEvaluation,
  ExamRecord,
  LearnerProfile,
  LessonCourseItem,
} from '@/types';
import { useToastStore } from '@/store/toast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ============ Base Request Helpers ============

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    const message = error.detail || `请求失败: ${response.status}`;
    useToastStore.getState().addToast('error', message);
    throw new Error(message);
  }

  return response.json();
}

/** Send form-encoded data (URLSearchParams) for backend Form() params */
async function formRequest<T>(
  endpoint: string,
  data: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    const message = error.detail || `请求失败: ${response.status}`;
    useToastStore.getState().addToast('error', message);
    throw new Error(message);
  }

  return response.json();
}

/** Send multipart/form-data for file uploads */
async function uploadRequest<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `上传失败: ${response.status}`);
  }

  return response.json();
}

/** Build a GET URL with query parameters */
function queryRequest<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<T> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const query = searchParams.toString();
  return request<T>(`${endpoint}${query ? `?${query}` : ''}`);
}

/** Stream chat via SSE */
async function streamFormChat(
  url: string,
  data: Record<string, string | number | undefined>,
  onChunk: (text: string) => void
): Promise<void> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    const message = error.detail || `请求失败: ${response.status}`;
    useToastStore.getState().addToast('error', message);
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch {
          onChunk(data);
        }
      }
    }
  }
}

// ============ Auth ============
export const auth = {
  register: (studentId: string, name: string, college: string, major: string, grade: string) =>
    formRequest<ApiResponse<{ user: UserProfile }>>('/api/auth/register', {
      student_id: studentId,
      name,
      college,
      major,
      grade,
    }),

  uploadSchedule: (userId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    return uploadRequest<ApiResponse<{ message: string }>>('/api/auth/upload-schedule', formData);
  },

  getSchedule: (userId: string, week?: number) =>
    request<ApiResponse<ScheduleItem[]>>(`/api/auth/schedule/${encodeURIComponent(userId)}${week ? `?week=${week}` : ''}`),

  getProfile: (userId: string) =>
    request<ApiResponse<UserProfile>>(`/api/auth/profile/${encodeURIComponent(userId)}`),
};

// ============ Course ============
export const course = {
  listCourses: (userId: string) =>
    queryRequest<ApiResponse<Course[]>>('/api/course/list', { user_id: userId }),

  addCourse: (data: { name: string; code: string; teacher: string; semester: string; description?: string; user_id: string }) =>
    formRequest<ApiResponse<Course>>('/api/course/add', data),

  uploadDocument: (courseId: string, file: File, userId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);
    formData.append('user_id', userId);
    return uploadRequest<ApiResponse<Document>>(
      `/api/course/upload`,
      formData
    );
  },

  askQuestion: (courseId: string, question: string, userId: string) =>
    formRequest<ApiResponse<ChatMessage>>('/api/course/ask', {
      course_id: courseId,
      question,
      user_id: userId,
    }),

  askStream: (courseId: string, question: string, userId: string, onChunk: (text: string) => void) =>
    streamFormChat('/api/course/ask/stream', {
      course_id: courseId,
      question,
      user_id: userId,
    }, onChunk),

  generateQuiz: (courseId: string, userId: string, documentId?: string, count: number = 5) =>
    formRequest<ApiResponse<QuizQuestion[]>>('/api/course/quiz/generate', {
      course_id: courseId,
      user_id: userId,
      document_id: documentId,
      count,
    }),
};

// ============ Knowledge ============
export const knowledge = {
  addKnowledge: (data: { title: string; content: string; category: string; tags?: string; source?: string; user_id: string }) =>
    formRequest<ApiResponse<KnowledgeItem>>('/api/knowledge/add', data),

  searchKnowledge: (query: string, userId: string, category?: string, limit: number = 10) =>
    queryRequest<ApiResponse<KnowledgeItem[]>>('/api/knowledge/search', {
      query,
      user_id: userId,
      category,
      limit,
    }),

  askKnowledge: (question: string, userId: string) =>
    formRequest<ApiResponse<ChatMessage>>('/api/knowledge/ask', {
      question,
      user_id: userId,
    }),

  listCategories: (userId: string) =>
    queryRequest<ApiResponse<string[]>>('/api/knowledge/categories', { user_id: userId }),

  listItems: (userId: string, params?: { category?: string; page?: number; page_size?: number }) => {
    const queryParams: Record<string, string | number | undefined> = { user_id: userId };
    if (params?.category) queryParams.category = params.category;
    if (params?.page) queryParams.page = params.page;
    if (params?.page_size) queryParams.page_size = params.page_size;
    return queryRequest<PaginatedResponse<KnowledgeItem>>('/api/knowledge/items', queryParams);
  },

  archiveItem: (itemId: string) =>
    request<ApiResponse<KnowledgeItem>>(`/api/knowledge/${itemId}/archive`, {
      method: 'PUT',
    }),
};

// ============ Paper ============
export const paper = {
  analyzePaper: (file: File, userId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);
    return uploadRequest<any>('/api/paper/analyze', formData);
  },

  summarizePaper: (text: string, max_length: number = 500) =>
    formRequest<any>('/api/paper/summarize', {
      text,
      max_length,
    }),

  paperQA: (paperId: string, question: string, userId?: string) =>
    formRequest<any>('/api/paper/qa', {
      question,
      paper_text: question, // 后端需要paper_text，这里用question作为临时方案
    }),

  suggestRelated: (paperId: string, userId?: string) =>
    formRequest<any>('/api/paper/suggest-related', {
      paper_text: paperId, // 后端需要paper_text
    }),
};

// ============ Study ============
export const study = {
  createPlan: (data: { title: string; goal: string; subject: string; start_date: string; end_date: string; user_id: string }) =>
    formRequest<ApiResponse<StudyPlan>>('/api/study/plan/create', data),

  listPlans: (userId: string) =>
    queryRequest<ApiResponse<StudyPlan[]>>('/api/study/plan/list', { user_id: userId }),

  addRecord: (data: { plan_id: string; date: string; duration: number; content: string; notes?: string; mood?: string; user_id: string }) =>
    formRequest<ApiResponse<StudyRecord>>('/api/study/record', data),

  getStats: (userId: string, days?: number) =>
    queryRequest<ApiResponse<StudyStats>>('/api/study/stats', { user_id: userId, days }),

  getDailyReport: (userId: string) =>
    queryRequest<ApiResponse<{ date: string; total_hours: number; records: StudyRecord[]; summary: string }>>(
      '/api/study/daily-report',
      { user_id: userId }
    ),
};

// ============ Team ============
export const team = {
  createTeam: (data: { name: string; description: string; user_id: string }) =>
    formRequest<ApiResponse<Team>>('/api/team/create', data),

  joinTeam: (inviteCode: string, userId: string) =>
    formRequest<ApiResponse<Team>>('/api/team/join', {
      invite_code: inviteCode,
      user_id: userId,
    }),

  listTeams: (userId: string) =>
    queryRequest<ApiResponse<Team[]>>('/api/team/list', { user_id: userId }),

  addAnnouncement: (teamId: string, data: { title: string; content: string; user_id: string }) =>
    formRequest<ApiResponse<Team>>('/api/team/announcement', {
      team_id: teamId,
      ...data,
    }),

  addTodo: (teamId: string, data: { title: string; assignee?: string; due_date?: string; user_id: string }) =>
    formRequest<ApiResponse<Team>>('/api/team/todo', {
      team_id: teamId,
      ...data,
    }),

  toggleTodo: (teamId: string, todoIndex: number) =>
    request<ApiResponse<Team>>(`/api/team/todo/${teamId}/${todoIndex}`, {
      method: 'PUT',
    }),
};

// ============ Dashboard ============
export const dashboard = {
  getOverview: (userId: string) =>
    queryRequest<ApiResponse<DashboardOverview>>('/api/dashboard/overview', { user_id: userId }),

  getRecentActivities: (userId: string, limit: number = 10) =>
    queryRequest<ApiResponse<Activity[]>>('/api/dashboard/recent-activities', {
      user_id: userId,
      limit,
    }),
};

// ============ Lesson ============
export const lesson = {
  generateOutline: (userId: number, materials: string[], courseName: string) =>
    formRequest<ApiResponse<LessonOutline>>('/api/lesson/outline', {
      user_id: userId,
      materials: materials.join('\n'),
      course_name: courseName,
    }),

  generateLesson: (lessonCourseId: number, unitIndex: number) =>
    formRequest<ApiResponse<LessonContent>>('/api/lesson/generate', {
      lesson_course_id: lessonCourseId,
      unit_index: unitIndex,
    }),

  submitFeedback: (lessonCourseId: number, unitIndex: number, feedback: any) =>
    formRequest<ApiResponse<any>>('/api/lesson/feedback', {
      lesson_course_id: lessonCourseId,
      unit_index: unitIndex,
      feedback: JSON.stringify(feedback),
    }),

  evaluateMastery: (lessonCourseId: number, unitIndex: number, feedback: any) =>
    formRequest<ApiResponse<MasteryEvaluation>>('/api/lesson/evaluate', {
      lesson_course_id: lessonCourseId,
      unit_index: unitIndex,
      feedback: JSON.stringify(feedback),
    }),

  generateExam: (lessonCourseId: number, examType: string = 'final') =>
    formRequest<ApiResponse<ExamRecord>>('/api/lesson/exam', {
      lesson_course_id: lessonCourseId,
      exam_type: examType,
    }),

  gradeExam: (examId: number, userAnswers: Record<string, string>) =>
    formRequest<ApiResponse<ExamRecord>>('/api/lesson/grade', {
      exam_id: examId,
      user_answers: JSON.stringify(userAnswers),
    }),

  generateConsolidation: (examId: number) =>
    formRequest<ApiResponse<ExamRecord>>('/api/lesson/consolidation', {
      exam_id: examId,
    }),

  getProfile: (userId: number) =>
    request<ApiResponse<LearnerProfile>>(`/api/lesson/profile/${userId}`),

  updateProfile: (userId: number, profile: any) => {
    const params = new URLSearchParams();
    // Flatten profile object for form encoding
    const flatProfile: Record<string, string> = {};
    for (const [key, value] of Object.entries(profile)) {
      if (typeof value === 'object' && value !== null) {
        flatProfile[key] = JSON.stringify(value);
      } else {
        flatProfile[key] = String(value);
      }
    }
    for (const [key, value] of Object.entries(flatProfile)) {
      params.append(key, value);
    }
    return request<ApiResponse<LearnerProfile>>(`/api/lesson/profile/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  },

  uploadAndLearn: (userId: string, courseName: string, files: File[]) => {
    const formData = new FormData();
    formData.append('course_name', courseName);
    formData.append('user_id', userId);
    files.forEach(f => formData.append('files', f));
    return uploadRequest<any>('/api/lesson/upload-and-learn', formData);
  },

  chatAboutCourse: (lessonCourseId: number, question: string, userId: string) =>
    formRequest<any>('/api/lesson/chat', { lesson_course_id: String(lessonCourseId), question, user_id: userId }),

  chatAboutCourseStream: (lessonCourseId: number, question: string, userId: string, onChunk: (text: string) => void) =>
    streamFormChat('/api/lesson/chat/stream', { lesson_course_id: String(lessonCourseId), question, user_id: userId }, onChunk),
};
