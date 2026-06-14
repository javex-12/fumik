"use client";

import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import BrainGame from "@/components/BrainGame";
import ClickerGame from "@/components/ClickerGame";
import ScribbleGame from "@/components/ScribbleGame";
import GameReadyScreen from "@/components/GameReadyScreen";
import ProfileModal from "@/components/ProfileModal";
import * as Icons from "lucide-react";
import clsx from "clsx";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const CommunicationSuite = dynamic(() => import("@/components/CommunicationSuite"), { ssr: false });
const NeuralNotifications = dynamic(() => import("@/components/NeuralNotifications"), { ssr: false });

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { room, socket, isConnected, userId, leaveRoom, abortGame } = useSocket();
  const [isMounted, setIsMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [linkTimeout, setLinkTimeout] = useState(false);
  const [selectedGame, setSelectedGame] = useState<'brain' | 'clicker' | 'scribble'>('brain');
  const router = useRouter();
  const recoveryAttempted = useRef(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Auto-recover: if we land here with no room (e.g. invite on mobile),
  // emit room:get so the server rehydrates the room state.
  useEffect(() => {
    if (!socket || !isConnected || room || recoveryAttempted.current) return;
    recoveryAttempted.current = true;
    const savedName = localStorage.getItem('fumik_user_name') || 'Legend';
    const savedAvatar = localStorage.getItem('fumik_user_avatar') || 'default';
    socket.emit('room:join', { code, name: savedName, avatar: savedAvatar, userId });
  }, [socket, isConnected, room, code, userId]);

  // Show an escape hatch after 8 seconds if still no room
  useEffect(() => {
    if (room) return;
    const t = setTimeout(() => setLinkTimeout(true), 8000);
    return () => clearTimeout(t);
  }, [room]);

  if (!isMounted || !room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-white font-black uppercase tracking-widest text-lg animate-pulse">Linking Sector...</div>
        {linkTimeout && (
          <div className="space-y-3">
            <p className="text-slate-500 text-xs uppercase tracking-widest">Sector not found or session expired.</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              Return to Base
            </button>
          </div>
        )}
      </div>
    );
  }

  const renderGame = () => {
    if (room.gameStatus === 'readying') return <GameReadyScreen />;
    if (room.gameStatus === 'playing') {
      if (room.currentGame === 'brain') return <BrainGame />;
      if (room.currentGame === 'clicker') return <ClickerGame />;
      if (room.currentGame === 'scribble') return <ScribbleGame />;
    }
    return null;
  };

  const gameView = renderGame();
  
  if (gameView) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-950 relative flex flex-col">
        <NeuralNotifications />
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex gap-2">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 px-4 py-2 rounded-full flex items-center gap-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">
              {room.currentGame === 'clicker' ? 'TAP SPEED RUN' : room.currentGame === 'scribble' ? 'SCRIBBLE SMASH' : 'BRAIN WAR'}
              </span>
            </div>
            <div className="w-px h-4 bg-slate-800" />
            <div className="flex gap-2">
              {room.players.find(p => p.userId === userId)?.isHost && (
                <button onClick={() => abortGame(code)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors" title="Abort Game"><Icons.Square className="w-4 h-4 fill-current" /></button>
              )}
              <button onClick={() => leaveRoom(code)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Leave Room"><Icons.LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        <div className="flex-1 relative overflow-hidden">{gameView}</div>
        <CommunicationSuite />
      </div>
    );
  }

  const me = room.players.find(p => p.userId === userId);
  const isHost = me?.isHost;

  return (
    <main className="min-h-screen bg-slate-950 text-white font-body selection:bg-orange-500/30 relative p-4 sm:p-8 lg:p-12 overflow-y-auto">
      <NeuralNotifications />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(249,115,22,0.05),transparent_50%)] pointer-events-none" />
      <CommunicationSuite />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-12 relative z-10">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 backdrop-blur-xl p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
            <button onClick={() => leaveRoom(code)} className="p-3 bg-slate-950 border border-slate-800 rounded-full hover:border-orange-500 transition-colors flex-shrink-0" title="Leave Room">
              <Icons.ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
            </button>
            <div className="truncate">
              <span className="text-[8px] font-black text-orange-500 uppercase tracking-[0.4em] block mb-1">Sector Control</span>
              <h1 className="text-xl sm:text-3xl font-black tracking-tighter italic text-white leading-none">LOBBY // <span className="text-orange-500 font-mono tracking-widest">{room.code}</span></h1>
            </div>
          </div>

          <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-1.5 pr-6 rounded-full hover:border-orange-500/50 transition-all w-full sm:w-auto">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-500 bg-slate-900 flex-shrink-0">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.avatar || 'default'}`} className="w-full h-full object-cover" />
            </div>
            <div className="text-left truncate">
              <div className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[120px]">{me?.name}</div>
              <div className="text-[8px] font-bold text-orange-500 uppercase">Rank: ELITE</div>
            </div>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3 px-2">
              <Icons.Users className="w-5 h-5 text-orange-500" /> Neural Crew <span className="text-slate-700 font-mono">/ {room.players.length}</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {room.players.filter(p => p && p.userId).map((player) => (
                <div key={player.userId} className={clsx("p-4 rounded-2xl border-2 flex items-center gap-4 transition-all relative overflow-hidden group", player.isConnected ? "bg-slate-900/60 border-slate-800" : "bg-slate-950/40 border-transparent opacity-30 grayscale")}>
                  <div className="relative flex-shrink-0">
                    <div className={clsx("w-12 h-12 rounded-xl overflow-hidden border-2", player.isHost ? "border-orange-500 shadow-lg shadow-orange-500/20" : "border-slate-700")}><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatar || 'default'}`} className="w-full h-full object-cover" /></div>
                    {player.isHost && <div className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white p-1 rounded-md z-20 shadow-lg rotate-12"><Icons.Crown className="w-2.5 h-2.5" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white text-sm uppercase tracking-tight truncate flex items-center gap-2">
                      {player.name}
                      {player.userId === userId && <span className="text-[7px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-sm">YOU</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{player.score} pts</span>
                      </div>
                      {player.niche && (
                        <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-md text-[7px] font-black text-orange-500 uppercase tracking-wider">
                          {player.niche} ({player.difficulty || 'medium'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-slate-800 p-8 shadow-2xl flex flex-col items-center text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full" />
              
              {/* Game Selector Toggle for Host */}
              {isHost && (
                <div className="w-full flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 relative z-10">
                  <button 
                    onClick={() => setSelectedGame('brain')} 
                    className={clsx(
                      "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all", 
                      selectedGame === 'brain' ? "bg-orange-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Brain War
                  </button>
                  <button 
                    onClick={() => setSelectedGame('clicker')} 
                    className={clsx(
                      "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all", 
                      selectedGame === 'clicker' ? "bg-orange-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Tap Speed
                  </button>
                  <button 
                    onClick={() => setSelectedGame('scribble')} 
                    className={clsx(
                      "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all", 
                      selectedGame === 'scribble' ? "bg-orange-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Scribble
                  </button>
                </div>
              )}

              <div className="w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center border border-slate-800 shadow-2xl relative z-10">
                {selectedGame === 'brain' ? (
                  <Icons.Brain className="w-10 h-10 text-orange-500 animate-pulse" />
                ) : (
                  <Icons.Zap className="w-10 h-10 text-orange-500 animate-bounce" />
                )}
              </div>

              <div className="space-y-2 relative z-10">
                <h3 className="font-black text-white text-2xl italic uppercase tracking-tight">
                  {selectedGame === 'brain' ? 'BRAIN WAR' : selectedGame === 'clicker' ? 'TAP SPEED RUN' : 'SCRIBBLE SMASH'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  {isHost ? "Ready to launch?" : "Waiting for host..."}
                </p>
              </div>
              
              {selectedGame === 'brain' ? (
                /* Preferences selector for Brain War */
                <div className="w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4 text-left z-10">
                  <div className="text-[9px] font-black uppercase text-orange-500 tracking-wider">Your Game Preferences</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Category</label>
                      <select 
                        value={me?.niche || "mixed trivia"} 
                        onChange={(e) => socket?.emit('player:preferences', { code: room.code, niche: e.target.value, difficulty: me?.difficulty || 'medium' })}
                        className="w-full bg-slate-900 border border-slate-800 px-3 py-2.5 rounded-xl text-[10px] font-black text-white uppercase outline-none focus:border-orange-500"
                      >
                        <option value="mixed trivia">Mixed Trivia</option>
                        <option value="science">Science & Space</option>
                        <option value="history">History</option>
                        <option value="geography">Geography</option>
                        <option value="technology">Technology & Programming</option>
                        <option value="pop culture">Pop Culture & Movies</option>
                        <option value="literature">Literature</option>
                        <option value="sports">Sports</option>
                        <option value="art">Fine Arts</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Difficulty</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['easy', 'medium', 'hard'] as const).map(d => (
                          <button
                            key={d}
                            onClick={() => socket?.emit('player:preferences', { code: room.code, niche: me?.niche || 'mixed trivia', difficulty: d })}
                            className={clsx(
                              "py-2 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all",
                              (me?.difficulty || 'medium') === d ? "bg-orange-500 text-white font-black" : "bg-slate-900 text-slate-500 border border-slate-800 hover:border-slate-700"
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedGame === 'clicker' ? (
                /* Clicker game description */
                <div className="w-full bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-left z-10 space-y-2">
                  <div className="text-[9px] font-black uppercase text-orange-500 tracking-wider">How to Play</div>
                  <p className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">
                    Tap the button as fast as you can! The player with the highest tap count when time runs out wins the round. Warm up those fingers!
                  </p>
                </div>
              ) : (
                /* Scribble game description */
                <div className="w-full bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-left z-10 space-y-2">
                  <div className="text-[9px] font-black uppercase text-orange-500 tracking-wider">How to Play</div>
                  <p className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase">
                    One player draws using emojis, the rest guess the word! Score 100pts for guessing correctly. The drawer gets 50pts for each correct guess. Everyone takes turns drawing!
                  </p>
                </div>
              )}

              {isHost ? (
                <button 
                  onClick={() => socket?.emit('game:start', { code: room.code, gameType: selectedGame })} 
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-600/20 active:scale-95 flex items-center justify-center gap-3 relative z-10"
                >
                  <Icons.PlayCircle className="w-5 h-5" />
                  INITIATE
                </button>
              ) : (
                <div className="w-full p-6 rounded-2xl bg-slate-950/50 border border-slate-800 border-dashed relative z-10">
                  <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Awaiting Host Selection...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}