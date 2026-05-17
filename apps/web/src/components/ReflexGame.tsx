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

  if (!isMounted) return <div className="h-screen bg-slate-50" />;

  if (status === 'starting') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-12 overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/50 rounded-full blur-[120px]" />
        <motion.div 
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-orange-500 blur-[80px] opacity-20 rounded-full" />
          <span className="text-[12rem] font-black italic text-orange-500 leading-none relative z-10">{countdown}</span>
        </motion.div>
        <div className="mt-12 space-y-4 text-center z-10">
            <h2 className="text-xl font-black text-slate-400 uppercase tracking-[0.5em]">Syncing Game Logic</h2>
            <p className="text-orange-500 font-mono text-xs uppercase tracking-widest font-bold">Get ready to react!</p>
        </div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-12 text-center relative overflow-hidden">
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-400/20 rounded-full blur-[150px] pointer-events-none" />
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/80 backdrop-blur-2xl p-16 max-w-2xl w-full border border-white rounded-[2rem] shadow-2xl shadow-orange-500/10 z-10"
        >
            <Icons.Trophy className="w-24 h-24 text-orange-500 mx-auto mb-10 drop-shadow-xl" />
            <h2 className="text-6xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">
              {gameWinner} <br/> <span className="text-orange-500">WINS!</span>
            </h2>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.4em]">Match concluded</p>
            <button onClick={() => window.location.reload()} className="mt-8 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95">Back to Lobby</button>
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
        status === 'GO' ? "bg-orange-50" : "bg-slate-50"
      )}
    >
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-200/40 rounded-full blur-[120px] pointer-events-none" />
      
      {/* HUD Header */}
      <header className="p-8 sm:p-10 flex justify-between items-center z-20 relative pointer-events-none">
        <div className="space-y-1">
          <div className="font-mono text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Current Phase</div>
          <div className="text-4xl font-black text-slate-900 italic">ROUND {round}</div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="font-mono text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Lives Remaining</div>
          <div className="flex gap-2 sm:gap-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={clsx(
                  "w-10 sm:w-14 h-4 rounded-md skew-x-[-25deg] transition-all duration-500",
                  i <= myLives ? "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-slate-200"
                )} 
              />
            ))}
          </div>
        </div>
      </header>

      {/* Arena Center - ONLY THIS AREA CLICKS */}
      <div 
        className="flex-1 flex flex-col items-center justify-center relative cursor-pointer"
        onClick={handleTap}
      >
        <AnimatePresence mode="wait">
          {status === 'waiting' && (
            <motion.div 
              key="waiting"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="flex flex-col items-center gap-12 sm:gap-16"
            >
              <div className="relative pointer-events-none">
                <div className="absolute inset-[-60px] bg-orange-500/20 blur-[80px] rounded-full animate-pulse" />
                <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-[4rem] bg-white/50 border border-white flex items-center justify-center relative backdrop-blur-xl shadow-2xl shadow-orange-500/5">
                   <Icons.Eye className="w-20 h-20 sm:w-24 sm:h-24 text-orange-400 animate-pulse" />
                   <div className="absolute inset-0 border-[3px] border-orange-500/30 rounded-[4rem] animate-[ping_3s_infinite]" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-4xl sm:text-5xl font-black text-slate-900 uppercase tracking-tighter italic">WAIT FOR IT...</h3>
                <div className="flex justify-center gap-2">
                   {[1,2,3].map(i => <div key={i} className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
              </div>
            </motion.div>
          )}

          {status === 'GO' && (
            <motion.div 
              key="GO"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center z-30 pointer-events-none"
            >
              <div className="text-[12rem] sm:text-[18rem] font-black text-orange-600 italic tracking-tighter leading-none select-none drop-shadow-2xl">
                TAP!
              </div>
            </motion.div>
          )}

          {status === 'result' && (
            <motion.div 
              key="result"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-xl px-6 sm:px-10 pointer-events-none"
            >
              <div className="bg-white/90 backdrop-blur-2xl border border-white p-8 sm:p-12 relative overflow-hidden text-center rounded-[2rem] shadow-2xl shadow-slate-200/50">
                <div className="space-y-6 sm:space-y-8 relative z-10">
                  <div className="font-mono text-[10px] font-black text-orange-500 uppercase tracking-[0.5em]">Round Result</div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="text-4xl sm:text-6xl font-black text-slate-900 italic tracking-tighter">{winner ? winner : "TOO SLOW"}</div>
                    <div className="text-slate-400 font-mono text-[10px] sm:text-xs uppercase tracking-[0.4em] font-bold">{winner ? "WON THE ROUND" : "EVERYONE LOSES LIVES"}</div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 3, ease: "linear" }}
                      className="h-full bg-orange-500 shadow-[0_0_15px_#f97316]"
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-300 uppercase tracking-widest italic">Preparing next round...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Eliminated HUD */}
      {isEliminated && (
        <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-sm pointer-events-none flex items-start justify-center pt-32 sm:pt-48">
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-red-500 border border-red-400 px-8 py-3 sm:px-12 sm:py-4 rounded-2xl shadow-[0_0_40px_#ef4444]"
           >
              <span className="text-white font-black text-3xl sm:text-4xl italic uppercase tracking-tighter">ELIMINATED</span>
           </motion.div>
        </div>
      )}

      {/* Emotes Section - No longer triggers handleTap! */}
      <footer className="p-6 sm:p-12 flex justify-center items-center gap-4 sm:gap-8 z-50 relative pointer-events-auto">
        {['Flame', 'Zap', 'Ghost', 'Sword', 'Shield'].map((iconName, idx) => (
          <button 
            key={iconName}
            onClick={(e) => { e.stopPropagation(); /* Send emote to chat or room */ }}
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition-all flex items-center justify-center group active:scale-90"
          >
            <DynamicIcon name={iconName} className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 group-hover:text-orange-500 transition-colors" />
          </button>
        ))}
      </footer>
    </motion.div>
  );
}