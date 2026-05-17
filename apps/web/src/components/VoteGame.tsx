"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";

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
    return <div className="h-full flex items-center justify-center text-7xl font-display text-accent4 animate-bounce">VOTE OR DIE!</div>;
  }

  const myLives = socket?.id ? lives[socket.id] || 3 : 3;

  return (
    <div className={`h-full flex flex-col p-6 transition-all duration-300 ${status === 'reveal' && majority === 'NONE' ? 'bg-red-900/40' : 'bg-background'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="font-mono text-xl text-secondary">Round {round}</div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`text-4xl ${i < myLives ? 'opacity-100' : 'opacity-20 grayscale'}`}>❤️</span>
          ))}
        </div>
        <div className="font-mono text-3xl text-accent1">{timeLeft}s</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <h2 className="text-5xl md:text-7xl font-display text-center leading-tight drop-shadow-neon4">
          {currentQuestion?.q}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl h-64">
          {['A', 'B'].map((opt) => {
            const isSelected = selectedOption === opt;
            const isMajority = majority === opt;
            const isMinority = majority !== 'NONE' && majority !== opt;
            const isSplit = majority === 'NONE';

            let btnClass = "btn-neon text-3xl font-display flex flex-col items-center justify-center gap-4 relative";
            let colorClass = opt === 'A' ? "btn-accent3" : "btn-accent1";

            if (status === 'reveal') {
              if (isMajority) colorClass = "bg-green-500 border-green-400 shadow-[0_0_40px_#22c55e]";
              else if (isMinority || isSplit) colorClass = "bg-red-600 border-red-500 animate-pulse";
            } else if (isSelected) {
              colorClass = "scale-95 border-white bg-white text-black";
            }

            return (
              <button
                key={opt}
                onClick={() => handleVote(opt as 'A' | 'B')}
                disabled={status !== 'playing' || selectedOption !== null}
                className={`${btnClass} ${colorClass}`}
              >
                {opt === 'A' ? currentQuestion?.a : currentQuestion?.b}
                
                {/* Voting Avatars */}
                <div className="flex flex-wrap justify-center gap-2 absolute -bottom-12">
                  {Object.entries(votes).map(([pid, v]: [string, any]) => (
                    v === opt && (
                      <motion.span 
                        key={pid} 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }}
                        className="text-3xl"
                      >
                        {room?.players.find(p => p.id === pid)?.avatar}
                      </motion.span>
                    )
                  ))}
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
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <h1 className="text-9xl font-display text-red-500 drop-shadow-[0_0_30px_red] -rotate-12">CHAOS ROUND!</h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
