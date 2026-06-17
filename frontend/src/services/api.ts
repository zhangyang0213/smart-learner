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

async function streamChat(
  url: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void
): Promise<void> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
          // If not JSON, treat as plain text
          onChunk(data);
        }
      }
    }
  }
}

// ============ Auth ============
export const auth = {
  casLogin: () => {
    window.location.href = `${BASE_URL}/api/auth/cas/login`;
  },

  casCallback: (ticket: string) =>
    request<ApiResponse<{ user: UserProfile; token: string }>>(
      `/api/auth/cas/callback?ticket=${encodeURIComponent(ticket)}`
    ),

  getSchedule: () =>
    request<ApiResponse<ScheduleItem[]>>('/api/auth/schedule'),

  getProfile: () =>
    request<ApiResponse<UserProfile>>('/api/auth/profile'),
};

// ============ Course ============
export const course = {
  listCourses: () =>
    request<ApiResponse<Course[]>>('/api/courses'),

  addCourse: (data: { name: string; code: string; teacher: string; semester: string; description?: string }) =>
    request<ApiResponse<Course>>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCourse: (id: string) =>
    request<ApiResponse<Course>>(`/api/courses/${id}`),

  uploadDocument: (courseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadRequest<ApiResponse<Document>>(
      `/api/courses/${courseId}/documents`,
      formData
    );
  },

  listDocuments: (courseId: string) =>
    request<ApiResponse<Document[]>>(`/api/courses/${courseId}/documents`),

  askQuestion: (courseId: string, question: string) =>
    request<ApiResponse<ChatMessage>>('/api/courses/ask', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, question }),
    }),

  askStream: (courseId: string, question: string, onChunk: (text: string) => void) =>
    streamChat('/api/courses/ask/stream', { course_id: courseId, question }, onChunk),

  generateQuiz: (courseId: string, documentId?: string, count: number = 5) =>
    request<ApiResponse<QuizQuestion[]>>('/api/courses/quiz', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, document_id: documentId, count }),
    }),
};

