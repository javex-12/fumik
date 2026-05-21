"use client";

import { useState, useEffect } from "react";
import { AVATARS } from "@fumik/shared/constants";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/lib/socket";
import * as Icons from "lucide-react";
import clsx from "clsx";
import dynamic from "next/dynamic";

const BootSequence = dynamic(() => import("@/components/BootSequence"), { 
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Booting FUMIK OS...</p>
    </div>
  )
});

const CommunicationSuite = dynamic(() => import("@/components/CommunicationSuite"), { ssr: false });

type Step = 'splash' | 'onboarding' | 'dashboard';

export default function LandingPage() {
  const { 
    createRoom, joinRoom, error, isConnected, userId, socket,
    onlineUsers, onlineCount, friends, friendRequests, searchResults,
    registerSocial, searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, sendInvite,
    socialUserId, isRegistering
  } = useSocket();

  const [step, setStep] = useState<Step>('splash');
  const [isMounted, setIsMounted] = useState(false);
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [socialTab, setSocialTab] = useState<'online'|'friends'|'requests'>('online');
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const savedName = localStorage.getItem('fumik_user_name');
    const savedAvatar = localStorage.getItem('fumik_user_avatar');
    if (savedName) setName(savedName);
    if (savedAvatar) setSelectedAvatar(savedAvatar);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleRegistered = ({ ok, error: err }: any) => {
      if (!ok) { setNameError(err); return; }
      setNameError("");
      setStep('dashboard');
    };

    socket.on('social:registered', handleRegistered);
    return () => {
      socket.off('social:registered', handleRegistered);
    };
  }, [socket]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) searchUsers(q);
  };

  const handleFinishOnboarding = () => {
    if (!name.trim()) return setNameError('Enter your legend name!');
    if (!isConnected) return setNameError('Not connected to server yet. Wait a moment.');
    setNameError("");
    registerSocial(name, selectedAvatar);
    localStorage.setItem('fumik_user_avatar', selectedAvatar);
  };

  const handleCreateRoom = () => {
    if (!isConnected) return;
    setIsLoading(true);
    createRoom(name, selectedAvatar);
  };

  const handleJoinRoom = () => {
    if (!roomCode || roomCode.length !== 5) return;
    setIsLoading(true);
    joinRoom(roomCode, name, selectedAvatar);
  };

  const inviteToRoom = (toUserId: string, toName: string) => {
    sendInvite(toUserId, name);
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white font-body selection:bg-orange-500/30 overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 'splash' && (
          <BootSequence key="boot" onComplete={() => {
            const savedName = localStorage.getItem('fumik_user_name');
            setStep(savedName ? 'dashboard' : 'onboarding');
          }} />
        )}

        {step === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950 overflow-y-auto"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_70%)]" />
            
            <div className="w-full max-w-xl space-y-12 relative z-10 text-center py-12 my-auto">
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter">WHO ARE YOU?</h2>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">Create your digital identity</p>
              </div>

              <div className="space-y-8">
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-2xl group-hover:bg-orange-500/30 transition-all" />
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-slate-900 border-4 border-orange-500 overflow-hidden relative z-10 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-xl z-20 shadow-lg rotate-12">
                      <Icons.ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-w-sm mx-auto">
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ENTER LEGEND NAME"
                    className="w-full bg-slate-900/50 border-2 border-slate-800 focus:border-orange-500 p-5 rounded-2xl outline-none text-center font-black text-xl tracking-tight transition-all placeholder:text-slate-700 shadow-inner"
                  />
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <Icons.Zap className="w-3 h-3 text-orange-500" /> Badge: Newbie Rank
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {AVATARS.slice(0, 16).map((av) => (
                    <button
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={clsx(
                        "aspect-square rounded-xl border-2 transition-all duration-300 overflow-hidden",
                        selectedAvatar === av 
                        ? "border-orange-500 bg-orange-500/10 scale-110 shadow-lg shadow-orange-500/20" 
                        : "border-slate-800 bg-slate-900/50 grayscale hover:grayscale-0 hover:border-slate-600"
                      )}
                    >
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${av}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

                {nameError && (
                  <div className="max-w-sm mx-auto bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest p-4 rounded-2xl text-center">
                    {nameError}
                  </div>
                )}

              <button 
                onClick={handleFinishOnboarding}
                disabled={!name || isRegistering}
                className="btn-primary w-full max-w-xs py-5 text-lg shadow-[0_0_30px_rgba(249,115,22,0.3)] disabled:opacity-30 flex items-center justify-center gap-3"
              >
                {isRegistering ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Claiming Legend...</>: 'ENTER THE REALM'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen bg-slate-950 flex flex-col p-4 sm:p-6 lg:p-12"
          >
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6 md:gap-8 lg:gap-12">
              <header className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Icons.Gamepad2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black italic tracking-tight">FUMIK OS</h1>
                    <div className="flex items-center gap-2 text-[8px] font-black text-orange-500 uppercase tracking-[0.3em]">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      {totalConnections} Active Pulses
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep('onboarding')}
                  className="flex items-center gap-2 sm:gap-4 bg-slate-900/50 hover:bg-slate-800 p-1.5 sm:p-2 pr-3 sm:pr-6 rounded-xl sm:rounded-2xl border border-slate-800 hover:border-orange-500/50 transition-all cursor-pointer text-left min-w-0"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-tight flex items-center gap-1 sm:gap-2 truncate max-w-[80px] sm:max-w-[140px]">
                      {name} <Icons.Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 flex-shrink-0" />
                    </div>
                    <div className="text-[7px] sm:text-[8px] font-bold text-slate-500 uppercase tracking-widest">Level 1 Elite</div>
                  </div>
                </button>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 flex-1">
                <div className="lg:col-span-8 space-y-8 lg:space-y-12">
                  <section className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <h3 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase">Quick Actions</h3>
                        <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Launch or Join a session</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <button 
                        onClick={handleCreateRoom}
                        disabled={isLoading}
                        className="group relative p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-orange-500 to-orange-600 text-left overflow-hidden transition-all hover:scale-[1.01] active:scale-95 shadow-2xl shadow-orange-500/20"
                      >
                        <div className="relative z-10 space-y-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <Icons.PlusCircle className="w-6 sm:w-8 sm:h-8 text-white" />
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-black text-white italic">CREATE ROOM</div>
                            <div className="text-orange-100/60 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Host a new game party</div>
                          </div>
                        </div>
                        <Icons.ArrowRight className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 w-6 h-6 sm:w-8 sm:h-8 text-white/20 group-hover:text-white/50 transition-all" />
                      </button>

                      <div className="group relative p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2.5rem] bg-slate-900 border border-slate-800 text-left overflow-hidden transition-all hover:border-orange-500/50">
                        <div className="relative z-10 space-y-3 sm:space-y-4">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-800 flex items-center justify-center">
                            <Icons.Hash className="w-5 sm:w-8 sm:h-8 text-orange-500" />
                          </div>
                          <div className="space-y-2 sm:space-y-4">
                            <div>
                              <div className="text-lg sm:text-2xl font-black text-white italic uppercase">Join Room</div>
                              <div className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Enter code to join friends</div>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                maxLength={5}
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="CODE"
                                className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700 px-2 py-2.5 sm:p-3 rounded-lg sm:rounded-xl outline-none font-bold text-center tracking-[2px] sm:tracking-[4px] focus:border-orange-500 text-sm sm:text-base"
                              />
                              <button 
                                onClick={handleJoinRoom}
                                disabled={isLoading || roomCode.length !== 5}
                                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-lg sm:rounded-xl font-black text-xs uppercase disabled:opacity-20 transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex-shrink-0 whitespace-nowrap"
                              >
                                Go
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <h3 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase">Live Games</h3>
                        <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Discover what's trending</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                       {['Brain War', 'Reflex', 'TicTacToe', 'Emoji'].map((game) => (
                         <div key={game} className="aspect-[4/5] rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 flex flex-col justify-between group hover:border-orange-500/30 transition-all">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-800 flex items-center justify-center">
                              <Icons.Gamepad className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-black italic uppercase text-slate-300">{game}</div>
                              <div className="text-[7px] sm:text-[8px] font-bold text-slate-600 uppercase tracking-widest">1.2k Playing</div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-4">
                  <div className="bg-slate-900 rounded-3xl lg:rounded-[2.5rem] border border-slate-800 flex flex-col h-[500px] lg:h-[600px] overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Icons.Users className="w-5 h-5 text-orange-500" />
                          <h4 className="font-black italic uppercase tracking-tight">Social Hub</h4>
                        </div>
                        <div className="px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 text-[8px] font-black text-orange-500 uppercase tracking-widest">
                          {onlineCount} Online
                        </div>
                      </div>
                      {/* Search */}
                      <div className="relative">
                        <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => handleSearch(e.target.value)}
                          placeholder="Search players..."
                          className="w-full bg-slate-950/50 border border-slate-800 focus:border-orange-500 pl-10 pr-4 py-3 rounded-2xl outline-none text-sm font-bold placeholder:text-slate-700 transition-colors"
                        />
                      </div>
                      {/* Tabs */}
                      <div className="flex gap-2">
                        {(['online','friends','requests'] as const).map(tab => (
                          <button key={tab} onClick={() => setSocialTab(tab)}
                            className={clsx('flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative',
                              socialTab === tab ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-500 hover:text-white'
                            )}>
                            {tab}
                            {tab === 'requests' && friendRequests.length > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center border-2 border-slate-900">{friendRequests.length}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                      {/* Search Results */}
                      {searchQuery.length >= 2 ? (
                        searchResults.length > 0 ? searchResults.map(u => (
                          <div key={u.userId} className="group p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between hover:border-orange-500/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 relative">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar}`} />
                                {u.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-900" />}
                              </div>
                              <div className="text-xs font-black uppercase tracking-tight text-white">{u.name}</div>
                            </div>
                            <button onClick={() => { sendFriendRequest(u.userId); alert('Friend request sent!'); }} className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 hover:bg-orange-600 hover:text-white transition-all">
                              <Icons.UserPlus className="w-4 h-4" />
                            </button>
                          </div>
                        )) : <div className="text-center text-slate-600 text-xs pt-8">No players found</div>
                      ) : socialTab === 'online' ? (
                        onlineUsers.filter(u => u.userId !== socialUserId).length > 0
                          ? onlineUsers.filter(u => u.userId !== socialUserId).map(user => (
                            <div key={user.userId} className="group p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between hover:border-orange-500/30 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 relative">
                                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} />
                                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-900" />
                                </div>
                                <div>
                                  <div className="text-xs font-black uppercase tracking-tight text-white">{user.name}</div>
                                  <div className="text-[8px] text-slate-600 uppercase tracking-widest">Online</div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => sendFriendRequest(user.userId)} title="Add Friend" className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 hover:bg-slate-700 hover:text-white transition-all">
                                  <Icons.UserPlus className="w-4 h-4" />
                                </button>
                                <button onClick={() => inviteToRoom(user.userId, user.name)} title="Invite to Game" className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white hover:bg-orange-500 transition-all">
                                  <Icons.Gamepad className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                          : <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-8">
                              <Icons.Ghost className="w-10 h-10 text-slate-700" />
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No one else is online right now</p>
                            </div>
                      ) : socialTab === 'friends' ? (
                        friends.length > 0
                          ? friends.map(f => (
                            <div key={f.userId} className="group p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between hover:border-orange-500/30 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 relative">
                                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.avatar}`} />
                                  {f.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-900" />}
                                </div>
                                <div>
                                  <div className="text-xs font-black uppercase tracking-tight text-white">{f.name}</div>
                                  <div className={clsx('text-[8px] uppercase tracking-widest', f.isOnline ? 'text-green-500' : 'text-slate-600')}>{f.isOnline ? 'Online' : 'Offline'}</div>
                                </div>
                              </div>
                              {f.isOnline && (
                                <button onClick={() => inviteToRoom(f.userId, f.name)} title="Invite to Game" className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white hover:bg-orange-500 transition-all">
                                  <Icons.Gamepad className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))
                          : <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-8">
                              <Icons.Heart className="w-10 h-10 text-slate-700" />
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No friends yet — search for players to add them!</p>
                            </div>
                      ) : (
                        friendRequests.length > 0
                          ? friendRequests.map(r => (
                            <div key={r.userId} className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl overflow-hidden border border-orange-500/50">
                                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.avatar}`} />
                                </div>
                                <div className="text-xs font-black uppercase tracking-tight text-white">{r.name}</div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => acceptFriendRequest(r.userId)} className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white hover:bg-green-500 transition-all">
                                  <Icons.Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => declineFriendRequest(r.userId)} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-all">
                                  <Icons.X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                          : <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-8">
                              <Icons.Bell className="w-10 h-10 text-slate-700" />
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No pending friend requests</p>
                            </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
