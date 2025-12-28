import { getWebSocketService } from './websocket.service.js';
import logger from '../utils/logger.js';

interface TerminalSession {
  id: string;
  workspaceId: string;
  userId: string;
  containerId?: string;
  createdAt: Date;
  lastActivityAt: Date;
  rows: number;
  cols: number;
}

interface TerminalOutput {
  sessionId: string;
  data: string;
  timestamp: string;
}

/**
 * Terminal service for managing PTY sessions
 * In production, this would integrate with node-pty or Docker exec
 */
export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private static instance: TerminalService | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    TerminalService.instance = this;
    this.startCleanupInterval();
  }

  static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  /**
   * Create a new terminal session
   */
  createSession(
    workspaceId: string,
    userId: string,
    options: { rows?: number; cols?: number; containerId?: string } = {}
  ): TerminalSession {
    const sessionId = `term-${workspaceId}-${Date.now()}`;
    const session: TerminalSession = {
      id: sessionId,
      workspaceId,
      userId,
      containerId: options.containerId,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      rows: options.rows || 24,
      cols: options.cols || 80,
    };

    this.sessions.set(sessionId, session);
    logger.info(`Terminal session created: ${sessionId}`);

    // Send initial prompt
    this.sendOutput(sessionId, '\x1b[32m✓ Terminal session started\x1b[0m\r\n');
    this.sendPrompt(sessionId);

    return session;
  }

  /**
   * Handle terminal input
   */
  handleInput(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Terminal session not found: ${sessionId}`);
      return;
    }

    session.lastActivityAt = new Date();

    // In production, this would send to PTY or Docker exec
    // For now, simulate basic shell behavior
    this.processCommand(sessionId, data);
  }

  /**
   * Resize terminal
   */
  resize(sessionId: string, rows: number, cols: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.rows = rows;
    session.cols = cols;
    session.lastActivityAt = new Date();

    logger.debug(`Terminal resized: ${sessionId} (${cols}x${rows})`);
  }

  /**
   * Close terminal session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.delete(sessionId);
    logger.info(`Terminal session closed: ${sessionId}`);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a workspace
   */
  getWorkspaceSessions(workspaceId: string): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.workspaceId === workspaceId
    );
  }

  /**
   * Send output to terminal
   */
  private sendOutput(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const wsService = getWebSocketService();
    if (wsService) {
      wsService.sendToUser(session.userId, 'terminal:output', {
        sessionId,
        data,
        timestamp: new Date().toISOString(),
      } as TerminalOutput);
    }
  }

  /**
   * Send prompt to terminal
   */
  private sendPrompt(sessionId: string): void {
    this.sendOutput(
      sessionId,
      '\x1b[1;34mworkspace@gemini\x1b[0m:\x1b[1;36m~\x1b[0m$ '
    );
  }

  /**
   * Process command (simulation for demo)
   * In production, this would execute via PTY or Docker
   */
  private processCommand(sessionId: string, input: string): void {
    // Handle special characters
    if (input === '\r' || input === '\n') {
      this.sendOutput(sessionId, '\r\n');
      this.sendPrompt(sessionId);
      return;
    }

    if (input === '\x03') {
      // Ctrl+C
      this.sendOutput(sessionId, '^C\r\n');
      this.sendPrompt(sessionId);
      return;
    }

    if (input === '\x7f') {
      // Backspace
      this.sendOutput(sessionId, '\b \b');
      return;
    }

    // Echo the input
    this.sendOutput(sessionId, input);
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivityAt.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} inactive terminal sessions`);
    }
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Cleanup all sessions
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
    logger.info('Terminal service cleaned up');
  }
}

// Export singleton getter
export function getTerminalService(): TerminalService {
  return TerminalService.getInstance();
}
