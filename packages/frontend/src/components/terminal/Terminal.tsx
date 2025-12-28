import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { wsClient } from '@/lib/websocket/client';
import { useWebSocketStore } from '@/stores/websocket.store';
import { Button } from '@/components/ui/button';
import { Terminal as TerminalIcon, X, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TerminalProps {
  workspaceId: string;
  sessionId?: string;
  className?: string;
  onClose?: () => void;
}

export default function Terminal({
  workspaceId,
  sessionId: initialSessionId,
  className,
  onClose,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { isConnected: wsConnected } = useWebSocketStore();

  // Initialize xterm
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: '#0D1117',
        foreground: '#C9D1D9',
        cursor: '#58A6FF',
        cursorAccent: '#0D1117',
        selectionBackground: '#264F78',
        black: '#484F58',
        red: '#FF7B72',
        green: '#3FB950',
        yellow: '#D29922',
        blue: '#58A6FF',
        magenta: '#BC8CFF',
        cyan: '#39C5CF',
        white: '#B1BAC4',
        brightBlack: '#6E7681',
        brightRed: '#FFA198',
        brightGreen: '#56D364',
        brightYellow: '#E3B341',
        brightBlue: '#79C0FF',
        brightMagenta: '#D2A8FF',
        brightCyan: '#56D4DD',
        brightWhite: '#F0F6FC',
      },
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    // Initial fit
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[1;36m╔════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║  Gemini Web Platform Terminal          ║\x1b[0m');
    term.writeln('\x1b[1;36m╚════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln(`\x1b[33mConnecting to workspace: ${workspaceId}...\x1b[0m`);

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [workspaceId]);

  // Handle WebSocket terminal events
  useEffect(() => {
    if (!xtermRef.current || !wsConnected) return;

    const term = xtermRef.current;

    // Create terminal session
    const createSession = () => {
      const newSessionId = `term-${Date.now()}`;
      setSessionId(newSessionId);
      wsClient.getSocketId(); // Ensure connected

      // Request terminal session from server
      // In a real implementation, this would create a PTY session
      term.writeln('\x1b[32m✓ Connected to workspace\x1b[0m');
      term.writeln('');
      term.write('\x1b[1;34mworkspace@gemini\x1b[0m:\x1b[1;36m~\x1b[0m$ ');
      setIsConnected(true);
    };

    if (!sessionId) {
      createSession();
    }

    // Handle user input
    const handleData = (data: string) => {
      // Echo input (for demo - in real impl, send to PTY)
      if (data === '\r') {
        term.writeln('');
        term.write('\x1b[1;34mworkspace@gemini\x1b[0m:\x1b[1;36m~\x1b[0m$ ');
      } else if (data === '\x7f') {
        // Backspace
        term.write('\b \b');
      } else {
        term.write(data);
      }

      // In real implementation:
      // wsClient.emit('terminal:input', { sessionId, data });
    };

    const disposable = term.onData(handleData);

    return () => {
      disposable.dispose();
    };
  }, [wsConnected, sessionId]);

  // Fit terminal when maximized state changes
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isMaximized]);

  const handleClear = useCallback(() => {
    xtermRef.current?.clear();
  }, []);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0D1117] border border-border rounded-lg overflow-hidden',
        isMaximized && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Terminal toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161B22] border-b border-border">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Terminal</span>
          {isConnected && (
            <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
              Connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClear}
            title="Clear terminal"
          >
            <Plus className="h-3 w-3 rotate-45" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={toggleMaximize}
            title={isMaximized ? 'Minimize' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
              title="Close terminal"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2"
        style={{ minHeight: isMaximized ? 'calc(100% - 40px)' : '300px' }}
      />
    </div>
  );
}
