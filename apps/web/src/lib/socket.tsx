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
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedUrl, setAttemptedUrl] = useState('');
  const router = useRouter();

  const initSocket = (url: string) => {
    if (socket) socket.disconnect();
    
    console.log('🔌 Connecting to:', url);
    setAttemptedUrl(url);
    
    const socketInstance = io(url, {
      reconnectionAttempts: 5,
      timeout: 5000,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected!');
      setIsConnected(true);
      setError(null);
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
      setRoom(null);
    });

    setSocket(socketInstance);
    return socketInstance;
  };

  useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production';
    // Use 127.0.0.1 by default on local to avoid IPv6 localhost issues
    const defaultUrl = isProd 
      ? 'https://fumik-server.onrender.com' 
      : `http://127.0.0.1:8080`;
    
    initSocket(defaultUrl);

    return () => {
      socket?.disconnect();
    };
  }, []);

  const createRoom = (name: string, avatar: string) => socket?.emit('room:create', { name, avatar });
  const joinRoom = (code: string, name: string, avatar: string) => socket?.emit('room:join', { code, name, avatar });
  const updateProfile = (name: string, avatar: string) => room && socket?.emit('profile:update', { code: room.code, name, avatar });
  const setManualUrl = (url: string) => initSocket(url);

  return (
    <SocketContext.Provider value={{ socket, room, createRoom, joinRoom, updateProfile, error, isConnected, attemptedUrl, setManualUrl }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
