import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ 已连接到服务器\n');

  console.log('📤 发送消息...');
  socket.emit('message', 'Hello Server!');
});

socket.on('chunk', (data) => {
  process.stdout.write(data);
});

socket.on('done', () => {
  console.log('\n\n✅ 流式响应完成');
  socket.disconnect();
  process.exit(0);
});

socket.on('disconnect', () => {
  console.log('❌ 断开连接');
});
