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

  // Social Features
  onlineCount: number;
  onlineUsers: any[];
  friends: any[];
  friendRequests: any[];
  registerSocial: (username: string, avatar: string) => void;
  searchUsers: (query: string) => void;
  searchResults: any[];
  sendFriendRequest: (toUserId: string) => void;
  acceptFriendRequest: (fromUserId: string) => void;
  declineFriendRequest: (fromUserId: string) => void;
  sendInvite: (toUserId: string, fromName: string) => void;
  socialUserId: string | null;
  isRegistering: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedUrl, setAttemptedUrl] = useState('');
  
  // Social State
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [socialUserId, setSocialUserId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

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

  const registerSocial = (username: string, avatar: string) => {
    if (!socket || !isConnected) return;
    setIsRegistering(true);
    const token = localStorage.getItem('fumik_user_id') || userId || '';
    socket.emit('social:register', { username: username.trim(), token, avatar });
  };

  const initSocket = (url: string) => {
    if (socket) socket.disconnect();
    
    console.log('🔌 Connecting to:', url);
    setAttemptedUrl(url);
    
    const socketInstance = io(url, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected!');
      setIsConnected(true);
      setError(null);
      
      // Auto-register if we have a name
      const savedName = localStorage.getItem('fumik_user_name');
      const savedAvatar = localStorage.getItem('fumik_user_avatar');
      const persistentId = localStorage.getItem('fumik_user_id');
      
      if (savedName && persistentId) {
        socketInstance.emit('social:register', { 
          username: savedName, 
          token: persistentId, 
          avatar: savedAvatar || 'default' 
        });
      }

      // If we were in a room, try to re-sync
      const path = window.location.pathname;
      const roomMatch = path.match(/\/lobby\/([A-Z0-9]+)/);
      if (roomMatch) {
        const code = roomMatch[1];
        socketInstance.emit('room:get', { code, userId: persistentId });
      }
    });

    socketInstance.on('social:registered', ({ ok, username, userId: uid, error: err }: any) => {
      setIsRegistering(false);
      if (ok) {
        setSocialUserId(uid);
        localStorage.setItem('fumik_user_name', username);
        localStorage.setItem('fumik_social_id', uid);
        socketInstance.emit('social:get-online');
        socketInstance.emit('social:get-friends', { userId: uid });
      } else {
        console.error('Social Registration Error:', err);
      }
    });

    socketInstance.on('social:online-count', (count: number) => {
      setOnlineCount(count);
      socketInstance.emit('social:get-online');
    });

    socketInstance.on('social:online-list', (list: any[]) => {
      setOnlineUsers(list);
    });

    socketInstance.on('social:friends-list', ({ friends: f, requests: r }: any) => {
      setFriends(f);
      setFriendRequests(r);
    });

    socketInstance.on('social:search-results', (results: any[]) => {
      setSearchResults(results);
    });

    socketInstance.on('social:friend-request', ({ fromUserId, fromName, fromAvatar }: any) => {
      setFriendRequests(prev => [...prev.filter(r => r.userId !== fromUserId), { userId: fromUserId, name: fromName, avatar: fromAvatar }]);
    });

    socketInstance.on('social:invite', ({ fromName, roomCode: rc }: any) => {
      if (confirm(`🎮 ${fromName} invited you! Join their game?`)) {
        const myName = localStorage.getItem('fumik_user_name') || 'Legend';
        const myAvatar = localStorage.getItem('fumik_user_avatar') || 'default';
        socketInstance.emit('room:join', { code: rc, name: myName, avatar: myAvatar, userId: localStorage.getItem('fumik_user_id') });
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('❌ Error:', err.message);
      setIsConnected(false);
      setError(`Unreachable: ${url}`);
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
    const getDevUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:3001`;
      }
      return 'http://localhost:3001';
    };

    const defaultUrl = process.env.NEXT_PUBLIC_SERVER_URL || (isProd 
      ? 'https://fumik-server.onrender.com' 
      : getDevUrl());
    
    initSocket(defaultUrl);

    return () => {
      socket?.disconnect();
    };
  }, []);

  const createRoom = (name: string, avatar: string) => socket?.emit('room:create', { name, avatar, userId });
  const joinRoom = (code: string, name: string, avatar: string) => socket?.emit('room:join', { code, name, avatar, userId });
  const updateProfile = (name: string, avatar: string) => room && socket?.emit('profile:update', { code: room.code, name, avatar });
  const setManualUrl = (url: string) => initSocket(url);

  // Social Methods
  const searchUsers = (query: string) => socket?.emit('social:search', { query });
  const sendFriendRequest = (toUserId: string) => socket?.emit('social:friend-request', { fromUserId: socialUserId, toUserId });
  const acceptFriendRequest = (fromUserId: string) => {
    socket?.emit('social:accept-friend', { myUserId: socialUserId, fromUserId });
    setFriendRequests(prev => prev.filter(r => r.userId !== fromUserId));
    socket?.emit('social:get-friends', { userId: socialUserId });
  };
  
  const declineFriendRequest = (fromUserId: string) => {
    setFriendRequests(prev => prev.filter(r => r.userId !== fromUserId));
  };

  const [pendingInviteTo, setPendingInviteTo] = useState<string | null>(null);

  const sendInvite = (toUserId: string, fromName: string) => {
    setPendingInviteTo(toUserId);
    createRoom(fromName, localStorage.getItem('fumik_user_avatar') || 'default');
  };

  useEffect(() => {
    if (room && pendingInviteTo && socket) {
      socket.emit('social:invite', { 
        toUserId: pendingInviteTo, 
        fromName: localStorage.getItem('fumik_user_name') || 'Friend', 
        roomCode: room.code 
      });
      setPendingInviteTo(null);
    }
  }, [room, pendingInviteTo, socket]);

  return (
    <SocketContext.Provider value={{ 
      socket, room, userId, createRoom, joinRoom, updateProfile, error, isConnected, attemptedUrl, setManualUrl,
      onlineCount, onlineUsers, friends, friendRequests, registerSocial, searchUsers, searchResults,
      sendFriendRequest, acceptFriendRequest, declineFriendRequest, sendInvite, socialUserId, isRegistering
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
