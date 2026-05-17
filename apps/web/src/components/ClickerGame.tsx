"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import clsx from "clsx";

export default function ClickerGame() {
  const { room, socket } = useSocket();
  const [status, setStatus] = useState<'starting' | 'playing' | 'result' | 'gameover'>('starting');
  const [countdown, setCountdown] = useState(3);
  const [clicks, setClicks] = useState<{ [id: string]: number }>({});
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
    setClicks(prev => ({
      ...prev,
      [socket?.id || '']: (prev[socket?.id || ''] || 0) + 1
    }));
  };

  if (status === 'starting') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-[12rem] font-black italic text-white"
        >
          {countdown}
        </motion.div>
        <h2 className="text-xl font-black text-white/40 uppercase tracking-[0.5em]">Fastest Finger Prep</h2>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-center">
        <Icons.Trophy className="w-24 h-24 text-premium mb-10" />
        <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4">
          {gameWinner} <br/> <span className="text-premium">DOMINATED</span>
        </h2>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden select-none" onClick={handleClick}>
      <div className="bg-glow top-[-200px] left-[-100px] bg-indigo-500 opacity-10" />
      
      <header className="p-10 flex justify-between items-center z-20">
        <div className="space-y-1">
          <div className="font-mono text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Time Remaining</div>
          <div className="text-5xl font-black text-white italic">{timeLeft.toFixed(1)}s</div>
        </div>
        
        <div className="text-right space-y-1">
          <div className="font-mono text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Pulse Count</div>
          <div className="text-5xl font-black text-indigo-500 italic">{(clicks[socket?.id || ''] || 0)}</div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <AnimatePresence mode="wait">
          {status === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="w-80 h-80 rounded-full bg-white/5 border-8 border-indigo-500/20 flex items-center justify-center relative group active:scale-95 transition-transform">
                <div className="absolute inset-0 bg-indigo-500/10 blur-[100px] rounded-full group-active:bg-indigo-500/30" />
                <Icons.Zap className="w-24 h-24 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">CLICK LIKE CRAZY!</h3>
                <p className="text-white/20 font-mono text-[10px] uppercase tracking-widest">Maximum throughput required</p>
              </div>
            </motion.div>
          )}

          {status === 'result' && (
            <motion.div 
              key="result"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-xl px-10 z-30"
            >
              <div className="premium-card p-12 text-center">
                <h2 className="text-4xl font-black text-white mb-8 italic tracking-tighter uppercase">Pulse Results</h2>
                <div className="space-y-4">
                  {Object.entries(clicks).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([id, count], i) => (
                    <div key={id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <span className="text-indigo-500 font-black italic">{i+1}</span>
                        <span className="text-white font-black uppercase text-sm">{room?.players.find(p => p.id === id)?.name}</span>
                      </div>
                      <span className="text-white/60 font-mono font-black">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Click feedback particles could go here */}
    </div>
  );
}
