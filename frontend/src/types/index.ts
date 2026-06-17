// ============ Schedule ============
export interface ScheduleItem {
  course_name: string;
  course_code: string;
  teacher: string;
  location: string;
  start_section: number;
  end_section: number;
  day_of_week: number; // 1=Monday, 7=Sunday
  weeks: number[];
  weeks_str: string;
}

// ============ Course ============
export interface Course {
  id: string;
  name: string;
  code: string;
  teacher: string;
  semester: string;
  description?: string;
  documents: Document[];
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  course_id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_at: string;
}

// ============ Knowledge ============
export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Quiz ============
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ============ Paper ============
export interface PaperAnalysis {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  key_findings: string[];
  methodology: string;
  contributions: string[];
  limitations: string[];
  related_topics: string[];
  published_date?: string;
  venue?: string;
  created_at: string;
}

// ============ Study Plan ============
export interface StudyPlan {
  id: string;
  title: string;
  goal: string;
  subject: string;
  start_date: string;
  end_date: string;
  phases: PlanPhase[];
  status: 'active' | 'completed' | 'paused';
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface PlanPhase {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  tasks: string[];
  completed_tasks: number;
  total_tasks: number;
  status: 'pending' | 'in_progress' | 'completed';
}

// ============ Study Record ============
export interface StudyRecord {
  id: string;
  plan_id: string;
  date: string;
  duration: number; // minutes
  content: string;
  notes?: string;
  mood?: 'great' | 'good' | 'okay' | 'bad';
  created_at: string;
}

// ============ Team ============
export interface Team {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  members: TeamMember[];
  announcements: Announcement[];
  todos: TodoItem[];
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  due_date?: string;
  created_at: string;
}

// ============ Dashboard ============
export interface DashboardOverview {
  total_courses: number;
  total_documents: number;
  total_knowledge_items: number;
  active_plans: number;
  study_hours_today: number;
  study_hours_week: number;
  upcoming_deadlines: Deadline[];
}

export interface Deadline {
  id: string;
  title: string;
  due_date: string;
  type: 'assignment' | 'exam' | 'project' | 'other';
  course_name?: string;
}

export interface StudyStats {
  total_hours: number;
  daily_average: number;
  streak_days: number;
  subject_distribution: SubjectStat[];
  weekly_data: DailyStat[];
  monthly_data: DailyStat[];
}

export interface SubjectStat {
  subject: string;
  hours: number;
  percentage: number;
}

export interface DailyStat {
  date: string;
  hours: number;
}

// ============ Activity ============
export interface Activity {
  id: string;
  type: 'course_add' | 'document_upload' | 'knowledge_add' | 'quiz_complete' | 'plan_create' | 'study_record' | 'team_join' | 'paper_analyze';
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
}

// ============ Chat ============
export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============ User ============
export interface UserProfile {
  user_id: string;
  name: string;
  student_id: string;
  college: string;
  major: string;
  grade: string;
  avatar?: string;
  email?: string;
  created_at: string;
}

// ============ ko-lesson 课程学习相关类型 ============
export interface LessonUnit {
  name: string;
  difficulty: '入门' | '进阶' | '高级';
  knowledge_points: string[];
  prerequisites: string[];
  order: number;
  source: string;
}

export interface LessonOutline {
  course_name: string;
  units: LessonUnit[];
}

export interface LessonSection {
  type: 'life_intro' | 'logic' | 'course_content' | 'formal' | 'deep_dive' | 'application' | 'quick_check' | 'feedback';
  title: string;
  content: string;
}

export interface LessonContent {
  title: string;
  objectives: string[];
  knowledge_points: string[];
  sections: LessonSection[];
  quick_check: { question: string; answer_hint: string }[];
  feedback_entry: { can_retell: string; stuck_at: string; difficulty: number; next_step: string };
}

export interface MasteryEvaluation {
  mastery_level: '未接触' | '能听懂' | '能复述' | '能做题' | '能应用' | '能迁移';
  analysis: string;
  next_action: 'continue' | 'supplement' | 'change_example' | 'add_practice' | 'downgrade' | 'reorder';
  need_reinforce: boolean;
}

export interface ExamQuestion {
  type: 'single_choice' | 'multi_choice' | 'concept' | 'case_study';
  knowledge_point: string;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  source: string;
}

export interface ExamRecord {
  id: number;
  lesson_course_id: number;
  exam_type: string;
  questions: ExamQuestion[];
  user_answers: Record<string, string>;
  score: number;
  graded: any[];
  round_num: number;
}

export interface LearnerProfile {
  id?: number;
  user_id: number;
  goals: { main_goal: string; target_task: string; application_scene: string };
  background: { mastered: string; familiar: string; unfamiliar: string; experience: string };
  preferences: { explanation_style: string; dislike_style: string; example_scene: string; practice_form: string };
  knowledge_transfer: { new_field: string; analogy: string; method: string; scene: string; boundary: string }[];
}

export interface LessonCourseItem {
  id: number;
  course_name: string;
  outline: LessonOutline;
  status: string;
  created_at: string;
}

// ============ API Response ============
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  page_size: number;
  message?: string;
}
