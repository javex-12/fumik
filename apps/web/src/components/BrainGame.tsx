"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function BrainGame() {
  const { room, socket, userId } = useSocket();
  const [status, setStatus] = useState<'starting' | 'playing' | 'reveal' | 'gameover'>('starting');
  const [countdown, setCountdown] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [round, setRound] = useState(1);
  const [total, setTotal] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<any>({}); // userId -> { answerIndex, isCorrect, timeTaken }
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (!socket) return;

    socket.on('brain:starting', ({ countdown }) => {
      setStatus('starting');
      setCountdown(countdown);
    });

    socket.on('brain:question', ({ question, round, total }) => {
      setStatus('playing');
      setCurrentQuestion(question);
      setRound(round);
      setTotal(total);
      setSelectedAnswer(null);
      setCorrectIndex(null);
      setPlayerAnswers({});
      setTimeLeft(10);
    });

    socket.on('brain:reveal', ({ correctIndex, playerAnswers, scores }) => {
      setStatus('reveal');
      setCorrectIndex(correctIndex);
      setPlayerAnswers(playerAnswers);
    });

    socket.on('brain:gameover', ({ finalScores }) => {
      setStatus('gameover');
    });

    return () => {
      socket.off('brain:starting');
      socket.off('brain:question');
      socket.off('brain:reveal');
      socket.off('brain:gameover');
    };
  }, [socket]);

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => Math.max(0, prev - 0.1)), 100);
      return () => clearTimeout(timer);
    }
  }, [status, timeLeft]);

  const handleAnswer = (index: number) => {
    if (status !== 'playing' || selectedAnswer !== null) return;
    setSelectedAnswer(index);
    socket?.emit('game:input', { code: room?.code, data: { questionId: currentQuestion.id, answerIndex: index } });
  };

  if (status === 'starting') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 font-body p-12 overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-8 relative z-10"
        >
          <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
            <span className="text-4xl">🧠</span>
          </div>
          <h2 className="text-8xl font-black italic text-orange-500 tracking-tighter animate-pulse">{countdown}</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">Generating Neural Pathways...</p>
        </motion.div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 font-body p-12 text-center relative overflow-hidden">
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-900/40 backdrop-blur-2xl p-16 max-w-2xl w-full border border-slate-800 rounded-[3rem] shadow-2xl z-10 space-y-8"
        >
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">BRAIN WAR OVER</h2>
            <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Uploading collective intelligence...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-950 text-white font-body p-4 sm:p-6 md:p-12 overflow-y-auto scrollbar-hide flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-6 md:space-y-12">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="space-y-1 text-center sm:text-left">
             <div className="text-orange-500 font-black uppercase tracking-[0.4em] text-[10px]">Neural Protocol</div>
             <div className="text-2xl sm:text-3xl font-black italic text-white uppercase tracking-tight">{currentQuestion?.category || 'MIXED TRIVIA'}</div>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
             <div className="text-right">
                <div className="text-slate-500 font-black uppercase tracking-widest text-[8px]">Time</div>
                <div className={clsx("text-3xl md:text-4xl font-mono font-bold tracking-tighter transition-colors", timeLeft < 3 ? "text-red-500 animate-pulse" : "text-white")}>
                  {Math.ceil(timeLeft)}s
                </div>
             </div>
             <div className="h-10 md:h-12 w-px bg-slate-800" />
             <div className="text-left">
                <div className="text-slate-500 font-black uppercase tracking-widest text-[8px]">Phase</div>
                <div className="text-2xl md:text-3xl font-black italic text-white">{round}<span className="text-slate-700 mx-1">/</span>{total}</div>
             </div>
          </div>
        </header>

        <div className="relative group w-full">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-[2.5rem] md:rounded-[3rem] blur opacity-10" />
          <div className="relative bg-slate-900 border border-slate-800 p-8 md:p-20 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col items-center justify-center min-h-[200px] md:min-h-[300px] text-center overflow-hidden">
            <h2 className="text-2xl md:text-5xl font-black italic leading-tight text-white relative z-10 uppercase tracking-tight">
              {currentQuestion?.question}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-12">
          {currentQuestion?.options.map((option: string, index: number) => {
            let stateClass = "bg-slate-900 border-slate-800 text-slate-400 hover:border-orange-500/50 hover:bg-slate-800 hover:text-white";
            
            if (status === 'reveal') {
              if (index === correctIndex) stateClass = "bg-green-600 border-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.3)] scale-105 z-10";
              else if (index === selectedAnswer) stateClass = "bg-red-600 border-red-500 text-white opacity-40 grayscale";
              else stateClass = "bg-slate-950 border-slate-900 text-slate-700 opacity-20";
            } else if (selectedAnswer === index) {
              stateClass = "bg-orange-600 border-orange-500 text-white shadow-xl scale-95";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={status !== 'playing' || selectedAnswer !== null}
                className={clsx("relative p-8 rounded-[2rem] border-2 text-xl font-black italic text-center transition-all duration-300 group overflow-hidden uppercase tracking-tight", stateClass)}
              >
                <div className="relative z-10">{option}</div>
                
                {/* Players who chose this */}
                <div className="absolute bottom-4 right-4 flex -space-x-3 overflow-hidden p-1">
                  {Object.entries(playerAnswers).map(([uid, ans]: [string, any]) => {
                    const p = room?.players.find(rp => rp.userId === uid);
                    return ans.answerIndex === index && (
                      <div key={uid} className="w-10 h-10 rounded-xl border-2 border-slate-950 bg-slate-900 overflow-hidden shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
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
    </div>
  );
}
