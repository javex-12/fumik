"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";

const EMOJIS = ['🦁', '🐯', '🦊', '🐺', '🦝', '🐸', '🐙', '🦄', '🐲', '🤖', '👾', '🎭', '🧙', '🦸', '🥷', '🎪', '🍕', '🍔', '🍟', '🍦', '🍩', '🍪', '🍎', '🍌', '🚗', '🚕', '🚙', '🏎️', '🏍️', '🚲', '🚀', '🛸', '⚽', '🏀', '🏈', '🎾', '🏓', '🎸', '🎹', '🎮', '🏠', '🌆', '🌋', '🌊', '🌈', '🔥', '⚡', '💣', '❤️', '🌟', '💎', '💰', '💼', '💡', '⏰', '✈️', '🌍', '🗼', '🗿', '🏝️', '🛶', '⛺'];

export default function ScribbleGame() {
  const { room, socket } = useSocket();
  const [status, setStatus] = useState<'starting' | 'playing' | 'gameover'>('starting');
  const [isDrawer, setIsDrawer] = useState(false);
  const [word, setWord] = useState("");
  const [canvas, setCanvas] = useState<any[]>([]);
  const [guess, setGuess] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [winnerInfo, setWinnerInfo] = useState<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('scribble:starting', () => setStatus('starting'));
    
    socket.on('scribble:roundStart', ({ drawerId }) => {
      setStatus('playing');
      setIsDrawer(socket.id === drawerId);
      setCanvas([]);
      setWinnerInfo(null);
      setTimeLeft(60);
    });

    socket.on('scribble:word', ({ word }) => setWord(word));
    
    socket.on('scribble:update', ({ canvas }) => setCanvas(canvas));
    
    socket.on('scribble:correct', ({ player, word }) => {
      setWinnerInfo({ player, word });
      setMessages(prev => [...prev, { type: 'system', text: `🏆 ${player} guessed the word: ${word}!` }]);
    });

    socket.on('scribble:wrong', ({ text }) => {
      setMessages(prev => [...prev, { type: 'guess', text, id: socket.id }]);
    });

    socket.on('scribble:gameover', ({ winner }) => setStatus('gameover'));

    return () => {
      socket.off('scribble:starting');
      socket.off('scribble:roundStart');
      socket.off('scribble:word');
      socket.off('scribble:update');
      socket.off('scribble:correct');
      socket.off('scribble:wrong');
      socket.off('scribble:gameover');
    };
  }, [socket]);

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [status, timeLeft]);

  const placeEmoji = (emoji: string, e: any) => {
    if (!isDrawer || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    socket?.emit('scribble:place', { code: room?.code, type: 'emoji', data: emoji, x, y });
  };

  const handleGuess = (e: any) => {
    e.preventDefault();
    if (!guess.trim()) return;
    socket?.emit('scribble:guess', { code: room?.code, text: guess });
    setGuess("");
  };

  if (status === 'starting') {
    return <div className="h-full flex items-center justify-center text-7xl font-display text-accent1 animate-bounce">SCRIBBLE SMASH!</div>;
  }

  if (status === 'gameover') {
    return <div className="h-full flex items-center justify-center text-7xl font-display text-accent4">GAME OVER!</div>;
  }

  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
      {/* Left: Tools or Stats */}
      <div className="w-full md:w-64 space-y-4">
        <div className="neon-card border-accent2 p-4 text-center">
          <div className="text-xs font-mono uppercase text-secondary">Time Left</div>
          <div className="text-4xl font-mono text-accent1">{timeLeft}s</div>
        </div>

        {isDrawer && (
          <div className="neon-card border-accent3 p-4 flex-1 overflow-y-auto max-h-[400px]">
            <h4 className="font-display text-xl mb-4 text-accent3">Stamps</h4>
            <div className="grid grid-cols-4 gap-2">
              {EMOJIS.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => {/* will be triggered by canvas click */}} 
                  className="text-2xl hover:scale-125 transition-transform p-1 bg-white/5 rounded-md"
                  onMouseDown={() => (window as any).selectedEmoji = emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col gap-4 relative">
        <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border-2 border-white/20">
          <div className="font-display text-2xl uppercase tracking-widest text-secondary">
            {isDrawer ? "You are drawing" : "Guess what they're drawing!"}
          </div>
          {isDrawer && (
            <div className="bg-accent1 text-white px-6 py-2 rounded-lg font-display text-3xl shadow-neon1 animate-glow">
              {word}
            </div>
          )}
        </div>

        <div 
          ref={canvasRef}
          onClick={(e) => {
            if (isDrawer && (window as any).selectedEmoji) {
              placeEmoji((window as any).selectedEmoji, e);
            }
          }}
          className="flex-1 bg-white rounded-2xl relative overflow-hidden cursor-crosshair shadow-inner"
        >
          {canvas.map((item, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              style={{ position: 'absolute', left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
              className="text-5xl select-none"
            >
              {item.data}
            </motion.div>
          ))}

          <AnimatePresence>
            {winnerInfo && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                className="absolute inset-0 bg-accent1/20 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center"
              >
                <div className="text-8xl mb-4 animate-bounce">🎉</div>
                <h3 className="text-6xl font-display text-white drop-shadow-lg">{winnerInfo.player} GUESSED IT!</h3>
                <p className="text-4xl font-mono uppercase tracking-widest text-accent2">Word: {winnerInfo.word}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Chat/Guesses */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="neon-card border-accent4 flex-1 flex flex-col overflow-hidden p-4">
          <h4 className="font-display text-xl mb-2 text-accent4">GUESSES</h4>
          <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-hide">
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`p-2 rounded font-mono text-sm ${m.type === 'system' ? 'bg-accent3/20 text-accent3' : 'bg-white/5 text-white'}`}
              >
                {m.type === 'system' ? m.text : `> ${m.text}`}
              </div>
            ))}
          </div>
          
          {!isDrawer && (
            <form onSubmit={handleGuess} className="flex gap-2">
              <input 
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your guess..."
                className="flex-1 bg-[#1A1A1A] border-2 border-accent4/50 focus:border-accent4 p-2 rounded outline-none font-mono"
              />
              <button type="submit" className="bg-accent4 p-2 rounded">🚀</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
