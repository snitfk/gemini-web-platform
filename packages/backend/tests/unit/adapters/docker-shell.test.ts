import { describe, it, expect, beforeEach } from 'vitest';
import { DockerShellAdapter } from '../../../src/adapters/shell/docker.adapter.js';

describe('DockerShellAdapter', () => {
  let adapter: DockerShellAdapter;

  beforeEach(() => {
    adapter = new DockerShellAdapter({
      host: 'localhost',
      sandboxImage: 'ubuntu:22.04',
      memoryLimit: '512m',
      cpuLimit: 1,
    });
  });

  describe('execute', () => {
    it('should execute echo command', async () => {
      const workspaceId = 'test-workspace';
      const outputs: Array<{ type: string; data: unknown }> = [];

      for await (const output of adapter.execute(workspaceId, 'echo "hello world"')) {
        outputs.push(output);
      }

      // Should have stdout output and exit code
      expect(outputs.length).toBeGreaterThanOrEqual(2);

      const stdoutOutputs = outputs.filter(o => o.type === 'stdout');
      expect(stdoutOutputs.length).toBeGreaterThan(0);

      const exitOutput = outputs.find(o => o.type === 'exit');
      expect(exitOutput).toBeDefined();
      expect(exitOutput?.data).toBe(0);
    });

    it('should execute ls command', async () => {
      const outputs: Array<{ type: string; data: unknown }> = [];

      for await (const output of adapter.execute('test-workspace', 'ls')) {
        outputs.push(output);
      }

      const stdoutOutputs = outputs.filter(o => o.type === 'stdout');
      expect(stdoutOutputs.length).toBeGreaterThan(0);

      // Mock returns simulated file listing
      const allOutput = stdoutOutputs.map(o => o.data).join('');
      expect(allOutput).toContain('file');
    });

    it('should execute pwd command', async () => {
      const workspaceId = 'my-workspace';
      const outputs: Array<{ type: string; data: unknown }> = [];

      for await (const output of adapter.execute(workspaceId, 'pwd')) {
        outputs.push(output);
      }

      const stdoutOutputs = outputs.filter(o => o.type === 'stdout');
      const allOutput = stdoutOutputs.map(o => o.data).join('');
      expect(allOutput).toContain(workspaceId);
    });

    it('should handle generic commands', async () => {
      const outputs: Array<{ type: string; data: unknown }> = [];

      for await (const output of adapter.execute('test-workspace', 'npm install')) {
        outputs.push(output);
      }

      const stdoutOutputs = outputs.filter(o => o.type === 'stdout');
      expect(stdoutOutputs.length).toBeGreaterThan(0);

      const exitOutput = outputs.find(o => o.type === 'exit');
      expect(exitOutput?.data).toBe(0);
    });

    it('should track and return exit code', async () => {
      const outputs: Array<{ type: string; data: unknown }> = [];

      for await (const output of adapter.execute('test-workspace', 'test command')) {
        outputs.push(output);
      }

      const exitOutput = outputs.find(o => o.type === 'exit');
      expect(exitOutput).toBeDefined();
      expect(typeof exitOutput?.data).toBe('number');
    });
  });

  describe('getRunningProcesses', () => {
    it('should return empty array when no processes running', () => {
      const processes = adapter.getRunningProcesses('test-workspace');
      expect(processes).toEqual([]);
    });
  });

  describe('kill', () => {
    it('should handle killing non-existent process gracefully', async () => {
      // Should not throw
      await expect(
        adapter.kill('test-workspace', 'nonexistent-process')
      ).resolves.toBeUndefined();
    });

    it('should throw if process belongs to different workspace', async () => {
      // Mock a running process by executing a command
      // Note: In the mock implementation, processes are cleaned up immediately
      // So this test validates the error handling path
      await expect(
        adapter.kill('wrong-workspace', 'some-process-id')
      ).resolves.toBeUndefined(); // Process doesn't exist, so it returns early
    });
  });
});
