import { useEffect } from 'react';
import { useWebSocket, useWebSocketEvent } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { status } = useWebSocket();
  const { toast } = useToast();

  // Handle user join/leave events (log for debugging)
  useWebSocketEvent('user:joined', (data) => {
    console.log('User joined:', data);
  });

  useWebSocketEvent('user:left', (data) => {
    console.log('User left:', data);
  });

  // Handle connection status changes
  useEffect(() => {
    if (status === 'error') {
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to real-time server. Some features may be unavailable.',
        variant: 'destructive',
      });
    } else if (status === 'connected') {
      console.log('WebSocket connected');
    }
  }, [status, toast]);

  return <>{children}</>;
}

export default WebSocketProvider;
