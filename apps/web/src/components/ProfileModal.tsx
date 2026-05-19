"use client";

import { useState } from "react";
import { useSocket } from "@/lib/socket";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { room, socket, updateProfile, userId } = useSocket();
  const me = room?.players.find(p => p.userId === userId);
  
  const [name, setName] = useState(me?.name || "");
  const [avatar, setAvatar] = useState(me?.avatar || "");

  // Generate Google-style avatar URL using DiceBear (highly customizable and professional)
  const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=0f172a`;

  const handleSave = () => {
    updateProfile(name, avatar);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
          <h2 className="text-2xl font-black text-white italic tracking-tight flex items-center gap-3">
            <Icons.UserCircle2 className="w-6 h-6 text-orange-500" />
            IDENTITY
          </h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-10 flex-1 overflow-y-auto scrollbar-hide">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-2xl group-hover:bg-orange-500/30 transition-all" />
              <div className="w-36 h-36 rounded-[2.5rem] bg-slate-950 border-4 border-orange-500 overflow-hidden relative z-10 shadow-2xl transform group-hover:rotate-0 transition-transform duration-500">
                <img src={getAvatarUrl(avatar || name || "default")} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2.5 rounded-xl z-20 shadow-lg rotate-12">
                <Icons.Sparkles className="w-5 h-5" />
              </div>
            </div>
            <button 
              onClick={() => setAvatar(Math.random().toString(36).substring(7))}
              className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] hover:underline"
            >
              Randomize Style
            </button>
          </div>

          <div className="space-y-8">
            {/* Name Input */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1">Legend Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                className="w-full bg-slate-950 border-2 border-slate-800 focus:border-orange-500 p-5 rounded-2xl outline-none text-center font-black text-xl tracking-tight transition-all text-white placeholder:text-slate-800"
                placeholder="Enter name..."
              />
            </div>

            {/* Rank Visual */}
            <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 flex items-center gap-6 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
              <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-lg relative z-10">
                <Icons.Trophy className="w-7 h-7 text-orange-500" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Rank</div>
                <div className="text-2xl font-black text-white italic uppercase tracking-tight">ELITE {Math.floor((me?.score || 0) / 500) + 1}</div>
              </div>
              <div className="ml-auto text-right relative z-10">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</div>
                <div className="text-2xl font-mono font-bold text-orange-500">{me?.score || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-950/50 flex gap-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-5 rounded-2xl border-2 border-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-5 rounded-2xl bg-orange-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:bg-orange-500 transition-all active:scale-95">Lock Identity</button>
        </div>
      </motion.div>
    </div>
  );
}
