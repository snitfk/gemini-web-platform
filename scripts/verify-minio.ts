import { Readable } from 'stream';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

async function verifyMinIO() {
  console.log('🔍 验证 MinIO 文件存储...\n');

  const s3Client = new S3Client({
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    },
    forcePathStyle: true,
  });

  const bucketName = 'test-workspace';
  const testFile = 'test.txt';
  const testContent = 'Hello from MinIO!';

  try {
    // 1. 上传文件
    console.log('✓ 步骤 1: 上传文件...');
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: testFile,
        Body: testContent,
      })
    );
    console.log(`  ✅ 文件上传成功: ${testFile}\n`);

    // 2. 下载文件
    console.log('✓ 步骤 2: 下载文件...');
    const getResult = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: testFile,
      })
    );

    const content = await streamToString(getResult.Body as Readable);
    console.log(`  内容: ${content}`);
    console.log('  ✅ 文件下载成功\n');

    // 3. 列出文件
    console.log('✓ 步骤 3: 列出文件...');
    const listResult = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
      })
    );

    console.log(`  文件数量: ${listResult.Contents?.length || 0}`);
    listResult.Contents?.forEach((obj) => {
      console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
    });
    console.log('  ✅ 文件列表获取成功\n');

    console.log('🎉 MinIO 验证通过！\n');

    return true;
  } catch (error) {
    console.error('❌ MinIO 验证失败:', error);
    return false;
  }
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

verifyMinIO();
