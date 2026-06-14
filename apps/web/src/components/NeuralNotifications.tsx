"use client";

import { useSocket, NeuralNotification } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import clsx from "clsx";

export default function NeuralNotifications() {
  const { notifications, removeNotification, joinRoom, acceptFriendRequest, declineFriendRequest } = useSocket();

  const handleAcceptInvite = (notif: NeuralNotification) => {
    const myName = localStorage.getItem('fumik_user_name') || 'Legend';
    const myAvatar = localStorage.getItem('fumik_user_avatar') || 'default';
    if (notif.roomCode) {
      joinRoom(notif.roomCode, myName, myAvatar);
    }
    removeNotification(notif.id);
  };

  const handleAcceptFriendRequest = (notif: NeuralNotification) => {
    if (notif.fromUserId) {
      acceptFriendRequest(notif.fromUserId);
    }
    removeNotification(notif.id);
  };

  const handleDeclineFriendRequest = (notif: NeuralNotification) => {
    if (notif.fromUserId) {
      declineFriendRequest(notif.fromUserId);
    }
    removeNotification(notif.id);
  };

  return (
    <div className="fixed top-6 right-6 z-[300] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className={clsx(
              "pointer-events-auto p-5 rounded-2xl border-2 shadow-2xl backdrop-blur-xl relative overflow-hidden",
              n.type === 'invite' ? "bg-orange-600 border-orange-400" : 
              n.type === 'friend-request' ? "bg-slate-900 border-orange-500/40 text-white shadow-[0_0_30px_rgba(249,115,22,0.15)]" :
              n.type === 'error' ? "bg-red-950/90 border-red-500 text-red-100" :
              "bg-slate-900/90 border-slate-700 text-white"
            )}
          >
            <div className="flex gap-4">
              <div className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                n.type === 'invite' ? "bg-white/20" : "bg-slate-800"
              )}>
                {n.type === 'invite' ? <Icons.Gamepad2 className="w-5 h-5 text-white" /> : 
                 n.type === 'friend-request' ? <Icons.UserPlus className="w-5 h-5 text-orange-500" /> :
                 n.type === 'error' ? <Icons.AlertTriangle className="w-5 h-5 text-red-500" /> :
                 <Icons.Bell className="w-5 h-5 text-orange-500" />}
              </div>
              
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                  {n.type === 'invite' ? 'Neural Summon' : 
                   n.type === 'friend-request' ? 'Link Request' : 'System Signal'}
                </div>
                <div className="text-sm font-bold leading-tight">{n.message}</div>
                
                {n.type === 'invite' && (
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => handleAcceptInvite(n)}
                      className="flex-1 bg-white text-orange-600 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
                    >
                      Initialize
                    </button>
                    <button 
                      onClick={() => removeNotification(n.id)}
                      className="px-4 py-2 border border-white/20 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white/10"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {n.type === 'friend-request' && (
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => handleAcceptFriendRequest(n)}
                      className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 transition-colors"
                    >
                      Accept Link
                    </button>
                    <button 
                      onClick={() => handleDeclineFriendRequest(n)}
                      className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Ignore
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => removeNotification(n.id)}
                className="opacity-40 hover:opacity-100 transition-opacity"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Shimmer Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
