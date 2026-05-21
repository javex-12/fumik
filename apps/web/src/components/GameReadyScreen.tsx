"use client";

import { useSocket } from "@/lib/socket";
import { GAME_TYPES } from "@fumik/shared/constants";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import clsx from "clsx";

const GAME_INFO: Record<string, { desc: string, icon: string, instruction: string }> = {
  reflex: { desc: "Reaction Test", icon: "Zap", instruction: "Wait for the screen to turn WHITE, then tap as fast as you can!" },
  brain: { desc: "Trivia Quiz", icon: "Brain", instruction: "Answer the questions correctly. Speed earns more points!" },
  clicker: { desc: "Speed Clicking", icon: "MousePointer2", instruction: "Tap the button as many times as you can in 10 seconds." },
  math: { desc: "Mental Math", icon: "Calculator", instruction: "Solve the math problems quickly and hit enter." },
  emoji: { desc: "Find the Odd One", icon: "Search", instruction: "One of these emojis doesn't belong. Find it fast!" },
  tictactoe: { desc: "Team Tactics", icon: "Grid3X3", instruction: "Work with your team to get three in a row!" },
  memory: { desc: "Pattern Recall", icon: "Cpu", instruction: "Repeat the sequence of colors shown by the computer." },
  scribble: { desc: "Draw & Guess", icon: "Pencil", instruction: "One person draws the word, the others must guess what it is." },
  vote: { desc: "Social Choice", icon: "Users", instruction: "Vote for the most popular option to stay in the game!" }
};

export default function GameReadyScreen() {
  const { room, socket, leaveRoom, abortGame, userId } = useSocket();
  if (!room || !room.currentGame) return null;

  const game = room.currentGame;
  const info = GAME_INFO[game] || { desc: "Fun Challenge", icon: "Gamepad2", instruction: "Play to win!" };
  const me = room.players.find(p => p.userId === userId);
  const readyCount = room.players.filter(p => p.isConnected && p.isReady).length;
  const totalCount = room.players.filter(p => p.isConnected).length;

  const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
    const IconComponent = (Icons as any)[name] || Icons.Gamepad2;
    return <IconComponent className={className} />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background bg-dot-pattern flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200 space-y-10 border border-slate-100">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl mx-auto flex items-center justify-center">
            <DynamicIcon name={info.icon} className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{GAME_TYPES[game]}</h2>
            <p className="text-primary font-bold text-xs uppercase tracking-widest">{info.desc}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Icons.Info className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">How to play</span>
          </div>
          <p className="text-slate-600 font-medium italic">"{info.instruction}"</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            <span>Players Ready</span>
            <span className="text-primary">{readyCount} / {totalCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {room.players.filter(p => p.isConnected).map(p => (
              <div key={p.id} className={clsx("px-4 py-2 rounded-full border-2 text-[10px] font-bold transition-all", p.isReady ? "border-primary bg-primary text-white" : "border-slate-100 bg-slate-50 text-slate-400")}>
                {p.name}
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => socket?.emit('game:ready', { code: room.code })} disabled={me?.isReady} className={clsx("w-full py-5 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg", me?.isReady ? "bg-slate-100 text-slate-300 cursor-default" : "bg-primary text-white shadow-orange-200 hover:bg-primary-dark")}>
          {me?.isReady ? "Ready to Go!" : "Ready Up"}
        </button>

        <div className="flex gap-4">
          {me?.isHost && (
             <button onClick={() => { if(confirm("Abort?")) abortGame(room.code); }} className="flex-1 py-4 rounded-xl border-2 border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all">Abort</button>
          )}
          <button onClick={() => { if(confirm("Leave?")) leaveRoom(room.code); }} className="flex-1 py-4 rounded-xl border-2 border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all">Leave</button>
        </div>
      </motion.div>
    </div>
  );
}
