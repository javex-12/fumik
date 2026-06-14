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
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
});

const CommunicationSuite = dynamic(() => import("@/components/CommunicationSuite"), { ssr: false });
const NeuralNotifications = dynamic(() => import("@/components/NeuralNotifications"), { ssr: false });

export default function LandingPage() {
  const { 
    createRoom, joinRoom, isConnected, socket, userId,
    onlineUsers, onlineCount, friends, friendRequests, searchResults,
    registerSocial, searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, sendInvite,
    socialUserId, isRegistering, totalConnections, addNotification
  } = useSocket();

  // Deduplicate self from the online list — guard against both socialUserId and
  // the raw device userId so the filter works even before registration completes.
  // Only access localStorage after hydration (isMounted guard below ensures this).
  const storedSocialId = typeof window !== 'undefined' ? localStorage.getItem('fumik_social_id') : null;
  const myIds = [socialUserId, userId, storedSocialId].filter(Boolean);
  const otherUsers = onlineUsers.filter(u => u && u.userId && !myIds.includes(u.userId) && u.name !== name);
  const otherFriends = friends.filter(f => f && f.userId && !myIds.includes(f.userId) && f.name !== name);

  const [step, setStep] = useState<'splash' | 'onboarding' | 'dashboard'>('splash');
  const [isMounted, setIsMounted] = useState(false);
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [socialTab, setSocialTab] = useState<'online'|'friends'|'requests'>('online');
  const [nameError, setNameError] = useState("");
  const [isSocialHubOpen, setIsSocialHubOpen] = useState(false); // Mobile drawer state

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
    localStorage.setItem('fumik_user_name', name.trim());
    localStorage.setItem('fumik_user_avatar', selectedAvatar);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) searchUsers(q);
  };

  const createNewRoom = () => {
    if (!isConnected) {
      addNotification("Neural Link offline. Please check your connection.", "error");
      return;
    }
    createRoom(name, selectedAvatar);
  };

  const joinExistingRoom = () => {
    if (!roomCode || roomCode.length !== 5) {
      addNotification("Invalid Sector Code. Please verify and retry.", "error");
      return;
    }
    if (!isConnected) {
      addNotification("Neural Link offline. Please check your connection.", "error");
      return;
    }
    joinRoom(roomCode, name, selectedAvatar);
  };

  const isFriend = (uid: string) => friends.some(f => f.userId === uid);

  if (!isMounted) return null;

  const SocialHubContent = () => (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      <div className="p-6 border-b border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3"><Icons.Users className="w-5 h-5 text-orange-500" /><h4 className="font-black italic uppercase text-white text-sm">Players</h4></div>
          <div className="px-2 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20 text-[8px] font-black text-orange-500 uppercase">{onlineCount} ONLINE</div>
        </div>
        <div className="relative">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="SEARCH PLAYERS..." className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 pl-9 pr-3 py-3 rounded-xl outline-none text-[10px] font-black text-white" />
        </div>
        <div className="flex gap-1.5">
          {(['online','friends','requests'] as const).map(tab => (
            <button key={tab} onClick={() => setSocialTab(tab)} className={clsx('flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all relative', socialTab === tab ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-500')}>
              {tab}
              {tab === 'requests' && friendRequests.length > 0 && (<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[7px] flex items-center justify-center border-2 border-slate-900">{friendRequests.length}</span>)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {searchQuery.length >= 2 ? (
          searchResults.filter(u => u && u.userId).length > 0 ? searchResults.filter(u => u && u.userId).map(u => (
            <div key={u.userId} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-800 relative"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar || 'default'}`} />{u.isOnline && <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-slate-950" />}</div>
                <div className="text-[10px] font-black uppercase text-white truncate max-w-[80px]">{u.name}</div>
              </div>
              {isFriend(u.userId) ? <div className="text-orange-500/40 font-black text-[7px] uppercase tracking-widest px-2">Friends</div> : <button onClick={() => sendFriendRequest(u.userId)} className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-orange-600 hover:text-white transition-all"><Icons.UserPlus className="w-3.5 h-3.5" /></button>}
            </div>
          )) : <div className="text-center text-slate-600 text-[8px] font-black uppercase pt-8">No players found</div>
        ) : socialTab === 'online' ? (
          otherUsers.length > 0 ? otherUsers.map(user => (
            <div key={user.userId} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-800 relative"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar || 'default'}`} /><div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-950" /></div>
                <div><div className="text-[10px] font-black uppercase text-white">{user.name}</div><div className="text-[7px] text-green-500/60 font-black uppercase">Active</div></div>
              </div>
              <div className="flex gap-2">
                {!isFriend(user.userId) && <button onClick={() => sendFriendRequest(user.userId)} className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white transition-all"><Icons.UserPlus className="w-3.5 h-3.5" /></button>}
                <button onClick={() => sendInvite(user.userId, name)} className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white hover:bg-orange-500 transition-all"><Icons.Zap className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )) : <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-20"><Icons.Users className="w-8 h-8" /><p className="text-[8px] font-black uppercase tracking-widest">No one online yet</p></div>
        ) : socialTab === 'friends' ? (
          otherFriends.length > 0 ? otherFriends.map(f => (
            <div key={f.userId} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-800 relative"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.avatar || 'default'}`} />{f.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-950" />}</div>
                <div><div className="text-[10px] font-black uppercase text-white">{f.name}</div><div className={clsx('text-[7px] font-black uppercase', f.isOnline ? 'text-green-500' : 'text-slate-600')}>{f.isOnline ? 'Active' : 'Offline'}</div></div>
              </div>
              {f.isOnline && <button onClick={() => sendInvite(f.userId, name)} className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white hover:bg-orange-500 transition-all"><Icons.Zap className="w-3.5 h-3.5" /></button>}
            </div>
          )) : <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-20"><Icons.Heart className="w-8 h-8" /><p className="text-[8px] font-black uppercase tracking-widest">No friends yet</p></div>
        ) : (
          friendRequests.filter(r => r && r.userId).length > 0 ? friendRequests.filter(r => r && r.userId).map(r => (
            <div key={r.userId} className="p-3 rounded-xl bg-slate-950 border border-orange-500/20 flex items-center justify-between shadow-[0_0_20px_rgba(249,115,22,0.05)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-orange-500/40"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.avatar || 'default'}`} /></div>
                <div className="text-[10px] font-black uppercase text-white">{r.name}</div>
              </div>
              <div className="flex gap-2"><button onClick={() => acceptFriendRequest(r.userId)} className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white"><Icons.Check className="w-3.5 h-3.5" /></button><button onClick={() => declineFriendRequest(r.userId)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400"><Icons.X className="w-3.5 h-3.5" /></button></div>
            </div>
          )) : <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-20"><Icons.Bell className="w-8 h-8" /><p className="text-[8px] font-black uppercase tracking-widest">No requests yet</p></div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-body selection:bg-orange-500/30 relative">
      <NeuralNotifications />
      <AnimatePresence mode="wait">
        {step === 'splash' && <BootSequence key="boot" onComplete={() => setStep(localStorage.getItem('fumik_user_name') ? 'dashboard' : 'onboarding')} />}

        {step === 'onboarding' && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950 overflow-y-auto">
            <div className="w-full max-w-xl space-y-12 text-center py-12">
              <div className="space-y-4"><h2 className="text-5xl font-black italic tracking-tighter">GET STARTED</h2><p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Choose your name and avatar to begin...</p></div>
              <div className="space-y-8">
                <div className="flex justify-center"><div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-slate-900 border-4 border-orange-500 overflow-hidden shadow-2xl"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`} className="w-full h-full" /></div></div>
                <div className="max-w-sm mx-auto"><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ENTER YOUR NAME" className="w-full bg-slate-900 border-2 border-slate-800 focus:border-orange-500 p-5 rounded-2xl outline-none text-center font-black text-xl text-white" /></div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">{AVATARS.slice(0, 16).map((av) => (<button key={av} onClick={() => setSelectedAvatar(av)} className={clsx("aspect-square rounded-xl border-2 transition-all", selectedAvatar === av ? "border-orange-500 bg-orange-500/10 scale-110" : "border-slate-800 grayscale opacity-40 hover:opacity-100")}><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${av}`} /></button>))}</div>
              </div>
              {nameError && <div className="text-red-500 font-bold uppercase text-[10px]">{nameError}</div>}
              <button onClick={handleFinishOnboarding} disabled={!name || isRegistering} className="btn-primary w-full max-w-xs py-5">LET'S GO</button>
            </div>
          </motion.div>
        )}

        {step === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col p-4 sm:p-8 lg:p-12 pb-32">
            <div className="max-w-7xl mx-auto w-full space-y-6 lg:space-y-12">
              <header className="flex justify-between items-center gap-4 bg-slate-900/60 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800 shadow-2xl relative">
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0"><Icons.Zap className="w-5 h-5 sm:w-7 sm:h-7 text-white" /></div>
                  <div className="truncate">
                    <h1 className="text-lg sm:text-2xl font-black italic tracking-tighter text-white">FUMIK <span className="text-orange-500">OS</span></h1>
                    <div className="flex items-center gap-1.5 text-[7px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      {totalConnections} Players Online
                    </div>
                  </div>
                </div>
                <button onClick={() => setStep('onboarding')} className="flex items-center gap-2 sm:gap-3 bg-slate-950/50 border border-slate-800 p-1 pr-3 sm:p-1.5 sm:pr-5 rounded-full hover:border-orange-500/30 transition-all flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-orange-500/50"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`} /></div>
                  <div className="text-left hidden sm:block"><div className="text-[10px] font-black text-white uppercase tracking-tight">{name}</div><div className="text-[7px] font-bold text-orange-500 uppercase">ELITE</div></div>
                </button>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
                <div className="lg:col-span-8 space-y-6 lg:space-y-12">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <button onClick={createNewRoom} className="group relative p-6 sm:p-8 rounded-[2rem] bg-orange-600 text-left overflow-hidden shadow-2xl transition-transform active:scale-95">
                       <div className="relative z-10 space-y-4">
                          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center"><Icons.Plus className="w-6 h-6 text-white" /></div>
                           <div><div className="text-xl sm:text-2xl font-black text-white italic">CREATE ROOM</div><div className="text-orange-100/60 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Start a new game</div></div>
                       </div>
                       <Icons.ChevronRight className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 w-6 h-6 text-white/20 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <div className="p-6 sm:p-8 rounded-[2rem] bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4">
                       <div className="flex items-center gap-3"><Icons.Terminal className="w-5 h-5 text-orange-500" /><div className="text-sm sm:text-base font-black text-white italic uppercase leading-none">Join a Room</div></div>
                      <div className="flex items-center gap-2">
                         <input type="text" maxLength={5} value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="CODE" className="flex-1 bg-slate-950 border border-slate-800 p-3 sm:p-4 rounded-xl outline-none font-black text-center tracking-[4px] focus:border-orange-500 text-white text-xs sm:text-sm min-w-0" />
                         <button onClick={joinExistingRoom} disabled={roomCode.length !== 5} className="p-3 sm:p-4 bg-orange-500 text-white rounded-xl font-black text-[10px] sm:text-xs uppercase shadow-lg shadow-orange-500/20 disabled:opacity-20 shrink-0">GO</button>
                      </div>
                    </div>
                  </div>

                  <div className="aspect-[16/9] sm:aspect-[21/9] rounded-[2rem] sm:rounded-[3rem] bg-slate-900 border border-slate-800 p-6 sm:p-12 flex flex-col justify-between relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-orange-600/5 blur-[60px] sm:blur-[100px]" />
                     <div className="flex justify-between items-start relative z-10">
                        <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl"><Icons.Brain className="w-6 h-6 sm:w-10 sm:h-10 text-orange-500 animate-pulse" /></div>
                        <div className="text-right"><div className="text-lg sm:text-3xl font-black italic text-white uppercase tracking-tighter leading-none">BRAIN WAR</div><div className="text-orange-500/60 text-[7px] sm:text-[10px] font-black uppercase tracking-[0.4em] mt-1 sm:mt-2">100% AI GENERATED</div></div>
                     </div>
                     <div className="flex items-end justify-between relative z-10 gap-4 mt-6">
                         <div className="space-y-1"><div className="text-white font-black italic text-sm sm:text-2xl uppercase leading-none">Play Brain War</div><div className="text-slate-600 text-[6px] sm:text-[8px] font-black uppercase tracking-[0.4em]">Status: Ready to play</div></div>
                         <button onClick={createNewRoom} className="bg-white text-black px-4 py-2 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[8px] sm:text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shrink-0 shadow-xl">Play Now</button>
                     </div>
                  </div>
                </div>

                <div className="hidden lg:block lg:col-span-4 h-[600px]">
                  <div className="h-full rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
                    <SocialHubContent />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] w-full max-w-[200px]">
               <button onClick={() => setIsSocialHubOpen(true)} className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex items-center justify-center gap-3 shadow-2xl text-xs font-black uppercase tracking-widest text-orange-500 border-t-orange-500/50">
                 <Icons.Users className="w-4 h-4" /> Hub {friendRequests.length > 0 && <span className="bg-red-500 text-white w-2 h-2 rounded-full" />}
               </button>
            </div>

            <AnimatePresence>
              {isSocialHubOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSocialHubOpen(false)} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[90]" />
                  <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed bottom-0 inset-x-0 h-[80vh] z-[100] rounded-t-[3rem] border-t border-slate-800 shadow-2xl overflow-hidden"><div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto my-4" /><SocialHubContent /></motion.div>
                </>
              )}
            </AnimatePresence>
            <CommunicationSuite />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}