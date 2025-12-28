import { getWebSocketService, type ContainerStatsEvent } from './websocket.service.js';
import logger from '../utils/logger.js';

interface ContainerInfo {
  workspaceId: string;
  containerId: string;
}

/**
 * Container monitoring service
 * Periodically collects container stats and broadcasts via WebSocket
 */
export class ContainerMonitorService {
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private static instance: ContainerMonitorService | null = null;
  private monitorInterval = 5000; // 5 seconds

  constructor() {
    ContainerMonitorService.instance = this;
  }

  static getInstance(): ContainerMonitorService {
    if (!ContainerMonitorService.instance) {
      ContainerMonitorService.instance = new ContainerMonitorService();
    }
    return ContainerMonitorService.instance;
  }

  /**
   * Start monitoring a container
   */
  startMonitoring(container: ContainerInfo): void {
    const key = `${container.workspaceId}:${container.containerId}`;

    if (this.monitoringIntervals.has(key)) {
      logger.debug(`Already monitoring container: ${key}`);
      return;
    }

    logger.info(`Starting container monitoring: ${key}`);

    const interval = setInterval(async () => {
      await this.collectAndBroadcastStats(container);
    }, this.monitorInterval);

    this.monitoringIntervals.set(key, interval);

    // Collect initial stats immediately
    this.collectAndBroadcastStats(container);
  }

  /**
   * Stop monitoring a container
   */
  stopMonitoring(container: ContainerInfo): void {
    const key = `${container.workspaceId}:${container.containerId}`;
    const interval = this.monitoringIntervals.get(key);

    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(key);
      logger.info(`Stopped container monitoring: ${key}`);
    }
  }

  /**
   * Stop all monitoring
   */
  stopAll(): void {
    this.monitoringIntervals.forEach((interval, key) => {
      clearInterval(interval);
      logger.debug(`Stopped monitoring: ${key}`);
    });
    this.monitoringIntervals.clear();
    logger.info('All container monitoring stopped');
  }

  /**
   * Collect stats and broadcast via WebSocket
   */
  private async collectAndBroadcastStats(container: ContainerInfo): Promise<void> {
    try {
      // In a real implementation, this would query Docker stats API
      // For now, we generate mock stats
      const stats = await this.getContainerStats(container.containerId);

      const wsService = getWebSocketService();
      if (wsService) {
        const event: ContainerStatsEvent = {
          workspaceId: container.workspaceId,
          containerId: container.containerId,
          stats: {
            cpuPercent: stats.cpuPercent,
            memoryUsage: stats.memoryUsage,
            memoryLimit: stats.memoryLimit,
            memoryPercent: stats.memoryPercent,
            networkRx: stats.networkRx,
            networkTx: stats.networkTx,
            timestamp: new Date().toISOString(),
          },
        };

        wsService.sendContainerStats(container.workspaceId, event);
      }
    } catch (error) {
      logger.error(`Failed to collect container stats: ${container.containerId}`, error);
    }
  }

  /**
   * Get container stats (mock implementation)
   * In production, this would use Docker API
   */
  private async getContainerStats(_containerId: string): Promise<{
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    networkRx: number;
    networkTx: number;
  }> {
    // Mock stats - in production this would call Docker API
    return {
      cpuPercent: Math.random() * 100,
      memoryUsage: Math.floor(Math.random() * 512 * 1024 * 1024), // 0-512MB
      memoryLimit: 1024 * 1024 * 1024, // 1GB
      memoryPercent: Math.random() * 50,
      networkRx: Math.floor(Math.random() * 1000000),
      networkTx: Math.floor(Math.random() * 500000),
    };
  }

  /**
   * Check if container is being monitored
   */
  isMonitoring(container: ContainerInfo): boolean {
    const key = `${container.workspaceId}:${container.containerId}`;
    return this.monitoringIntervals.has(key);
  }

  /**
   * Get count of monitored containers
   */
  getMonitoredCount(): number {
    return this.monitoringIntervals.size;
  }
}

// Export singleton getter
export function getContainerMonitor(): ContainerMonitorService {
  return ContainerMonitorService.getInstance();
}
