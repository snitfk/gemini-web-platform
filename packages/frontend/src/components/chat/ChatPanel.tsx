import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, type Message } from '@/services/chat.service';
import { useChatStore } from '@/stores/chat.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Plus, Loader2, Bot, User, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ChatPanelProps {
  workspaceId: string;
}

export default function ChatPanel({ workspaceId }: ChatPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    activeSessionId,
    setActiveSession,
    messages,
    setMessages,
    addMessage,
    isStreaming,
    streamingContent,
    setStreaming,
    appendStreamContent,
    clearStreamContent,
  } = useChatStore();

  // Fetch sessions
  const { data: sessionsData } = useQuery({
    queryKey: ['chat-sessions', workspaceId],
    queryFn: () => chatService.listSessions(workspaceId),
  });

  const sessions = sessionsData?.sessions || [];

  // Fetch messages for active session
  const { data: sessionData, isLoading: loadingMessages } = useQuery({
    queryKey: ['chat-session', activeSessionId],
    queryFn: () => chatService.getSession(activeSessionId!),
    enabled: !!activeSessionId,
  });

  useEffect(() => {
    if (sessionData?.messages) {
      setMessages(sessionData.messages);
    }
  }, [sessionData, setMessages]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: () => chatService.createSession({ workspaceId }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', workspaceId] });
      setActiveSession(session.id);
      setMessages([]);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: chatService.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', workspaceId] });
      if (sessions.length > 1) {
        const remaining = sessions.filter((s) => s.id !== activeSessionId);
        setActiveSession(remaining[0]?.id || null);
      } else {
        setActiveSession(null);
        setMessages([]);
      }
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSendMessage = async () => {
    if (!input.trim() || !activeSessionId || isStreaming) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      chatSessionId: activeSessionId,
      role: 'user',
      content: userMessage,
      metadata: {},
      promptTokens: null,
      completionTokens: null,
      createdAt: new Date().toISOString(),
    };
    addMessage(tempUserMessage);

    setStreaming(true);
    clearStreamContent();

    try {
      await chatService.streamMessage(
        activeSessionId,
        { message: userMessage },
        (chunk) => {
          appendStreamContent(chunk);
        },
        (response) => {
          setStreaming(false);
          clearStreamContent();
          // Add the actual response message
          addMessage(response.response);
          // Invalidate to get updated data
          queryClient.invalidateQueries({ queryKey: ['chat-session', activeSessionId] });
        },
        (error) => {
          setStreaming(false);
          clearStreamContent();
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
      );
    } catch (error) {
      setStreaming(false);
      clearStreamContent();
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-medium">AI Assistant</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => createSessionMutation.mutate()}
            disabled={createSessionMutation.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {activeSessionId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => deleteSessionMutation.mutate(activeSessionId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length > 0 && (
        <>
          <div className="p-2 border-b">
            <select
              value={activeSessionId || ''}
              onChange={(e) => setActiveSession(e.target.value)}
              className="w-full text-sm bg-transparent border rounded px-2 py-1"
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title || 'New Chat'}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {!activeSessionId ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm mb-2">No chat session</p>
            <Button
              size="sm"
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start New Chat
            </Button>
          </div>
        ) : loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isStreaming && streamingContent && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  chatSessionId: activeSessionId,
                  role: 'assistant',
                  content: streamingContent,
                  metadata: {},
                  promptTokens: null,
                  completionTokens: null,
                  createdAt: new Date().toISOString(),
                }}
                isStreaming
              />
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      {activeSessionId && (
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isStreaming}
              className="text-sm"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : '')}>
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
