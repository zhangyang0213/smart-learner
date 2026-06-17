import { create } from 'zustand';
import type { ChatMessage, UserProfile } from '@/types';

interface AppState {
  // User state
  user: UserProfile | null;
  isAuthenticated: boolean;

  // Navigation state
  currentPage: string;

  // Chat state
  chatMessages: Record<string, ChatMessage[]>;

  // UI state
  sidebarCollapsed: boolean;

  // Actions
  setUser: (user: UserProfile) => void;
  clearUser: () => void;
  setCurrentPage: (page: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  setMessages: (sessionId: string, messages: ChatMessage[]) => void;
  clearMessages: (sessionId: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  currentPage: 'dashboard',
  chatMessages: {},
  sidebarCollapsed: false,

  // Actions
  setUser: (user) =>
    set({ user, isAuthenticated: true }),

  clearUser: () =>
    set({ user: null, isAuthenticated: false, chatMessages: {} }),

  setCurrentPage: (page) =>
    set({ currentPage: page }),

  addMessage: (sessionId, message) =>
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [sessionId]: [...(state.chatMessages[sessionId] || []), message],
      },
    })),

  setMessages: (sessionId, messages) =>
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [sessionId]: messages,
      },
    })),

  clearMessages: (sessionId) =>
    set((state) => {
      const newMessages = { ...state.chatMessages };
      delete newMessages[sessionId];
      return { chatMessages: newMessages };
    }),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
