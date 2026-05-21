"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room } from '@fumik/shared/types';
import { useRouter } from 'next/navigation';

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
  narratorMessage: string | null;
  totalConnections: number;
  leaveRoom: (code: string) => void;
  abortGame: (code: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedUrl, setAttemptedUrl] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [socialUserId, setSocialUserId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [narratorMessage, setNarratorMessage] = useState<string | null>(null);
  const [totalConnections, setTotalConnections] = useState(0);
  const [pendingInviteTo, setPendingInviteTo] = useState<string | null>(null);

  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  const syncSocialData = useCallback((s: Socket, uid: string) => {
    if (!s.connected) return;
    s.emit('social:get-online');
    s.emit('social:get-friends', { userId: uid });
  }, []);

  const initSocket = useCallback((url: string) => {
    if (socketRef.current) socketRef.current.disconnect();
    
    const socketInstance = io(url, { 
      reconnectionAttempts: 10, 
      reconnectionDelay: 1000, 
      timeout: 10000,
      transports: ['websocket', 'polling'] // Ensure mobile compatibility
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setError(null);
      const savedName = localStorage.getItem('fumik_user_name');
      const persistentId = localStorage.getItem('fumik_user_id');
      const savedAvatar = localStorage.getItem('fumik_user_avatar');
      
      if (savedName && persistentId) {
        socketInstance.emit('social:register', { 
          username: savedName, 
          token: persistentId, 
          avatar: savedAvatar || 'default' 
        });
      }
    });

    socketInstance.on('system:narrator', ({ message }: { message: string }) => {
      setNarratorMessage(message);
      setTimeout(() => setNarratorMessage(null), 5000);
    });

    socketInstance.on('social:total-connections', (count: number) => setTotalConnections(count));

    socketInstance.on('room:left', () => {
      setRoom(null);
      router.push('/');
    });

    socketInstance.on('social:registered', ({ ok, username, userId: uid }) => {
      setIsRegistering(false);
      if (ok) {
        setSocialUserId(uid);
        localStorage.setItem('fumik_user_name', username);
        localStorage.setItem('fumik_social_id', uid);
        syncSocialData(socketInstance, uid);
      }
    });

    socketInstance.on('social:online-count', (count: number) => {
      setOnlineCount(count);
      const myId = localStorage.getItem('fumik_social_id');
      if (myId) syncSocialData(socketInstance, myId);
    });

    socketInstance.on('social:online-list', (list: any[]) => setOnlineUsers(list));
    socketInstance.on('social:friends-list', ({ friends: f, requests: r }: any) => { setFriends(f); setFriendRequests(r); });
    socketInstance.on('social:friends-updated', () => {
      const myId = localStorage.getItem('fumik_social_id');
      if (myId) syncSocialData(socketInstance, myId);
    });

    socketInstance.on('social:search-results', (results: any[]) => setSearchResults(results));
    
    socketInstance.on('social:friend-request', ({ fromUserId, fromName, fromAvatar }: any) => {
      setFriendRequests(prev => {
        if (prev.some(r => r.userId === fromUserId)) return prev;
        return [...prev, { userId: fromUserId, name: fromName, avatar: fromAvatar }];
      });
    });

    socketInstance.on('social:invite', ({ fromName, roomCode: rc }: any) => {
      if (confirm(`🎮 ${fromName} wants to play Brain War! Join session?`)) {
        const myName = localStorage.getItem('fumik_user_name') || 'Legend';
        const myAvatar = localStorage.getItem('fumik_user_avatar') || 'default';
        socketInstance.emit('room:join', { code: rc, name: myName, avatar: myAvatar, userId: localStorage.getItem('fumik_user_id') });
      }
    });

    socketInstance.on('room:created', (newRoom: Room) => {
      setRoom(newRoom);
      if (pendingInviteTo) {
        socketInstance.emit('social:invite', { toUserId: pendingInviteTo, fromName: localStorage.getItem('fumik_user_name'), roomCode: newRoom.code });
        setPendingInviteTo(null);
      }
      router.push(`/lobby/${newRoom.code}`);
    });

    socketInstance.on('room:joined', (joinedRoom: Room) => { setRoom(joinedRoom); router.push(`/lobby/${joinedRoom.code}`); });
    socketInstance.on('room:update', (updatedRoom: Room) => setRoom(updatedRoom));
    socketInstance.on('disconnect', () => setIsConnected(false));
    socketInstance.on('connect_error', () => { setIsConnected(false); setError(`Unreachable: ${url}`); });

    setSocket(socketInstance);
    socketRef.current = socketInstance;
    setAttemptedUrl(url);
  }, [router, pendingInviteTo, syncSocialData]);

  useEffect(() => {
    let savedId = localStorage.getItem('fumik_user_id');
    if (!savedId) {
      savedId = 'u_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('fumik_user_id', savedId);
    }
    setUserId(savedId);

    const isProd = process.env.NODE_ENV === 'production';
    const defaultUrl = process.env.NEXT_PUBLIC_SERVER_URL || (isProd ? 'https://fumik-server.onrender.com' : `http://${window.location.hostname}:3001`);
    initSocket(defaultUrl);
    return () => { socketRef.current?.disconnect(); };
  }, [initSocket]);

  const createRoom = (name: string, avatar: string) => socket?.emit('room:create', { name, avatar, userId });
  const joinRoom = (code: string, name: string, avatar: string) => socket?.emit('room:join', { code, name, avatar, userId });
  const updateProfile = (name: string, avatar: string) => room && socket?.emit('profile:update', { code: room.code, name, avatar });
  const registerSocial = (username: string, avatar: string) => { setIsRegistering(true); socket?.emit('social:register', { username, token: userId, avatar }); };
  const searchUsers = (query: string) => socket?.emit('social:search', { query });
  
  const sendFriendRequest = (toUserId: string) => {
    const fromId = socialUserId || localStorage.getItem('fumik_social_id');
    if (fromId) socket?.emit('social:friend-request', { fromUserId: fromId, toUserId });
  };
  
  const acceptFriendRequest = (fromUserId: string) => { 
    const myId = socialUserId || localStorage.getItem('fumik_social_id');
    if (myId) socket?.emit('social:accept-friend', { myUserId: myId, fromUserId }); 
  };
  
  const declineFriendRequest = (fromUserId: string) => setFriendRequests(prev => prev.filter(r => r.userId !== fromUserId));
  const leaveRoom = (code: string) => socket?.emit('room:leave', { code });
  const abortGame = (code: string) => socket?.emit('game:abort', { code });
  const setManualUrl = (url: string) => initSocket(url);

  const sendInvite = (toUserId: string, fromName: string) => {
    setPendingInviteTo(toUserId);
    const av = localStorage.getItem('fumik_user_avatar') || 'default';
    socket?.emit('room:create', { name: fromName, avatar: av, userId: userId });
  };

  return (
    <SocketContext.Provider value={{ 
      socket, room, userId, createRoom, joinRoom, updateProfile, error, isConnected, attemptedUrl, setManualUrl,
      onlineCount, onlineUsers, friends, friendRequests, registerSocial, searchUsers, searchResults,
      sendFriendRequest, acceptFriendRequest, declineFriendRequest, sendInvite, socialUserId, isRegistering,
      narratorMessage, totalConnections, leaveRoom, abortGame
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
