"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { motion } from "framer-motion";

export default function MathGame() {
  const { room, socket } = useSocket();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!socket) return;
    socket.on('math:question', (data) => {
      setQuestion(data.question);
      setRound(data.round);
      setAnswer("");
    });
    return () => { socket.off('math:question'); };
  }, [socket]);

  const submit = (e: any) => {
    e.preventDefault();
    if (!answer) return;
    socket?.emit('game:input', { code: room?.code, data: { answer } });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white p-6 font-body">
      <div className="text-slate-400 font-bold uppercase tracking-[0.4em] text-xs mb-6">Round {round} / 10</div>
      <motion.div 
        key={question}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-6xl md:text-9xl font-black text-slate-900 mb-12 md:mb-16 tracking-tighter"
      >
        {question}
      </motion.div>
      <form onSubmit={submit} className="w-full max-w-sm md:max-w-md">
        <input 
          type="number" 
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          autoFocus
          className="w-full bg-slate-50 border-4 border-slate-100 focus:border-primary p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] outline-none text-slate-900 transition-all font-black text-4xl md:text-6xl text-center placeholder:text-slate-200"
          placeholder="?"
        />
        <button type="submit" className="hidden">Submit</button>
      </form>
    </div>
  );
}