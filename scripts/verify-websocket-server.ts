import { createServer } from 'http';
import { setInterval, clearInterval } from 'timers';

import { Server as SocketIOServer } from 'socket.io';

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('✅ 客户端已连接:', socket.id);

  socket.on('message', (data) => {
    console.log('📨 收到消息:', data);

    // 模拟流式响应
    const response = 'This is a streaming response...';
    let index = 0;

    const interval = setInterval(() => {
      if (index < response.length) {
        socket.emit('chunk', response[index]);
        index++;
      } else {
        clearInterval(interval);
        socket.emit('done');
      }
    }, 100);
  });

  socket.on('disconnect', () => {
    console.log('❌ 客户端断开:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket 服务器运行在 http://localhost:${PORT}`);
  console.log('等待客户端连接...\n');
});
