import path from 'path';
import { fileURLToPath } from 'url';

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testGeminiAPI() {
  console.log('🔍 测试 Gemini API 功能...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GEMINI_BASE_URL || 'https://gemini.haotunet.com';
  console.log('  Base URL:', baseUrl);
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 未设置');
  }

  const genai = new GoogleGenerativeAI(apiKey);

  // 测试 1: 基础对话
  console.log('✓ 测试 1: 基础对话');
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const result = await model.generateContent('Say "Hello World"');
  console.log('  响应:', result.response.text());
  console.log('  ✅ 基础对话成功\n');

  // 测试 2: 流式响应
  console.log('✓ 测试 2: 流式响应');
  const streamResult = await model.generateContentStream('Count from 1 to 5');
  for await (const chunk of streamResult.stream) {
    const text = chunk.text();
    if (text) {
      process.stdout.write(text);
    }
  }
  console.log('\n  ✅ 流式响应成功\n');

  // 测试 3: 函数调用
  console.log('✓ 测试 3: 函数调用');
  const functionModel = genai.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    tools: [
      {
        functionDeclarations: [
          {
            name: 'test_function',
            description: 'A test function',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                message: { type: SchemaType.STRING },
              },
              required: ['message'],
            },
          },
        ],
      },
    ],
  });

  const functionResult = await functionModel.generateContent(
    'Call test_function with message "Hello"'
  );

  const call = functionResult.response.functionCalls?.()?.[0];
  console.log('  函数调用:', call?.name, call?.args);
  console.log('  ✅ 函数调用成功\n');

  // 测试 4: Token 计数
  console.log('✓ 测试 4: Token 计数');
  const tokenResult = await model.countTokens('This is a test message');
  console.log('  Token 数量:', tokenResult.totalTokens);
  console.log('  ✅ Token 计数成功\n');

  console.log('🎉 所有 Gemini API 测试通过！\n');
}

testGeminiAPI().catch(console.error);
