import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workspaceService } from '@/services/workspace.service';
import { useEditorStore } from '@/stores/editor.store';
import { Loader2 } from 'lucide-react';

export default function EditorPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { tabs, activeTabId } = useEditorStore();

  const { data: workspace, isLoading, error } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceService.get(workspaceId!),
    enabled: !!workspaceId,
  });

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

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-full flex flex-col">
      {/* Workspace Header */}
      <div className="h-10 border-b px-4 flex items-center justify-between bg-muted/40">
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
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex">
        {/* File Explorer */}
        <div className="w-64 border-r bg-muted/20">
          <div className="p-2 border-b">
            <span className="text-xs font-medium uppercase text-muted-foreground">Explorer</span>
          </div>
          <div className="p-2 text-sm text-muted-foreground">
            File explorer coming soon...
          </div>
        </div>

        {/* Main Editor + Chat */}
        <div className="flex-1 flex flex-col">
          {/* File Tabs */}
          {tabs.length > 0 ? (
            <div className="h-9 border-b flex items-center bg-muted/40 overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center gap-2 px-3 h-full border-r cursor-pointer text-sm ${
                    activeTabId === tab.id
                      ? 'bg-background'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => useEditorStore.getState().setActiveTab(tab.id)}
                >
                  <span>{tab.name}</span>
                  {tab.isDirty && <span className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              ))}
            </div>
          ) : null}

          {/* Editor Content */}
          <div className="flex-1 flex">
            <div className="flex-1 flex items-center justify-center">
              {activeTab ? (
                <div className="p-4 text-sm font-mono whitespace-pre-wrap">
                  {activeTab.content}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-2">No file open</p>
                  <p className="text-sm">Select a file from the explorer to start editing</p>
                </div>
              )}
            </div>

            {/* Chat Panel Placeholder */}
            <div className="w-96 border-l bg-muted/20 flex flex-col">
              <div className="p-3 border-b">
                <span className="text-sm font-medium">AI Assistant</span>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground text-center">
                Chat with AI coming soon...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
