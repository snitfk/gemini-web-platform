import { GeminiClient } from '@google/gemini-cli-core';
import { createConfig } from './test-config.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyCore() {
  console.log('🔍 验证 packages/core 在服务器环境运行...\n');

  try {
    // 1. 验证配置创建
    console.log('✓ 步骤 1: 创建配置对象...');
    const config = await createConfig();
    console.log('  ✅ 配置创建成功\n');

    // 2. 验证 GeminiClient 初始化
    console.log('✓ 步骤 2: 初始化 GeminiClient...');
    const client = new GeminiClient(config);
    await client.initialize();
    console.log('  ✅ GeminiClient 初始化成功\n');

    // 3. 验证简单对话
    console.log('✓ 步骤 3: 测试简单对话...');
    const testMessage = 'Hello! Please respond with "OK" if you can hear me.';

    let responseReceived = false;
    for await (const event of client.sendMessage(testMessage)) {
      if (event.type === 'content' && event.text) {
        console.log('  📝 收到响应:', event.text.substring(0, 50) + '...');
        responseReceived = true;
        break;
      }
    }

    if (!responseReceived) {
      throw new Error('未收到模型响应');
    }
    console.log('  ✅ 对话测试成功\n');

    // 4. 验证工具系统
    console.log('✓ 步骤 4: 验证工具系统...');
    const tools = config.getToolRegistry().getAllTools();
    console.log(`  📦 可用工具数量: ${tools.length}`);
    console.log(`  📦 工具列表: ${tools.map(t => t.name).join(', ')}`);
    console.log('  ✅ 工具系统正常\n');

    console.log('🎉 所有验证通过！packages/core 可在服务器环境正常运行。\n');

    return true;
  } catch (error) {
    console.error('❌ 验证失败:', error);
    return false;
  }
}

// 辅助函数：创建测试配置
async function createConfig() {
  const { Config } = await import('@google/gemini-cli-core');

  return new Config({
    apiKey: process.env.GEMINI_API_KEY,
    targetDir: process.cwd(),
    sessionId: 'test-session',
    // 其他必要配置...
  });
}

// 运行验证
verifyCore()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });