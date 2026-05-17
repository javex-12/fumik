"use client";

import { useState } from "react";
import { useSocket } from "@/lib/socket";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { room, socket, updateProfile } = useSocket();
  const me = room?.players.find(p => p.id === socket?.id);
  
  const [name, setName] = useState(me?.name || "");
  const [avatar, setAvatar] = useState(me?.avatar || "");

  // Generate Google-style avatar URL using DiceBear (highly customizable and professional)
  const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=f8fafc`;

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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.UserCircle2 className="w-6 h-6 text-primary" />
            Edit Profile
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <Icons.X className="w-6 h-6 text-slate-300" />
          </button>
        </div>

        <div className="p-8 space-y-10 flex-1 overflow-y-auto">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] bg-slate-50 border-4 border-slate-50 overflow-hidden shadow-inner">
                <img src={getAvatarUrl(avatar || name || "default")} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg">
                <Icons.Sparkles className="w-4 h-4" />
              </div>
            </div>
            <button 
              onClick={() => setAvatar(Math.random().toString(36).substring(7))}
              className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
            >
              Randomize Style
            </button>
          </div>

          <div className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Player Tag</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                className="input-clean text-xl py-5"
                placeholder="Your name..."
              />
            </div>

            {/* Rank Visual (Static for now, can be linked to score) */}
            <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100 flex items-center gap-5">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Icons.Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Current Rank</div>
                <div className="text-xl font-black text-slate-900 italic">MASTER {Math.floor((me?.score || 0) / 500) + 1}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Score</div>
                <div className="text-xl font-mono font-bold text-primary">{me?.score || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={handleSave} className="flex-[2] btn-primary">Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
}
