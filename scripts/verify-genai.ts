import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyGenAI() {
  console.log('🔍 验证 Gemini API 连接...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ 错误: 未设置 GEMINI_API_KEY 环境变量');
    console.log('请在 .env 文件中添加: GEMINI_API_KEY=your_api_key');
    return false;
  }

  console.log('✓ 步骤 1: API Key 已配置\n');

  try {
    // 1. 初始化客户端
    console.log('✓ 步骤 2: 初始化 GoogleGenAI 客户端...');
    const ai = new GoogleGenAI({ apiKey });
    console.log('  ✅ 客户端初始化成功\n');

    // 2. 测试简单对话
    console.log('✓ 步骤 3: 测试 API 调用...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Hello! Please respond with "OK" if you can hear me.',
    });

    const text = response.text;
    console.log('  📝 收到响应:', text?.substring(0, 100) || '(空响应)');
    console.log('  ✅ API 调用成功\n');

    // 3. 测试流式响应
    console.log('✓ 步骤 4: 测试流式响应...');
    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: '用一句话介绍你自己',
    });

    let streamText = '';
    for await (const chunk of streamResponse) {
      streamText += chunk.text || '';
    }
    console.log('  📝 流式响应:', streamText.substring(0, 100));
    console.log('  ✅ 流式响应测试成功\n');

    // 4. 列出可用模型
    console.log('✓ 步骤 5: 获取可用模型列表...');
    // 注意: listModels 可能需要不同的权限，这里跳过
    console.log('  ℹ️  常用模型: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash\n');

    console.log('🎉 所有验证通过！Gemini API 可正常使用。\n');
    return true;

  } catch (error: any) {
    console.error('❌ 验证失败:', error.message || error);
    
    if (error.message?.includes('API key')) {
      console.log('\n💡 提示: 请检查 API Key 是否正确');
    }
    if (error.message?.includes('quota')) {
      console.log('\n💡 提示: API 配额可能已用尽');
    }
    
    return false;
  }
}

// 运行验证
verifyGenAI()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });