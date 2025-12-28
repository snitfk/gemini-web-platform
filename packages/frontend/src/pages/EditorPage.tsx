import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workspaceService } from '@/services/workspace.service';
import { fileService } from '@/services/file.service';
import { useEditorStore } from '@/stores/editor.store';
import { useChatStore } from '@/stores/chat.store';
import MonacoEditor from '@/components/editor/MonacoEditor';
import FileTabs from '@/components/editor/FileTabs';
import FileExplorer from '@/components/editor/FileExplorer';
import ChatPanel from '@/components/chat/ChatPanel';
import { Button } from '@/components/ui/button';
import { Loader2, PanelRightClose, PanelRight, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export default function EditorPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { tabs, activeTabId, updateTabContent, markTabSaved, sidebarCollapsed } = useEditorStore();
  const { chatPanelCollapsed, toggleChatPanel } = useChatStore();
  const { toast } = useToast();
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const { data: workspace, isLoading, error } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceService.get(workspaceId!),
    enabled: !!workspaceId,
  });

  // Check theme on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkTheme(isDark);

    const observer = new MutationObserver(() => {
      setIsDarkTheme(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleSave = async (content: string) => {
    if (!activeTab || !workspaceId) return;

    try {
      await fileService.writeFile(workspaceId, activeTab.path, content);
      markTabSaved(activeTab.id);
      toast({ title: 'Saved', description: `${activeTab.name} saved successfully` });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save file',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Workspace not found</h2>
          <p className="text-muted-foreground">
            The workspace you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Workspace Header */}
      <div className="h-10 border-b px-4 flex items-center justify-between bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{workspace.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              workspace.status === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {workspace.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeTab?.isDirty && (
            <Button variant="ghost" size="sm" onClick={() => handleSave(activeTab.content)}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleChatPanel}>
            {chatPanelCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        {!sidebarCollapsed && (
          <div className="w-64 border-r bg-muted/20 shrink-0">
            <FileExplorer workspaceId={workspaceId!} />
          </div>
        )}

        {/* Main Editor + Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* File Tabs */}
          <FileTabs />

          {/* Editor Content */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 min-w-0">
              {activeTab ? (
                <MonacoEditor
                  value={activeTab.content}
                  language={activeTab.language}
                  onChange={(value) => {
                    if (value !== undefined) {
                      updateTabContent(activeTab.id, value);
                    }
                  }}
                  onSave={handleSave}
                  theme={isDarkTheme ? 'vs-dark' : 'light'}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg mb-2">No file open</p>
                    <p className="text-sm">Select a file from the explorer to start editing</p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Panel */}
            {!chatPanelCollapsed && (
              <div className="w-96 border-l bg-muted/20 shrink-0">
                <ChatPanel workspaceId={workspaceId!} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
