import Docker from 'dockerode';

async function verifyDocker() {
  console.log('🔍 验证 Docker 容器隔离方案...\n');

  const docker = new Docker();

  try {
    // 1. 检查 Docker 连接
    console.log('✓ 步骤 1: 检查 Docker 连接...');
    const info = await docker.info();
    console.log(`  Docker 版本: ${info.ServerVersion}`);
    console.log(`  ✅ Docker 连接成功\n`);

    // 2. 创建测试容器
    console.log('✓ 步骤 2: 创建测试容器...');
    const container = await docker.createContainer({
      Image: 'node:20-alpine',
      Cmd: ['node', '-e', 'console.log("Hello from container")'],
      name: 'test-sandbox',
      HostConfig: {
        Memory: 256 * 1024 * 1024, // 256MB
        NanoCpus: 500000000, // 0.5 CPU
        NetworkMode: 'none', // 网络隔离
      },
    });
    console.log(`  容器 ID: ${container.id}`);
    console.log('  ✅ 容器创建成功\n');

    // 3. 启动容器
    console.log('✓ 步骤 3: 启动容器...');
    await container.start();
    console.log('  ✅ 容器启动成功\n');

    // 4. 执行命令
    console.log('✓ 步骤 4: 在容器中执行命令...');
    const exec = await container.exec({
      Cmd: ['echo', 'Hello from exec'],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});
    stream.on('data', (chunk) => {
      console.log(`  输出: ${chunk.toString()}`);
    });

    await new Promise((resolve) => stream.on('end', resolve));
    console.log('  ✅ 命令执行成功\n');

    // 5. 获取容器状态
    console.log('✓ 步骤 5: 获取容器状态...');
    const stats = await container.stats({ stream: false });
    console.log(
      `  内存使用: ${(stats.memory_stats.usage / 1024 / 1024).toFixed(2)} MB`
    );
    console.log('  ✅ 状态获取成功\n');

    // 6. 清理
    console.log('✓ 步骤 6: 清理容器...');
    await container.stop();
    await container.remove();
    console.log('  ✅ 容器清理成功\n');

    console.log('🎉 Docker 隔离验证通过！\n');

    return true;
  } catch (error) {
    console.error('❌ Docker 验证失败:', error);
    return false;
  }
}

verifyDocker();
