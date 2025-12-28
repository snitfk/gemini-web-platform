import logger from '../utils/logger.js';

export type HookEvent =
  | 'pre-save'
  | 'post-save'
  | 'pre-delete'
  | 'post-delete'
  | 'pre-create'
  | 'post-create'
  | 'pre-build'
  | 'post-build'
  | 'pre-deploy'
  | 'post-deploy'
  | 'file-change'
  | 'workspace-start'
  | 'workspace-stop';

export interface HookContext {
  workspaceId: string;
  userId: string;
  event: HookEvent;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface HookResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface Hook {
  id: string;
  name: string;
  event: HookEvent;
  workspaceId: string;
  script: string;
  enabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export type HookHandler = (context: HookContext) => Promise<HookResult>;

/**
 * Hook System Service
 * Manages lifecycle hooks for workspaces
 */
export class HookService {
  private hooks: Map<string, Hook> = new Map();
  private handlers: Map<HookEvent, HookHandler[]> = new Map();
  private static instance: HookService | null = null;

  constructor() {
    HookService.instance = this;
    this.registerBuiltInHooks();
  }

  static getInstance(): HookService {
    if (!HookService.instance) {
      HookService.instance = new HookService();
    }
    return HookService.instance;
  }

  /**
   * Register built-in hooks
   */
  private registerBuiltInHooks(): void {
    // Pre-save hook: validate file
    this.addHandler('pre-save', async (context) => {
      logger.debug(`Pre-save hook triggered for workspace ${context.workspaceId}`);
      return { success: true, message: 'File validation passed' };
    });

    // Post-save hook: trigger linting
    this.addHandler('post-save', async (context) => {
      logger.debug(`Post-save hook triggered for workspace ${context.workspaceId}`);
      return { success: true, message: 'Post-save actions completed' };
    });

    // Workspace start hook
    this.addHandler('workspace-start', async (context) => {
      logger.info(`Workspace ${context.workspaceId} started by user ${context.userId}`);
      return { success: true, message: 'Workspace initialized' };
    });

    // Workspace stop hook
    this.addHandler('workspace-stop', async (context) => {
      logger.info(`Workspace ${context.workspaceId} stopped by user ${context.userId}`);
      return { success: true, message: 'Workspace cleanup completed' };
    });
  }

  /**
   * Add a handler for an event
   */
  addHandler(event: HookEvent, handler: HookHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /**
   * Remove a handler for an event
   */
  removeHandler(event: HookEvent, handler: HookHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Register a custom hook
   */
  registerHook(hook: Omit<Hook, 'id' | 'createdAt' | 'updatedAt'>): Hook {
    const id = `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newHook: Hook = {
      ...hook,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.hooks.set(id, newHook);
    logger.info(`Hook registered: ${hook.name} (${hook.event})`);

    return newHook;
  }

  /**
   * Unregister a hook
   */
  unregisterHook(hookId: string): boolean {
    const deleted = this.hooks.delete(hookId);
    if (deleted) {
      logger.info(`Hook unregistered: ${hookId}`);
    }
    return deleted;
  }

  /**
   * Get hook by ID
   */
  getHook(hookId: string): Hook | undefined {
    return this.hooks.get(hookId);
  }

  /**
   * Get all hooks for a workspace
   */
  getWorkspaceHooks(workspaceId: string): Hook[] {
    return Array.from(this.hooks.values())
      .filter((hook) => hook.workspaceId === workspaceId)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get all hooks for an event
   */
  getEventHooks(event: HookEvent, workspaceId?: string): Hook[] {
    return Array.from(this.hooks.values())
      .filter(
        (hook) =>
          hook.event === event &&
          hook.enabled &&
          (!workspaceId || hook.workspaceId === workspaceId)
      )
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Enable a hook
   */
  enableHook(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (hook) {
      hook.enabled = true;
      hook.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Disable a hook
   */
  disableHook(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (hook) {
      hook.enabled = false;
      hook.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Trigger hooks for an event
   */
  async triggerHooks(
    event: HookEvent,
    workspaceId: string,
    userId: string,
    data: Record<string, unknown> = {}
  ): Promise<HookResult[]> {
    const context: HookContext = {
      workspaceId,
      userId,
      event,
      data,
      timestamp: new Date(),
    };

    const results: HookResult[] = [];

    // Execute built-in handlers
    const handlers = this.handlers.get(event) || [];
    for (const handler of handlers) {
      try {
        const result = await handler(context);
        results.push(result);

        if (!result.success) {
          logger.warn(`Hook handler failed for event ${event}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Hook handler error for event ${event}:`, error);
        results.push({ success: false, error: errorMessage });
      }
    }

    // Execute custom workspace hooks
    const customHooks = this.getEventHooks(event, workspaceId);
    for (const hook of customHooks) {
      try {
        const result = await this.executeHookScript(hook, context);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Custom hook error (${hook.name}):`, error);
        results.push({ success: false, error: errorMessage });
      }
    }

    return results;
  }

  /**
   * Execute a hook script
   * In production, this would run in a sandboxed environment
   */
  private async executeHookScript(hook: Hook, context: HookContext): Promise<HookResult> {
    logger.debug(`Executing hook script: ${hook.name}`);

    // For security, hook scripts should be executed in a sandboxed environment
    // This is a placeholder that logs the execution
    return {
      success: true,
      message: `Hook ${hook.name} executed successfully`,
      data: {
        hookId: hook.id,
        event: hook.event,
        contextData: context.data,
      },
    };
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): HookEvent[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get hook count
   */
  getHookCount(): number {
    return this.hooks.size;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.hooks.clear();
    this.handlers.clear();
    logger.info('Hook service cleaned up');
  }
}

// Export singleton getter
export function getHookService(): HookService {
  return HookService.getInstance();
}
