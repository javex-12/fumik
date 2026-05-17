"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";

export default function BrainGame() {
  const { room, socket } = useSocket();
  const [status, setStatus] = useState<'starting' | 'playing' | 'reveal' | 'gameover'>('starting');
  const [countdown, setCountdown] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [round, setRound] = useState(1);
  const [total, setTotal] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<any>({});
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
      const timer = setTimeout(() => setTimeLeft(timeLeft - 0.1), 100);
      return () => clearTimeout(timer);
    }
  }, [status, timeLeft]);

  const handleAnswer = (index: number) => {
    if (status !== 'playing' || selectedAnswer !== null) return;
    setSelectedAnswer(index);
    socket?.emit('brain:answer', { code: room?.code, questionId: currentQuestion.id, answerIndex: index });
  };

  if (status === 'starting') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <h2 className="text-8xl font-display text-accent2 animate-bounce">{countdown}</h2>
        <p className="text-2xl font-mono uppercase tracking-widest text-secondary">Sharpen your brain!</p>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <h2 className="text-7xl font-display text-accent3 shadow-neon3 p-4 border-4 border-accent3">BRAIN WAR OVER!</h2>
        <p className="text-xl text-secondary">Returning to lobby...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="font-mono text-xs uppercase tracking-widest text-secondary">Round {round} of {total}</div>
          <div className="font-display text-3xl text-accent2">{currentQuestion?.category}</div>
        </div>
        <div className="font-mono text-4xl text-accent1">{Math.ceil(timeLeft)}s</div>
      </div>

      {/* Timer Bar */}
      <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border-2 border-white/20">
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / 10) * 100}%` }}
          className="h-full bg-accent1 shadow-neon1"
        />
      </div>

      {/* Question */}
      <div className="neon-card border-white/50 bg-black/40 backdrop-blur-md p-10 flex flex-col items-center justify-center min-h-[200px]">
        <h2 className="text-4xl md:text-5xl font-display text-center leading-tight">
          {currentQuestion?.question}
        </h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQuestion?.options.map((option: string, index: number) => {
          let btnClass = "btn-neon text-2xl py-8 transition-all relative overflow-hidden";
          let colorClass = index === 0 ? "btn-accent1" : index === 1 ? "btn-accent2" : index === 2 ? "btn-accent3" : "btn-accent4";
          
          if (status === 'reveal') {
            if (index === correctIndex) colorClass = "bg-green-500 border-green-400 text-white shadow-[0_0_30px_#22c55e]";
            else if (index === selectedAnswer) colorClass = "bg-red-500 border-red-400 opacity-50";
            else colorClass = "opacity-20 grayscale";
          } else if (selectedAnswer === index) {
            colorClass = "border-white bg-white text-black scale-95 shadow-none";
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={status !== 'playing' || selectedAnswer !== null}
              className={`${btnClass} ${colorClass}`}
            >
              {option}
              
              {/* Avatars of players who chose this */}
              <div className="absolute bottom-2 right-2 flex -space-x-2">
                {Object.entries(playerAnswers).map(([pid, ans]: [string, any]) => (
                  ans.answerIndex === index && (
                    <span key={pid} className="text-xl filter drop-shadow-md">
                      {room?.players.find(p => p.id === pid)?.avatar}
                    </span>
                  )
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
