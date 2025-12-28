import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fileService, type FileInfo } from '@/services/file.service';
import { useEditorStore } from '@/stores/editor.store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, File, Folder, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { cn, getLanguageFromPath } from '@/lib/utils';

interface FileExplorerProps {
  workspaceId: string;
}

export default function FileExplorer({ workspaceId }: FileExplorerProps) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['files', workspaceId],
    queryFn: () => fileService.listFiles(workspaceId),
  });

  const files = data?.files || [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn('h-3 w-3', isRefetching && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No files yet
          </div>
        ) : (
          <div className="p-2">
            {files.map((file) => (
              <FileItem key={file.path} file={file} workspaceId={workspaceId} level={0} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface FileItemProps {
  file: FileInfo;
  workspaceId: string;
  level: number;
}

function FileItem({ file, workspaceId, level }: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addTab } = useEditorStore();

  // For now, we treat everything as a file (no directory support yet)
  const isDirectory = false;

  const handleClick = useCallback(async () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      setIsLoading(true);
      try {
        const { content } = await fileService.readFile(workspaceId, file.path);
        const language = getLanguageFromPath(file.path);

        addTab({
          id: file.path,
          path: file.path,
          name: file.name,
          content,
          language,
        });
      } catch (error) {
        console.error('Failed to read file:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isDirectory, isExpanded, workspaceId, file, addTab]);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded hover:bg-accent cursor-pointer text-sm',
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            <span className="w-4 h-4 shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            <Folder className="h-4 w-4 text-blue-500 shrink-0" />
          </>
        ) : (
          <>
            <span className="w-4 h-4 shrink-0" />
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <File className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </>
        )}
        <span className="truncate">{file.name}</span>
      </div>
    </div>
  );
}
