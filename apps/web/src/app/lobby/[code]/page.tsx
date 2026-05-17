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
  const { room, socket, isConnected, error } = useSocket();
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
    <>
      <div className="min-h-screen bg-white">{gameView}</div>
      <CommunicationSuite />
    </>
  );

  const isHost = room.players.find(p => p.id === socket?.id)?.isHost;
  const me = room.players.find(p => p.id === socket?.id);
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen bg-background bg-dot-pattern text-slate-900 p-4 md:p-12 font-body relative">
      <CommunicationSuite />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="premium-card p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] block mb-1">Game Lobby</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-none italic">LOBBY</h1>
            </div>
            <div className="h-12 w-px bg-slate-100 hidden md:block" />
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-1">Link Code</span>
              <div className="text-3xl md:text-4xl font-mono font-bold text-slate-900 tracking-wider">{room.code}</div>
            </div>
          </div>

          <button 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-4 p-2 pr-6 bg-slate-50 border border-slate-100 rounded-full hover:bg-white transition-all shadow-sm active:scale-95"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary bg-white">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.avatar || 'default'}`} alt="Me" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-900 truncate max-w-[100px]">{me?.name}</div>
              <div className="text-[8px] font-black text-primary uppercase tracking-widest">Level {Math.floor((me?.score || 0) / 100) + 1}</div>
            </div>
            <Icons.Settings className="w-4 h-4 text-slate-300" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
              <Icons.Users className="w-4 h-4" /> Players ({room.players.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {room.players.map((player) => (
                <div key={player.id} className={clsx("p-6 rounded-2xl border-2 flex items-center gap-5 transition-all bg-white relative overflow-hidden shadow-sm", player.isConnected ? "border-slate-50" : "border-transparent opacity-40")}>
                  <div className={clsx("w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 bg-slate-50", player.isHost ? "border-orange-100" : "border-slate-50")}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatar || 'default'}`} alt={player.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 text-lg flex items-center gap-2">{player.name} {player.isHost && <Icons.Crown className="w-3 h-3 text-primary" />}</div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RANK {Math.floor(player.score / 500) + 1}</span>
                       <div className="w-1 h-1 rounded-full bg-slate-200" />
                       <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{player.score} PTS</span>
                    </div>
                  </div>
                  {player.isConnected && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-400" />}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="premium-card p-8 space-y-8">
              <div className="text-center space-y-2">
                <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Game Center</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{isHost ? "Select a game to start!" : "Waiting for the host..."}</p>
              </div>
              {isHost && (
                <div className="space-y-3">
                  <button onClick={() => setShowGameList(!showGameList)} className="btn-primary w-full py-5">Select Mission</button>
                  <AnimatePresence>
                    {showGameList && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 gap-2 pt-2 overflow-hidden">
                        {Object.entries(GAME_TYPES).map(([type, name]) => (
                          <button key={type} onClick={() => socket?.emit('game:start', { code: room.code, gameType: type })} className="p-4 rounded-xl border-2 border-slate-50 hover:border-primary hover:bg-orange-50 text-left transition-all flex justify-between items-center group">
                            <span className="font-bold text-slate-600 group-hover:text-primary text-sm uppercase tracking-tight">{name}</span>
                            <Icons.ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-primary" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
