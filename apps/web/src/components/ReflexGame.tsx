"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import clsx from "clsx";

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.User;
  return <IconComponent className={className} />;
};

export default function ReflexGame() {
  const { room, socket } = useSocket();
  const [isMounted, setIsMounted] = useState(false);
  const [status, setStatus] = useState<'starting' | 'waiting' | 'GO' | 'result' | 'gameover'>('starting');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState<{ [id: string]: number }>({});
  const [winner, setWinner] = useState<string | null>(null);
  const [gameWinner, setGameWinner] = useState<string | null>(null);
  const [isEliminated, setIsEliminated] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!socket) return;

    socket.on('reflex:starting', ({ countdown }) => {
      setStatus('starting');
      setCountdown(countdown);
    });

    socket.on('reflex:waiting', ({ round }) => {
      setStatus('waiting');
      setRound(round);
      setWinner(null);
    });

    socket.on('reflex:GO', () => {
      setStatus('GO');
    });

    socket.on('reflex:result', ({ lives, winner, eliminated }) => {
      setStatus('result');
      setLives(lives);
      setWinner(winner);
      if (socket.id && eliminated.includes(socket.id)) {
        setIsEliminated(true);
      }
    });

    socket.on('reflex:gameover', ({ winner }) => {
      setStatus('gameover');
      setGameWinner(winner);
    });

    socket.on('reflex:penalty', ({ playerId }) => {
      if (socket.id === playerId) {
        setShowPenalty(true);
        setTimeout(() => setShowPenalty(false), 500);
      }
    });

    return () => {
      socket.off('reflex:starting');
      socket.off('reflex:waiting');
      socket.off('reflex:GO');
      socket.off('reflex:result');
      socket.off('reflex:gameover');
      socket.off('reflex:penalty');
    };
  }, [socket]);

  const handleTap = () => {
    if (status === 'gameover' || isEliminated) return;
    socket?.emit('reflex:tap', { code: room?.code });
  };

  if (!isMounted) return <div className="h-screen bg-background" />;

  if (status === 'starting') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-12 overflow-hidden">
        <div className="bg-glow top-[-100px] left-[-100px] bg-indigo-500 opacity-20" />
        <motion.div 
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-20 rounded-full" />
          <span className="text-[12rem] font-black italic text-white leading-none relative z-10">{countdown}</span>
        </motion.div>
        <div className="mt-12 space-y-4 text-center">
            <h2 className="text-xl font-black text-white/40 uppercase tracking-[0.5em]">Syncing Reaction Matrix</h2>
            <p className="text-indigo-400 font-mono text-xs uppercase tracking-widest font-bold">Prepare for High-Speed Engagement</p>
        </div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-12 text-center relative overflow-hidden">
        <div className="bg-glow bg-premium opacity-10 blur-[150px]" />
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="premium-card p-16 max-w-2xl w-full border-premium/20"
        >
            <Icons.Trophy className="w-24 h-24 text-premium mx-auto mb-10 shadow-[0_0_40px_rgba(245,158,11,0.3)]" />
            <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4">
              {gameWinner} <br/> <span className="text-premium">VICTORIOUS</span>
            </h2>
            <p className="text-white/30 font-mono text-xs uppercase tracking-[0.4em]">Arena Sequence Terminated</p>
        </motion.div>
      </div>
    );
  }

  const myLives = socket?.id ? lives[socket.id] !== undefined ? lives[socket.id] : 3 : 3;

  return (
    <motion.div 
      animate={showPenalty ? { x: [-10, 10, -10, 10, 0] } : {}}
      className={clsx(
        "h-screen flex flex-col relative transition-all duration-75 overflow-hidden",
        status === 'GO' ? "bg-white" : "bg-background"
      )}
      onClick={handleTap}
    >
      <div className="bg-glow top-[-200px] left-[-100px] bg-indigo-500 opacity-10" />
      
      {/* HUD Header */}
      <header className="p-10 flex justify-between items-center z-20 relative">
        <div className="space-y-1">
          <div className="font-mono text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Combat Phase</div>
          <div className="text-4xl font-black text-white italic">ROUND 0{round}</div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="font-mono text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Structural Integrity</div>
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={clsx(
                  "w-14 h-4 rounded-md skew-x-[-25deg] transition-all duration-500",
                  i <= myLives ? "bg-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.5)]" : "bg-white/5 border border-white/5"
                )} 
              />
            ))}
          </div>
        </div>
      </header>

      {/* Arena Center */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <AnimatePresence mode="wait">
          {status === 'waiting' && (
            <motion.div 
              key="waiting"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="flex flex-col items-center gap-16"
            >
              <div className="relative">
                <div className="absolute inset-[-60px] bg-indigo-500/10 blur-[100px] rounded-full animate-pulse" />
                <div className="w-80 h-80 rounded-[4rem] bg-white/5 border border-white/10 flex items-center justify-center relative backdrop-blur-3xl">
                   <Icons.Eye className="w-24 h-24 text-white/10 animate-pulse" />
                   <div className="absolute inset-0 border-[2px] border-indigo-500/20 rounded-[4rem] animate-[ping_4s_infinite]" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-5xl font-black text-white uppercase tracking-tighter italic">WATCH THE LINK</h3>
                <div className="flex justify-center gap-2">
                   {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
              </div>
            </motion.div>
          )}

          {status === 'GO' && (
            <motion.div 
              key="GO"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center z-30"
            >
              <div className="text-[18rem] font-black text-black italic tracking-tighter leading-none select-none drop-shadow-2xl">
                HIT!
              </div>
            </motion.div>
          )}

          {status === 'result' && (
            <motion.div 
              key="result"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-xl px-10"
            >
              <div className="premium-card p-12 relative overflow-hidden text-center">
                <div className="animate-shimmer opacity-10" />
                <div className="space-y-8 relative z-10">
                  <div className="font-mono text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em]">Data Collected</div>
                  <div className="space-y-3">
                    <div className="text-6xl font-black text-white italic tracking-tighter">{winner ? winner : "LINK FAILURE"}</div>
                    <div className="text-white/30 font-mono text-xs uppercase tracking-[0.4em] font-bold">{winner ? "OPTIMAL PERFORMANCE" : "ALL UNITS DEPRECATED"}</div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 3, ease: "linear" }}
                      className="h-full bg-indigo-500 shadow-[0_0_20px_#6366f1]"
                    />
                  </div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest italic">Syncing next protocol iteration...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Eliminated HUD */}
      {isEliminated && (
        <div className="absolute inset-0 z-40 bg-rose-950/20 backdrop-grayscale pointer-events-none flex items-start justify-center pt-48">
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-rose-600 px-12 py-4 rounded-xl shadow-[0_0_50px_#e11d48]"
           >
              <span className="text-white font-black text-4xl italic uppercase tracking-tighter">ELIMINATED</span>
           </motion.div>
        </div>
      )}

      {/* Emotes Section */}
      <footer className="p-12 flex justify-center items-center gap-8 z-50 relative">
        {['Flame', 'Zap', 'Ghost', 'Sword', 'Shield'].map((iconName, idx) => (
          <button 
            key={iconName}
            className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all flex items-center justify-center group active:scale-90"
          >
            <DynamicIcon name={iconName} className="w-8 h-8 text-white/20 group-hover:text-indigo-400 transition-colors" />
          </button>
        ))}
      </footer>
    </motion.div>
  );
}