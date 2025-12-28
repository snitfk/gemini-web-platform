import { useEditorStore, type FileTab } from '@/stores/editor.store';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FileTabs() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useEditorStore();

  if (tabs.length === 0) {
    return null;
  }

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  return (
    <div className="h-9 border-b bg-muted/40 flex items-center overflow-x-auto">
      {tabs.map((tab) => (
        <FileTabItem
          key={tab.id}
          tab={tab}
          isActive={activeTabId === tab.id}
          onClick={() => handleTabClick(tab.id)}
          onClose={(e) => handleCloseTab(e, tab.id)}
        />
      ))}
    </div>
  );
}

interface FileTabItemProps {
  tab: FileTab;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

function FileTabItem({ tab, isActive, onClick, onClose }: FileTabItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 h-full border-r cursor-pointer text-sm transition-colors',
        isActive
          ? 'bg-background text-foreground'
          : 'hover:bg-accent/50 text-muted-foreground'
      )}
      onClick={onClick}
    >
      <span className="max-w-32 truncate">{tab.name}</span>
      {tab.isDirty && (
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
      )}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-4 w-4 p-0 shrink-0 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        onClick={onClose}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
