"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import * as Icons from "lucide-react";

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
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-12 overflow-hidden relative font-body text-center">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-8 relative z-10"
        >
          <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
            <span className="text-4xl">🎨</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black italic text-orange-500 tracking-tighter animate-bounce uppercase">SCRIBBLE SMASH!</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">Calibrating Creative Channels...</p>
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
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">EXHIBITION ENDED</h2>
            <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Archiving masterpieces...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row p-4 sm:p-6 gap-4 sm:gap-6 overflow-hidden bg-slate-950 font-body">
      {/* Left: Tools or Stats */}
      <div className="w-full lg:w-72 flex lg:flex-col gap-4">
        <div className="flex-1 lg:flex-none bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-[2rem] text-center shadow-xl">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Time Left</div>
          <div className={clsx("text-4xl font-mono font-black", timeLeft < 10 ? "text-red-500 animate-pulse" : "text-orange-500")}>{timeLeft}s</div>
        </div>

        {isDrawer && (
          <div className="hidden lg:flex flex-1 flex-col bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] overflow-hidden shadow-xl">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Stamp Collection</h4>
            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-4 gap-2 scrollbar-hide">
              {EMOJIS.map(emoji => (
                <button 
                  key={emoji} 
                  className="text-2xl hover:scale-125 transition-transform p-2 bg-slate-950 border border-slate-800 rounded-xl hover:border-orange-500/50"
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
      <div className="flex-1 flex flex-col gap-4 sm:gap-6 relative">
        <header className="flex justify-between items-center bg-slate-900/40 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl">
          <div className="space-y-1">
            <div className="text-orange-500 font-black uppercase tracking-[0.4em] text-[8px] sm:text-[10px]">Session Directive</div>
            <div className="text-lg sm:text-2xl font-black italic text-white uppercase tracking-tight">
              {isDrawer ? "Drawing Mode" : "Analysis Mode"}
            </div>
          </div>
          {isDrawer && (
            <div className="bg-orange-600 text-white px-6 sm:px-10 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xl sm:text-3xl italic shadow-lg shadow-orange-600/20 animate-pulse border-2 border-orange-400">
              {word}
            </div>
          )}
        </header>

        <div 
          ref={canvasRef}
          onClick={(e) => {
            if (isDrawer && (window as any).selectedEmoji) {
              placeEmoji((window as any).selectedEmoji, e);
            }
          }}
          className="flex-1 bg-white rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden cursor-crosshair shadow-inner border-4 border-slate-900"
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          
          {canvas.map((item, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              style={{ position: 'absolute', left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
              className="text-4xl sm:text-6xl select-none"
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
                className="absolute inset-0 bg-orange-600/90 backdrop-blur-md flex flex-col items-center justify-center z-50 text-center p-8"
              >
                <div className="text-8xl mb-6 animate-bounce">🏆</div>
                <h3 className="text-4xl sm:text-6xl font-black text-white italic uppercase tracking-tighter mb-4">{winnerInfo.player} GUESSED IT!</h3>
                <p className="text-xl sm:text-3xl font-black text-orange-200 uppercase tracking-widest border-2 border-orange-400/50 px-8 py-3 rounded-2xl">WORD: {winnerInfo.word}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Mobile Emojis */}
        {isDrawer && (
          <div className="lg:hidden flex gap-2 overflow-x-auto p-2 bg-slate-900 border border-slate-800 rounded-2xl scrollbar-hide">
            {EMOJIS.slice(0, 20).map(emoji => (
                <button 
                  key={emoji} 
                  className="text-2xl p-2 bg-slate-950 border border-slate-800 rounded-xl flex-shrink-0"
                  onMouseDown={() => (window as any).selectedEmoji = emoji}
                >
                  {emoji}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Right: Chat/Guesses */}
      <div className="w-full lg:w-80 flex flex-col gap-4 sm:gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] flex-1 flex flex-col overflow-hidden p-6 sm:p-8 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">Neural Intercepts</h4>
          <div className="flex-1 overflow-y-auto space-y-3 mb-6 scrollbar-hide relative z-10">
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={clsx(
                  "p-4 rounded-2xl text-xs font-bold uppercase tracking-tight",
                  m.type === 'system' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-slate-950 text-slate-400 border border-slate-800"
                )}
              >
                {m.type === 'system' ? m.text : <><span className="text-slate-600 mr-2"> {'>'} </span> {m.text}</>}
              </div>
            ))}
          </div>
          
          {!isDrawer && (
            <form onSubmit={handleGuess} className="flex gap-2 relative z-10">
              <input 
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Submit guess..."
                className="flex-1 bg-slate-950 border-2 border-slate-800 focus:border-orange-500 p-4 rounded-xl outline-none font-black text-sm uppercase tracking-tight text-white transition-all"
              />
              <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-xl shadow-lg shadow-orange-600/20 transition-all active:scale-95">
                <Icons.Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
