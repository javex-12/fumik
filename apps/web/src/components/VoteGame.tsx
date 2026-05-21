"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function VoteGame() {
  const { room, socket } = useSocket();
  const [status, setStatus] = useState<'starting' | 'playing' | 'reveal' | 'gameover'>('starting');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [round, setRound] = useState(1);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [votes, setVotes] = useState<any>({});
  const [majority, setMajority] = useState<string | null>(null);
  const [lives, setLives] = useState<{ [id: string]: number }>({});
  const [isEliminated, setIsEliminated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (!socket) return;

    socket.on('vote:starting', () => setStatus('starting'));
    
    socket.on('vote:question', ({ question, round }) => {
      setStatus('playing');
      setCurrentQuestion(question);
      setRound(round);
      setSelectedOption(null);
      setMajority(null);
      setVotes({});
      setTimeLeft(10);
    });

    socket.on('vote:reveal', ({ votes, majority, lives, eliminated }) => {
      setStatus('reveal');
      setVotes(votes);
      setMajority(majority);
      setLives(lives);
      if (socket.id && eliminated.includes(socket.id)) setIsEliminated(true);
    });

    socket.on('vote:gameover', () => setStatus('gameover'));

    return () => {
      socket.off('vote:starting');
      socket.off('vote:question');
      socket.off('vote:reveal');
      socket.off('vote:gameover');
    };
  }, [socket]);

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [status, timeLeft]);

  const handleVote = (option: 'A' | 'B') => {
    if (status !== 'playing' || selectedOption !== null) return;
    setSelectedOption(option);
    socket?.emit('vote:choice', { code: room?.code, option });
  };

  if (status === 'starting') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-12 overflow-hidden relative font-body">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-8 relative z-10"
        >
          <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
            <span className="text-4xl">🗳️</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black italic text-orange-500 tracking-tighter animate-bounce uppercase">VOTE OR DIE!</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">Aggregating Consensus...</p>
        </motion.div>
      </div>
    );
  }

  const myLives = socket?.id ? lives[socket.id] || 3 : 3;

  return (
    <div className={clsx(
      "h-full flex flex-col p-6 md:p-12 transition-all duration-300 font-body relative overflow-y-auto",
      status === 'reveal' && majority === 'NONE' ? "bg-red-950/20" : "bg-slate-950"
    )}>
      {/* Header */}
      <header className="flex justify-between items-center bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl mb-8">
        <div className="space-y-1">
          <div className="text-orange-500 font-black uppercase tracking-[0.4em] text-[10px]">Session Phase</div>
          <div className="text-3xl font-black italic text-white uppercase tracking-tight">ROUND {round}</div>
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <div className="font-mono text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Vitality</div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={clsx(
                  "w-8 sm:w-12 h-2 rounded-full skew-x-[-25deg] transition-all duration-500",
                  i <= myLives ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "bg-slate-800"
                )} 
              />
            ))}
          </div>
        </div>

        <div className="text-right">
           <div className="text-slate-500 font-black uppercase tracking-widest text-[8px]">Decision Window</div>
           <div className={clsx("text-4xl font-mono font-bold tracking-tighter transition-colors", timeLeft < 3 ? "text-red-500 animate-pulse" : "text-white")}>
             {timeLeft}s
           </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-12 py-8">
        <div className="relative group max-w-4xl w-full">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-[3rem] blur opacity-10" />
          <div className="relative bg-slate-900 border border-slate-800 p-10 md:p-16 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center min-h-[200px] text-center overflow-hidden">
            <h2 className="text-3xl md:text-5xl font-black italic leading-tight text-white uppercase tracking-tight">
              {currentQuestion?.q}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
          {['A', 'B'].map((opt) => {
            const isSelected = selectedOption === opt;
            const isMajority = majority === opt;
            const isMinority = majority !== 'NONE' && majority !== opt;
            const isSplit = majority === 'NONE';

            let stateClass = "bg-slate-900 border-slate-800 text-slate-400 hover:border-orange-500/50 hover:bg-slate-800 hover:text-white";
            
            if (status === 'reveal') {
              if (isMajority) stateClass = "bg-green-600 border-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.3)] scale-105 z-10";
              else if (isMinority || isSplit) stateClass = "bg-red-600 border-red-500 text-white opacity-40 grayscale animate-pulse";
            } else if (isSelected) {
              stateClass = "bg-orange-600 border-orange-500 text-white shadow-xl scale-95";
            }

            return (
              <button
                key={opt}
                onClick={() => handleVote(opt as 'A' | 'B')}
                disabled={status !== 'playing' || selectedOption !== null}
                className={clsx("relative p-10 rounded-[2rem] border-2 text-xl md:text-2xl font-black italic text-center transition-all duration-300 group overflow-hidden uppercase tracking-tight", stateClass)}
              >
                <div className="relative z-10">{opt === 'A' ? currentQuestion?.a : currentQuestion?.b}</div>
                
                {/* Voting Avatars */}
                <div className="absolute bottom-4 right-4 flex -space-x-3 overflow-hidden p-1">
                  {Object.entries(votes).map(([pid, v]: [string, any]) => {
                    const p = room?.players.find(rp => rp.id === pid);
                    return v === opt && (
                      <div key={pid} className="w-10 h-10 rounded-xl border-2 border-slate-950 bg-slate-900 overflow-hidden shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p?.avatar}`} className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {status === 'reveal' && majority === 'NONE' && (
          <motion.div 
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 p-4"
          >
            <h1 className="text-6xl md:text-9xl font-black text-red-500 drop-shadow-[0_0_30px_red] -rotate-12 text-center uppercase tracking-tighter">CHAOS ROUND!</h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
