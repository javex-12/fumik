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
    </div>
  )
});

const CommunicationSuite = dynamic(() => import("@/components/CommunicationSuite"), { ssr: false });

export default function LandingPage() {
  const { 
    createRoom, joinRoom, isConnected, userId, socket,
    onlineUsers, onlineCount, friends, friendRequests, searchResults,
    registerSocial, searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, sendInvite,
    socialUserId, isRegistering, totalConnections
  } = useSocket();

  const [step, setStep] = useState<'splash' | 'onboarding' | 'dashboard'>('splash');
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
    setName(localStorage.getItem('fumik_user_name') || "");
    setSelectedAvatar(localStorage.getItem('fumik_user_avatar') || AVATARS[0]);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReg = ({ ok, error }: any) => { if (ok) setStep('dashboard'); else setNameError(error); };
    socket.on('social:registered', handleReg);
    return () => { socket.off('social:registered', handleReg); };
  }, [socket]);

  const handleFinishOnboarding = () => {
    if (!name.trim()) return setNameError('Legend name required.');
    if (!isConnected) return setNameError('System offline.');
    registerSocial(name, selectedAvatar);
    localStorage.setItem('fumik_user_avatar', selectedAvatar);
  };

  if (!isMounted) return null;

  const isFriend = (uid: string) => friends.some(f => f.userId === uid);
  const hasSentRequest = (uid: string) => false; // Could be tracked if needed

  return (
    <main className="min-h-screen bg-slate-950 text-white font-body selection:bg-orange-500/30 overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 'splash' && <BootSequence key="boot" onComplete={() => setStep(localStorage.getItem('fumik_user_name') ? 'dashboard' : 'onboarding')} />}

        {step === 'onboarding' && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950 overflow-y-auto">
            <div className="w-full max-w-xl space-y-12 text-center py-12">
              <div className="space-y-4"><h2 className="text-5xl font-black italic tracking-tighter">INITIALIZE</h2><p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Syncing digital identity...</p></div>
              <div className="space-y-8">
                <div className="flex justify-center"><div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-slate-900 border-4 border-orange-500 overflow-hidden shadow-2xl"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`} className="w-full h-full" /></div></div>
                <div className="max-w-sm mx-auto"><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ENTER CALLSIGN" className="w-full bg-slate-900 border-2 border-slate-800 focus:border-orange-500 p-5 rounded-2xl outline-none text-center font-black text-xl text-white" /></div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">{AVATARS.slice(0, 16).map((av) => (<button key={av} onClick={() => setSelectedAvatar(av)} className={clsx("aspect-square rounded-xl border-2 transition-all", selectedAvatar === av ? "border-orange-500 bg-orange-500/10 scale-110" : "border-slate-800 grayscale opacity-40 hover:opacity-100")}><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${av}`} /></button>))}</div>
              </div>
              {nameError && <div className="text-red-500 font-bold uppercase text-[10px]">{nameError}</div>}
              <button onClick={handleFinishOnboarding} disabled={!name || isRegistering} className="btn-primary w-full max-w-xs py-5">ENTER SYSTEM</button>
            </div>
          </motion.div>
        )}

        {step === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-slate-950 flex flex-col p-4 sm:p-8 lg:p-12 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full space-y-8 lg:space-y-12 pb-20">
              {/* REVAMPED HEADER */}
              <header className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]"><Icons.Zap className="w-8 h-8 text-white" /></div>
                  <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white">FUMIK <span className="text-orange-500">OS</span></h1>
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      {totalConnections} Global Nodes Linked
                    </div>
                  </div>
                </div>
                <button onClick={() => setStep('onboarding')} className="flex items-center gap-4 bg-slate-950 border border-slate-800 p-2 pr-8 rounded-full hover:border-orange-500/50 transition-all shadow-xl active:scale-95 group">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`} /></div>
                  <div className="text-left"><div className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[100px]">{name}</div><div className="text-[8px] font-bold text-orange-500 uppercase tracking-widest">ELITE LEVEL 1</div></div>
                </button>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                <div className="lg:col-span-8 space-y-12">
                  <section className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* CREATE */}
                      <button onClick={handleCreateRoom} disabled={isLoading} className="group relative p-8 rounded-[3rem] bg-orange-600 text-left overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-orange-600/20">
                         <div className="relative z-10 space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center"><Icons.Plus className="w-8 h-8 text-white" /></div>
                            <div><div className="text-2xl font-black text-white italic">HOST SESSION</div><div className="text-orange-100/60 text-[10px] font-black uppercase tracking-widest">Deploy new Brain War instance</div></div>
                         </div>
                         <Icons.ArrowRight className="absolute bottom-8 right-8 w-8 h-8 text-white/20 group-hover:text-white/50 transition-all" />
                      </button>

                      {/* JOIN - RESPONSIVE FIX */}
                      <div className="p-8 rounded-[3rem] bg-slate-900 border border-slate-800 text-left space-y-6">
                        <div className="flex items-center gap-4"><Icons.Terminal className="text-orange-500" /><div><div className="text-xl font-black text-white italic uppercase">Interlink</div><div className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Access remote sector</div></div></div>
                        <div className="flex items-center gap-3">
                           <input type="text" maxLength={5} value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="CODE" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none font-black text-center tracking-[4px] focus:border-orange-500 text-white min-w-0" />
                           <button onClick={handleJoinRoom} disabled={roomCode.length !== 5} className="p-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 disabled:opacity-20 shrink-0">GO</button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="aspect-[21/9] rounded-[3rem] bg-slate-900 border-2 border-slate-800 p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/5 blur-[100px] group-hover:bg-orange-600/10 transition-colors" />
                       <div className="flex justify-between items-start relative z-10">
                          <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl"><Icons.Brain className="w-10 h-10 text-orange-500 animate-pulse" /></div>
                          <div className="text-right"><div className="text-3xl font-black italic text-white uppercase tracking-tighter">BRAIN WAR</div><div className="text-orange-500/60 text-[10px] font-black uppercase tracking-[0.4em]">Active Simulation</div></div>
                       </div>
                       <div className="flex items-end justify-between relative z-10 gap-4">
                          <div className="space-y-1"><div className="text-white font-black italic text-2xl uppercase leading-none">Neural Protocol Loaded</div><div className="text-slate-600 text-[8px] font-black uppercase tracking-[0.4em]">Awaiting pilot command...</div></div>
                          <button onClick={handleCreateRoom} className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl shrink-0">Engage</button>
                       </div>
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-4 h-full">
                  <div className="bg-slate-900 rounded-[3rem] border border-slate-800 flex flex-col h-[600px] shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 space-y-6">
                      <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Icons.Users className="w-5 h-5 text-orange-500" /><h4 className="font-black italic uppercase text-white">Social Hub</h4></div><div className="px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 text-[8px] font-black text-orange-500 uppercase">{onlineCount} LIVE</div></div>
                      <div className="relative"><Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Search CALLSIGN..." className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 pl-11 pr-4 py-4 rounded-2xl outline-none text-sm font-black text-white" /></div>
                      <div className="flex gap-2">{(['online','friends','requests'] as const).map(tab => (<button key={tab} onClick={() => setSocialTab(tab)} className={clsx('flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative', socialTab === tab ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-500')}>{tab}{tab === 'requests' && friendRequests.length > 0 && (<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center border-2 border-slate-900">{friendRequests.length}</span>)}</button>))}</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                      {searchQuery.length >= 2 ? (
                        searchResults.length > 0 ? searchResults.map(u => (
                          <div key={u.userId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between group hover:border-orange-500/30 transition-all">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800 relative"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar}`} />{u.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-950" />}</div><div className="text-xs font-black uppercase text-white">{u.name}</div></div>
                            {isFriend(u.userId) ? <div className="text-orange-500/40 font-black text-[8px] uppercase tracking-widest">Linked</div> : <button onClick={() => { sendFriendRequest(u.userId); alert('Signal Sent.'); }} className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 hover:bg-orange-600 hover:text-white transition-all"><Icons.UserPlus className="w-4 h-4" /></button>}
                          </div>
                        )) : <div className="text-center text-slate-600 text-[10px] font-black uppercase tracking-widest pt-12">No nodes found</div>
                      ) : socialTab === 'online' ? (
                        onlineUsers.filter(u => u.userId !== socialUserId).length > 0 ? onlineUsers.filter(u => u.userId !== socialUserId).map(user => (
                          <div key={user.userId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-orange-500/30 transition-all">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800 relative"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} /><div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-950" /></div><div><div className="text-xs font-black uppercase text-white">{user.name}</div><div className="text-[8px] text-green-500/60 font-black uppercase tracking-widest">Active</div></div></div>
                            <div className="flex gap-2">
                              {!isFriend(user.userId) && <button onClick={() => { sendFriendRequest(user.userId); alert('Signal Sent.'); }} className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 hover:text-white transition-all"><Icons.UserPlus className="w-4 h-4" /></button>}
                              <button onClick={() => inviteToRoom(user.userId)} className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white hover:bg-orange-500 shadow-lg shadow-orange-600/20 transition-all"><Icons.Zap className="w-4 h-4" /></button>
                            </div>
                          </div>
                        )) : <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-12 opacity-20"><Icons.Cpu className="w-12 h-12" /><p className="text-[8px] font-black uppercase tracking-[0.3em]">Scanning global sectors...</p></div>
                      ) : socialTab === 'friends' ? (
                        friends.length > 0 ? friends.map(f => (
                          <div key={f.userId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-orange-500/30 transition-all">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800 relative"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.avatar}`} />{f.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-950" />}</div><div><div className="text-xs font-black uppercase text-white">{f.name}</div><div className={clsx('text-[8px] font-black uppercase', f.isOnline ? 'text-green-500' : 'text-slate-600')}>{f.isOnline ? 'Active' : 'Offline'}</div></div></div>
                            {f.isOnline && <button onClick={() => inviteToRoom(f.userId)} className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white hover:bg-orange-500 transition-all shadow-lg shadow-orange-600/20"><Icons.Zap className="w-4 h-4" /></button>}
                          </div>
                        )) : <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-12 opacity-20"><Icons.Heart className="w-12 h-12" /><p className="text-[8px] font-black uppercase tracking-[0.3em]">Neural link empty</p></div>
                      ) : (
                        friendRequests.length > 0 ? friendRequests.map(r => (
                          <div key={r.userId} className="p-4 rounded-2xl bg-slate-950 border border-orange-500/20 flex items-center justify-between shadow-[0_0_20px_rgba(249,115,22,0.05)]">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl overflow-hidden border border-orange-500/40"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.avatar}`} /></div><div className="text-xs font-black uppercase text-white">{r.name}</div></div>
                            <div className="flex gap-2"><button onClick={() => acceptFriendRequest(r.userId)} className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white hover:bg-green-500 transition-all"><Icons.Check className="w-4 h-4" /></button><button onClick={() => declineFriendRequest(r.userId)} className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-all"><Icons.X className="w-4 h-4" /></button></div>
                          </div>
                        )) : <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-12 opacity-20"><Icons.Bell className="w-12 h-12" /><p className="text-[8px] font-black uppercase tracking-[0.3em]">No incoming signals</p></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <CommunicationSuite />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