// ============ Knowledge ============
export const knowledge = {
  addKnowledge: (data: { title: string; content: string; category: string; tags?: string[]; source?: string }) =>
    request<ApiResponse<KnowledgeItem>>('/api/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  searchKnowledge: (query: string, category?: string, limit: number = 10) =>
    request<ApiResponse<KnowledgeItem[]>>('/api/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, category, limit }),
    }),

  askKnowledge: (question: string) =>
    request<ApiResponse<ChatMessage>>('/api/knowledge/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  askStream: (question: string, onChunk: (text: string) => void) =>
    streamChat('/api/knowledge/ask/stream', { question }, onChunk),

  listCategories: () =>
    request<ApiResponse<string[]>>('/api/knowledge/categories'),

  listItems: (params?: { category?: string; page?: number; page_size?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    const query = searchParams.toString();
    return request<PaginatedResponse<KnowledgeItem>>(
      `/api/knowledge${query ? `?${query}` : ''}`
    );
  },

  archiveItem: (id: string) =>
    request<ApiResponse<KnowledgeItem>>(`/api/knowledge/${id}/archive`, {
      method: 'PUT',
    }),
};

// ============ Paper ============
export const paper = {
  analyzePaper: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadRequest<ApiResponse<PaperAnalysis>>('/api/papers/analyze', formData);
  },

  summarizePaper: (paperId: string) =>
    request<ApiResponse<PaperAnalysis>>(`/api/papers/${paperId}/summarize`),

  paperQA: (paperId: string, question: string) =>
    request<ApiResponse<ChatMessage>>(`/api/papers/${paperId}/qa`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  suggestRelated: (paperId: string) =>
    request<ApiResponse<PaperAnalysis[]>>(`/api/papers/${paperId}/related`),
};

// ============ Study ============
export const study = {
  createPlan: (data: { title: string; goal: string; subject: string; start_date: string; end_date: string }) =>
    request<ApiResponse<StudyPlan>>('/api/study/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listPlans: () =>
    request<ApiResponse<StudyPlan[]>>('/api/study/plans'),

  getPlan: (id: string) =>
    request<ApiResponse<StudyPlan>>(`/api/study/plans/${id}`),

  updatePlan: (id: string, data: Partial<StudyPlan>) =>
    request<ApiResponse<StudyPlan>>(`/api/study/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addRecord: (data: { plan_id: string; date: string; duration: number; content: string; notes?: string; mood?: string }) =>
    request<ApiResponse<StudyRecord>>('/api/study/records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStats: (period?: 'week' | 'month' | 'year') =>
    request<ApiResponse<StudyStats>>(`/api/study/stats${period ? `?period=${period}` : ''}`),

  getDailyReport: (date?: string) =>
    request<ApiResponse<{ date: string; total_hours: number; records: StudyRecord[]; summary: string }>>(
      `/api/study/daily-report${date ? `?date=${date}` : ''}`
    ),
};

// ============ Team ============
export const team = {
  createTeam: (data: { name: string; description: string }) =>
    request<ApiResponse<Team>>('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  joinTeam: (inviteCode: string) =>
    request<ApiResponse<Team>>('/api/teams/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    }),

  listTeams: () =>
    request<ApiResponse<Team[]>>('/api/teams'),

  getTeam: (id: string) =>
    request<ApiResponse<Team>>(`/api/teams/${id}`),

  addAnnouncement: (teamId: string, data: { title: string; content: string }) =>
    request<ApiResponse<Team>>(`/api/teams/${teamId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addTodo: (teamId: string, data: { title: string; assignee?: string; due_date?: string }) =>
    request<ApiResponse<Team>>(`/api/teams/${teamId}/todos`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleTodo: (teamId: string, todoId: string) =>
    request<ApiResponse<Team>>(`/api/teams/${teamId}/todos/${todoId}/toggle`, {
      method: 'PUT',
    }),
};

// ============ Dashboard ============
export const dashboard = {
  getOverview: () =>
    request<ApiResponse<DashboardOverview>>('/api/dashboard/overview'),

  getRecentActivities: (limit: number = 10) =>
    request<ApiResponse<Activity[]>>(`/api/dashboard/activities?limit=${limit}`),
};

// ============ Lesson ============
export const lesson = {
  generateOutline: (userId: number, materials: string[], courseName: string) =>
    request<ApiResponse<LessonOutline>>('/api/lesson/outline', { method: 'POST', body: JSON.stringify({ user_id: userId, materials, course_name: courseName }) }),

  generateLesson: (lessonCourseId: number, unitIndex: number) =>
    request<ApiResponse<LessonContent>>('/api/lesson/generate', { method: 'POST', body: JSON.stringify({ lesson_course_id: lessonCourseId, unit_index: unitIndex }) }),

  submitFeedback: (lessonCourseId: number, unitIndex: number, feedback: any) =>
    request<ApiResponse<any>>('/api/lesson/feedback', { method: 'POST', body: JSON.stringify({ lesson_course_id: lessonCourseId, unit_index: unitIndex, feedback }) }),

  evaluateMastery: (lessonCourseId: number, unitIndex: number, feedback: any) =>
    request<ApiResponse<MasteryEvaluation>>('/api/lesson/evaluate', { method: 'POST', body: JSON.stringify({ lesson_course_id: lessonCourseId, unit_index: unitIndex, feedback }) }),

  generateExam: (lessonCourseId: number, examType: string = 'final') =>
    request<ApiResponse<ExamRecord>>('/api/lesson/exam', { method: 'POST', body: JSON.stringify({ lesson_course_id: lessonCourseId, exam_type: examType }) }),

  gradeExam: (examId: number, userAnswers: Record<string, string>) =>
    request<ApiResponse<ExamRecord>>('/api/lesson/grade', { method: 'POST', body: JSON.stringify({ exam_id: examId, user_answers: userAnswers }) }),

  generateConsolidation: (examId: number) =>
    request<ApiResponse<ExamRecord>>('/api/lesson/consolidation', { method: 'POST', body: JSON.stringify({ exam_id: examId }) }),

  getProfile: (userId: number) =>
    request<ApiResponse<LearnerProfile>>(`/api/lesson/profile/${userId}`),

  updateProfile: (userId: number, profile: any) =>
    request<ApiResponse<LearnerProfile>>(`/api/lesson/profile/${userId}`, { method: 'PUT', body: JSON.stringify(profile) }),
};
