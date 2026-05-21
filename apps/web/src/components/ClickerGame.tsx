"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import clsx from "clsx";

export default function ClickerGame() {
  const { room, socket, userId } = useSocket();
  const [status, setStatus] = useState<'starting' | 'playing' | 'result' | 'gameover'>('starting');
  const [countdown, setCountdown] = useState(3);
  const [clicks, setClicks] = useState<{ [id: string]: number }>({}); // userId -> clicks
  const [winner, setWinner] = useState<string | null>(null);
  const [gameWinner, setGameWinner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.on('clicker:starting', ({ countdown }) => {
      setStatus('starting');
      setCountdown(countdown);
    });

    socket.on('clicker:go', ({ duration }) => {
      setStatus('playing');
      setTimeLeft(duration / 1000);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    });

    socket.on('clicker:results', ({ clicks, winner }) => {
      setStatus('result');
      setClicks(clicks);
      setWinner(winner);
    });

    socket.on('clicker:gameover', ({ winner }) => {
      setStatus('gameover');
      setGameWinner(winner);
    });

    return () => {
      socket.off('clicker:starting');
      socket.off('clicker:go');
      socket.off('clicker:results');
      socket.off('clicker:gameover');
    };
  }, [socket]);

  const handleClick = () => {
    if (status !== 'playing') return;
    socket?.emit('game:input', { code: room?.code, data: {} });
    if (userId) {
      setClicks(prev => ({
        ...prev,
        [userId]: (prev[userId] || 0) + 1
      }));
    }
  };

  if (status === 'starting') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 font-body p-12 overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-[8rem] sm:text-[12rem] font-black italic text-orange-500 tracking-tighter drop-shadow-2xl relative z-10"
        >
          {countdown}
        </motion.div>
        <div className="mt-12 space-y-4 text-center z-10">
          <h2 className="text-xl font-black text-slate-500 uppercase tracking-[0.5em]">Tension Protocol</h2>
          <p className="text-orange-500 font-mono text-xs uppercase tracking-widest font-bold">Warm up your fingers!</p>
        </div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 font-body p-12 text-center relative overflow-hidden">
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none" />
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-900/40 backdrop-blur-2xl p-16 max-w-2xl w-full border border-slate-800 rounded-[3rem] shadow-2xl z-10"
        >
            <Icons.Zap className="w-24 h-24 text-orange-500 mx-auto mb-10 drop-shadow-xl animate-pulse" />
            <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4">
              {gameWinner} <br/> <span className="text-orange-500">DOMINATED!</span>
            </h2>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.4em]">Throughput maximum</p>
            <button onClick={() => window.location.reload()} className="mt-8 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 transition-all active:scale-95">Back to Lobby</button>
        </motion.div>
      </div>
    );
  }

  const myClicks = userId ? clicks[userId] || 0 : 0;

  return (
    <div className="h-screen flex flex-col bg-slate-950 font-body relative overflow-hidden select-none" onClick={handleClick}>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <header className="p-10 flex justify-between items-center z-20 relative pointer-events-none">
        <div className="space-y-1">
          <div className="font-mono text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Time Remaining</div>
          <div className={clsx("text-5xl font-black italic tracking-tight transition-colors", timeLeft < 3 ? "text-red-500 animate-pulse" : "text-white")}>
            {timeLeft.toFixed(1)}s
          </div>
        </div>
        
        <div className="text-right space-y-1">
          <div className="font-mono text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Pulse Throughput</div>
          <div className="text-5xl font-black text-orange-500 italic tracking-tight">{myClicks}</div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative cursor-pointer group">
        <AnimatePresence mode="wait">
          {status === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-12 sm:gap-16"
            >
              <div className="relative group-active:scale-90 transition-transform">
                <div className="absolute inset-[-60px] bg-orange-500/10 blur-[80px] rounded-full group-active:bg-orange-500/20" />
                <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-slate-900 border-8 border-slate-800 flex items-center justify-center relative shadow-2xl group-active:border-orange-500/30">
                   <Icons.Zap className="w-24 h-24 text-orange-500 animate-pulse" />
                   <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full animate-ping" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter italic">CLICK LIKE CRAZY!</h3>
                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">Neural link saturation: CRITICAL</p>
              </div>
            </motion.div>
          )}

          {status === 'result' && (
            <motion.div 
              key="result"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-xl px-10 z-30 pointer-events-none"
            >
              <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-12 rounded-[3rem] shadow-2xl text-center space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
                
                <div className="space-y-2 relative z-10">
                  <div className="text-orange-500 font-black uppercase tracking-[0.4em] text-[10px]">Session Analytics</div>
                  <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase">Pulse Results</h2>
                </div>

                <div className="space-y-3 relative z-10">
                  {Object.entries(clicks).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([uid, count], i) => {
                    const p = room?.players.find(rp => rp.userId === uid);
                    return (
                      <div key={uid} className={clsx("flex justify-between items-center p-5 rounded-2xl border transition-all", uid === userId ? "bg-orange-500/10 border-orange-500/30 shadow-lg" : "bg-slate-950/50 border-slate-800")}>
                        <div className="flex items-center gap-4">
                          <span className={clsx("font-black italic text-xl", i === 0 ? "text-orange-500" : "text-slate-700")}>{i+1}</span>
                          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-800">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p?.avatar}`} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-white font-black uppercase text-sm tracking-tight">{p?.name || 'LEGEND'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest">Pulses</span>
                           <span className="text-orange-500 font-mono font-black text-lg">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest animate-pulse relative z-10">Refreshing systems for next round...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
