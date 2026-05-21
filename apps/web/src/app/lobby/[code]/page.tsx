"use client";

import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import { GAME_TYPES } from "@fumik/shared/constants";
import { GameType } from "@fumik/shared/types";
import ReflexGame from "@/components/ReflexGame";
import BrainGame from "@/components/BrainGame";
import BallGame from "@/components/BallGame";
import ScribbleGame from "@/components/ScribbleGame";
import VoteGame from "@/components/VoteGame";
import ClickerGame from "@/components/ClickerGame";
import MathGame from "@/components/MathGame";
import EmojiGame from "@/components/EmojiGame";
import TicTacToeGame from "@/components/TicTacToeGame";
import MemoryGame from "@/components/MemoryGame";
import GameReadyScreen from "@/components/GameReadyScreen";
import ProfileModal from "@/components/ProfileModal";
import * as Icons from "lucide-react";
import clsx from "clsx";
import { useState, useEffect, use } from "react";
import dynamic from 'next/dynamic';

const CommunicationSuite = dynamic(() => import("@/components/CommunicationSuite"), { ssr: false });

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.User;
  return <IconComponent className={className} />;
};

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { room, socket, isConnected, error, userId } = useSocket();
  const [isMounted, setIsMounted] = useState(false);
  const [showGameList, setShowGameList] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [syncAttempts, setSyncAttempts] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const triggerSync = () => {
    if (isConnected && code) {
      console.log(`📡 Manual Syncing room: ${code}`);
      socket?.emit('room:get', { code });
      setSyncAttempts(prev => prev + 1);
    }
  };

  // Auto-sync
  useEffect(() => {
    if (isConnected && !room && code && syncAttempts === 0) {
      triggerSync();
    }
  }, [isConnected, room, code, socket]);

  if (!isMounted || !room) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center font-body">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        
        <div className="space-y-6">
          <div className="text-slate-900 font-black uppercase tracking-widest text-lg">
            {!isMounted ? "Syncing..." : isConnected ? "Loading Room Data" : "Connecting to Engine..."}
          </div>
          
          <div className="space-y-4">
             <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest">
                <div className={clsx("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                <span className={isConnected ? "text-green-600" : "text-red-400"}>
                  {isConnected ? "Engine Linked" : "Offline"}
                </span>
             </div>

             {isConnected && !room && (
               <button 
                 onClick={triggerSync}
                 className="btn-primary py-3 px-6 text-xs mx-auto"
               >
                 <Icons.RefreshCw className="w-3 h-3" />
                 Manually Fetch Room
               </button>
             )}

             {!isConnected && (
               <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">
                 Checking firewall and local network...
               </p>
             )}
          </div>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="text-[10px] text-slate-300 underline font-bold"
          >
            Cancel and Return Home
          </button>
        </div>

        {error && <div className="mt-12 p-4 bg-red-50 border border-red-100 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest">{error}</div>}
      </div>
    );
  }

  const renderGame = () => {
    if (room.gameStatus === 'readying') return <GameReadyScreen />;
    if (room.gameStatus !== 'playing') return null;

    const games: Record<string, any> = {
      reflex: ReflexGame, brain: BrainGame, ball: BallGame, scribble: ScribbleGame,
      vote: VoteGame, clicker: ClickerGame, math: MathGame, emoji: EmojiGame,
      tictactoe: TicTacToeGame, memory: MemoryGame,
    };

    const GameComponent = games[room.currentGame || ''];
    return GameComponent ? <GameComponent /> : null;
  };

  const gameView = renderGame();
  if (gameView) return (
    <div className="h-screen w-screen overflow-hidden bg-white relative">
      {gameView}
      <CommunicationSuite />
    </div>
  );

  const me = room.players.find(p => p.userId === userId);
  const isHost = me?.isHost;
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  const getRankTitle = (score: number) => {
    if (score < 100) return 'Rookie';
    if (score < 500) return 'Pro';
    if (score < 1000) return 'Elite';
    return 'Legend';
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-12 font-body relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(249,115,22,0.05),transparent_50%)]" />
      <CommunicationSuite />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      
      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 lg:gap-8 bg-slate-900/40 backdrop-blur-xl p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <button onClick={() => window.location.href = '/'} className="p-3 bg-slate-950 border border-slate-800 rounded-full hover:border-orange-500 transition-colors shadow-lg active:scale-95 group" title="Leave Room">
              <Icons.ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </button>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] block">Mission Control</span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter italic text-white leading-none">LOBBY</h1>
            </div>
            <div className="h-12 w-px bg-slate-800 hidden md:block" />
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] block">Access Key</span>
              <div className="flex items-center gap-2">
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-widest font-mono bg-slate-950 px-4 sm:px-6 py-2 rounded-2xl border border-slate-800">{room.code}</div>
                <button onClick={() => { navigator.clipboard.writeText(room.code); alert('Code copied!'); }} className="p-2.5 sm:p-3 md:p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-orange-500 transition-colors active:scale-95 group" title="Copy Code">
                  <Icons.Copy className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-4 p-2 pr-8 bg-slate-950 border border-slate-800 rounded-3xl hover:border-orange-500/50 transition-all shadow-xl active:scale-95 group"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-orange-500 bg-slate-900 shadow-lg shadow-orange-500/10">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.avatar || 'default'}`} alt="Me" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white truncate max-w-[120px] uppercase tracking-tight">{me?.name}</div>
              <div className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em]">Rank: {me ? getRankTitle(me.score) : 'Loading'}</div>
            </div>
            <Icons.Settings className="w-5 h-5 text-slate-700 group-hover:text-orange-500 transition-colors ml-2" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                <Icons.Users className="w-6 h-6 text-orange-500" /> Crew <span className="text-slate-700 text-lg">/ {room.players.length}</span>
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {room.players.map((player) => (
                <div key={player.userId} className={clsx("p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] border-2 flex items-center gap-4 sm:gap-6 transition-all relative overflow-hidden group shadow-2xl", player.isConnected ? "bg-slate-900/60 border-slate-800 hover:border-orange-500/30" : "bg-slate-950/40 border-transparent opacity-30 grayscale")}>
                  <div className="relative">
                    <div className={clsx("w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2 flex-shrink-0 relative z-10", player.isHost ? "border-orange-500 shadow-lg shadow-orange-500/20" : "border-slate-700")}>
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatar || 'default'}`} alt={player.name} className="w-full h-full object-cover" />
                    </div>
                    {player.isHost && (
                      <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-orange-500 text-white p-1 sm:p-1.5 rounded-lg z-20 shadow-lg rotate-12">
                        <Icons.Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-black text-white text-base sm:text-lg md:text-xl uppercase tracking-tight flex items-center gap-2">
                      {player.name}
                      {player.userId === userId && <span className="text-[8px] sm:text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-bold">YOU</span>}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1">
                       <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank: {getRankTitle(player.score)}</span>
                       <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-800" />
                       <span className="text-[8px] sm:text-[10px] font-black text-orange-500 uppercase tracking-widest">{player.score} PTS</span>
                    </div>
                  </div>
                  {player.isConnected && (
                    <div className="flex flex-col items-center gap-1">
                       <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                       <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Live</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl sm:rounded-[3rem] border border-slate-800 p-6 sm:p-10 shadow-2xl space-y-6 sm:space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full" />
              
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-slate-800 rounded-3xl mx-auto flex items-center justify-center border border-slate-700 shadow-inner group-hover:scale-110 transition-transform">
                  <Icons.Rocket className="w-10 h-10 text-orange-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-white text-2xl italic uppercase tracking-tight">Game Center</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    {isHost ? "Choose the next mission" : "Waiting for commander"}
                  </p>
                </div>
              </div>

              {isHost ? (
                <div className="space-y-4">
                  <button 
                    onClick={() => setShowGameList(!showGameList)} 
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 sm:py-6 rounded-2xl sm:rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-600/20 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Icons.PlayCircle className="w-5 h-5" />
                    Select Mission
                  </button>
                  <AnimatePresence>
                    {showGameList && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 10 }} 
                        className="grid grid-cols-1 gap-3 pt-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide"
                      >
                        {Object.entries(GAME_TYPES).map(([type, name]) => (
                          <button 
                            key={type} 
                            onClick={() => socket?.emit('game:start', { code: room.code, gameType: type })} 
                            className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-900 text-left transition-all flex justify-between items-center group shadow-lg"
                          >
                            <span className="font-black text-slate-400 group-hover:text-white text-xs uppercase tracking-widest transition-colors">{name}</span>
                            <Icons.Zap className="w-4 h-4 text-slate-800 group-hover:text-orange-500 transition-all" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-slate-950/50 border border-slate-800 border-dashed text-center">
                   <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Awaiting Host Command...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
