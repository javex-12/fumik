"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room } from '@fumik/shared/types';
import { useRouter } from 'next/navigation';

// --- ROBUST POLYFILLS ---
if (typeof window !== 'undefined') {
  (window as any).global = window;
  if (!(window as any).process) {
    (window as any).process = { env: { NODE_DEBUG: undefined }, nextTick: (cb: any) => setTimeout(cb, 0) };
  }
}

interface SocketContextType {
  socket: Socket | null;
  room: Room | null;
  userId: string | null;
  createRoom: (name: string, avatar: string) => void;
  joinRoom: (code: string, name: string, avatar: string) => void;
  updateProfile: (name: string, avatar: string) => void;
  error: string | null;
  isConnected: boolean;
  attemptedUrl: string;
  setManualUrl: (url: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedUrl, setAttemptedUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Persistent userId
    let savedId = localStorage.getItem('fumik_user_id');
    if (!savedId) {
      savedId = 'u_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('fumik_user_id', savedId);
    }
    setUserId(savedId);
  }, []);

  const initSocket = (url: string) => {
    if (socket) socket.disconnect();
    
    console.log('🔌 Connecting to:', url);
    setAttemptedUrl(url);
    
    const socketInstance = io(url, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected!');
      setIsConnected(true);
      setError(null);
      
      // If we were in a room, try to re-sync
      const path = window.location.pathname;
      const roomMatch = path.match(/\/lobby\/([A-Z0-9]+)/);
      if (roomMatch) {
        const code = roomMatch[1];
        const persistentId = localStorage.getItem('fumik_user_id');
        socketInstance.emit('room:get', { code, userId: persistentId });
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('❌ Error:', err.message);
      setIsConnected(false);
      setError(`Unreachable: ${url}`);
    });

    socketInstance.on('error', (errMsg: string) => {
      console.error('❌ Socket Error:', errMsg);
      setError(errMsg);
    });

    socketInstance.on('room:created', (newRoom: Room) => {
      setRoom(newRoom);
      router.push(`/lobby/${newRoom.code}`);
    });

    socketInstance.on('room:joined', (joinedRoom: Room) => {
      setRoom(joinedRoom);
      router.push(`/lobby/${joinedRoom.code}`);
    });

    socketInstance.on('room:update', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Keep-alive ping for slow/free servers (Render/Railway free)
    const pingInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('ping');
      }
    }, 30000);

    setSocket(socketInstance);
    return () => {
      clearInterval(pingInterval);
      socketInstance.disconnect();
    };
  };

  useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production';
    const defaultUrl = isProd 
      ? 'https://fumik-server.onrender.com' 
      : `http://127.0.0.1:8080`;
    
    initSocket(defaultUrl);

    return () => {
      socket?.disconnect();
    };
  }, []);

  const createRoom = (name: string, avatar: string) => socket?.emit('room:create', { name, avatar, userId });
  const joinRoom = (code: string, name: string, avatar: string) => socket?.emit('room:join', { code, name, avatar, userId });
  const updateProfile = (name: string, avatar: string) => room && socket?.emit('profile:update', { code: room.code, name, avatar });
  const setManualUrl = (url: string) => initSocket(url);

  return (
    <SocketContext.Provider value={{ socket, room, userId, createRoom, joinRoom, updateProfile, error, isConnected, attemptedUrl, setManualUrl }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
