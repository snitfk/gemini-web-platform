import { create } from 'zustand';

export interface FileTab {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

interface EditorState {
  tabs: FileTab[];
  activeTabId: string | null;
  sidebarWidth: number;
  sidebarCollapsed: boolean;

  // Tab operations
  addTab: (tab: Omit<FileTab, 'isDirty' | 'originalContent'>) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabSaved: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;

  // Sidebar operations
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [],
  activeTabId: null,
  sidebarWidth: 260,
  sidebarCollapsed: false,

  addTab: (tab) =>
    set((state) => {
      // Check if tab already exists
      const existing = state.tabs.find((t) => t.path === tab.path);
      if (existing) {
        return { activeTabId: existing.id };
      }

      const newTab: FileTab = {
        ...tab,
        originalContent: tab.content,
        isDirty: false,
      };

      return {
        tabs: [...state.tabs, newTab],
        activeTabId: tab.id,
      };
    }),

  removeTab: (tabId) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== tabId);
      let activeTabId = state.activeTabId;

      if (activeTabId === tabId) {
        // Find the closest tab to activate
        const currentIndex = state.tabs.findIndex((t) => t.id === tabId);
        if (tabs.length > 0) {
          activeTabId = tabs[Math.min(currentIndex, tabs.length - 1)]?.id || null;
        } else {
          activeTabId = null;
        }
      }

      return { tabs, activeTabId };
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTabContent: (tabId, content) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          content,
          isDirty: content !== tab.originalContent,
        };
      }),
    })),

  markTabSaved: (tabId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          originalContent: tab.content,
          isDirty: false,
        };
      }),
    })),

  closeAllTabs: () => set({ tabs: [], activeTabId: null }),

  closeOtherTabs: (tabId) =>
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id === tabId),
      activeTabId: tabId,
    })),

  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
