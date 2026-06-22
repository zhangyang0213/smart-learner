import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Brain,
  GraduationCap,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Menu,
  BookMarked,
} from 'lucide-react';
import { useAppStore } from '@/store';
import ToastContainer from '@/components/Toast';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Courses from '@/pages/Courses';
import CourseDetail from '@/pages/CourseDetail';
import Schedule from '@/pages/Schedule';
import Papers from '@/pages/Papers';
import Knowledge from '@/pages/Knowledge';
import Study from '@/pages/Study';
import Teams from '@/pages/Teams';
import Lesson from '@/pages/Lesson';

// ============ Sidebar Navigation Config ============
interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/lesson', label: '课程学习', icon: <BookMarked size={20} /> },
  { path: '/schedule', label: '课程表', icon: <Calendar size={20} /> },
  { path: '/dashboard', label: '学习概览', icon: <LayoutDashboard size={20} /> },
  { path: '/courses', label: '我的课程', icon: <BookOpen size={20} /> },
  { path: '/papers', label: '论文分析', icon: <FileText size={20} /> },
  { path: '/study', label: '学习计划', icon: <GraduationCap size={20} /> },
  { path: '/knowledge', label: '知识库', icon: <Brain size={20} /> },
  { path: '/teams', label: '学习小组', icon: <Users size={20} /> },
];

// ============ Layout Component ============
function Layout() {
  const { sidebarCollapsed, toggleSidebar, user } = useAppStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-warm-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-full bg-white shadow-sidebar border-r border-warm-200/50 z-30 transition-all duration-300 ${
          sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
        }`}
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-warm-200/50">
          <div className="w-9 h-9 bg-navy-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-navy-600 whitespace-nowrap animate-fadeIn">
              SmartLearner
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''} ${
                  sidebarCollapsed ? 'justify-center px-2' : ''
                }`
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-warm-200/50 p-3">
          {/* Collapse Toggle */}
          <button
            onClick={toggleSidebar}
            className="sidebar-item w-full justify-center"
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            {!sidebarCollapsed && <span>收起侧边栏</span>}
          </button>

          {/* User Info */}
          {!sidebarCollapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-lg bg-warm-50">
              <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center text-navy-600 text-sm font-medium">
                {user.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-800 truncate">{user.name}</p>
                <p className="text-xs text-warm-400 truncate">{user.student_id}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-sidebar bg-white shadow-sidebar z-50 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-warm-200/50">
          <div className="w-9 h-9 bg-navy-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-navy-600">SmartLearner</span>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-sidebar-collapsed' : 'lg:ml-sidebar'
        }`}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-warm-200/50 h-16 flex items-center px-6">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-warm-100 mr-3"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} className="text-warm-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-medium text-warm-500">
              {navItems.find((item) => location.pathname.startsWith(item.path))?.label || 'SmartLearner'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center text-navy-600 text-sm font-medium">
                  {user.name?.[0] || '?'}
                </div>
              </div>
            ) : (
              <NavLink to="/login" className="btn-outline text-sm py-1.5">
                登录
              </NavLink>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/papers" element={<Papers />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/study" element={<Study />} />
            <Route path="/study/plan/:id" element={<Study />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/lesson" element={<Lesson />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/" element={<Navigate to="/lesson" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// ============ App Component ============
export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<Layout />} />
      </Routes>
    </>
  );
}
