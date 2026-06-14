"use client";

import { useSocket } from "@/lib/socket";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import clsx from "clsx";

export default function GameReadyScreen() {
  const { room, socket, leaveRoom, abortGame, userId } = useSocket();
  if (!room || !room.currentGame) return null;

  const me = room.players.find(p => p.userId === userId);
  const readyCount = room.players.filter(p => p.isConnected && p.isReady).length;
  const totalCount = room.players.filter(p => p.isConnected).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 bg-dot-pattern flex flex-col items-center justify-center p-6 font-body">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-800 space-y-10">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-orange-500/10 rounded-2xl mx-auto flex items-center justify-center border border-orange-500/20">
            <Icons.Brain className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight italic">BRAIN WAR</h2>
            <p className="text-orange-500 font-bold text-[10px] uppercase tracking-[0.3em]">AI-Powered Trivia Quiz</p>
          </div>
        </div>

        <div className="bg-slate-950 p-6 rounded-2xl border-2 border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Icons.Zap className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Protocol</span>
          </div>
          <p className="text-slate-400 font-medium italic text-sm">"Answer the AI-generated questions correctly. Speed grants a massive intelligence bonus. Every round is fresh."</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            <span>Neural Linkage</span>
            <span className="text-orange-500">{readyCount} / {totalCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {room.players.filter(p => p.isConnected).map(p => (
              <div key={p.id} className={clsx("px-4 py-2 rounded-xl border-2 text-[10px] font-black transition-all uppercase tracking-tight", p.isReady ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "border-slate-800 bg-slate-950 text-slate-600")}>
                {p.name}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
           <button onClick={() => socket?.emit('game:ready', { code: room.code })} disabled={me?.isReady} className={clsx("w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl uppercase tracking-widest", me?.isReady ? "bg-slate-800 text-slate-500 cursor-default" : "bg-orange-600 text-white shadow-orange-600/20 hover:bg-orange-500")}>
            {me?.isReady ? "Link Synchronized" : "Initiate Link"}
          </button>

          <div className="flex gap-4">
            {me?.isHost && (
              <button onClick={() => { if(confirm("Abort session?")) abortGame(room.code); }} className="flex-1 py-4 rounded-xl border-2 border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all">Abort</button>
            )}
            <button onClick={() => { if(confirm("Abandon?")) leaveRoom(room.code); }} className="flex-1 py-4 rounded-xl border-2 border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all">Leave</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}