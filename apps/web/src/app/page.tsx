"use client";

import { useState, useEffect } from "react";
import { AVATARS } from "@fumik/shared/constants";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/lib/socket";
import * as Icons from "lucide-react";
import clsx from "clsx";

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.User;
  return <IconComponent className={className} />;
};

export default function LandingPage() {
  const { createRoom, joinRoom, error, isConnected } = useSocket();
  const [isMounted, setIsMounted] = useState(false);
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle socket errors to stop the loading state
  useEffect(() => {
    if (error) {
      alert(error);
      setIsLoading(false);
    }
  }, [error]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Initializing OS...</p>
      </div>
    );
  }

  const handleCreateRoom = () => {
    if (!name) return alert("Please enter your name");
    if (!isConnected) return alert("Connecting to server... please wait.");
    setIsLoading(true);
    createRoom(name, selectedAvatar);
  };

  const handleJoinRoom = () => {
    if (!name) return alert("Please enter your name");
    if (!roomCode || roomCode.length !== 5) return alert("Enter a valid 5-character code");
    if (!isConnected) return alert("Connecting to server... please wait.");
    setIsLoading(true);
    joinRoom(roomCode, name, selectedAvatar);
  };

  return (
    <main className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-4 font-body selection:bg-orange-200">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-400/20 rounded-full blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md space-y-6 sm:space-y-8 z-10"
      >
        {/* Logo Section */}
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex p-3 sm:p-4 bg-white rounded-2xl shadow-lg shadow-orange-500/10 mb-2 border border-slate-100"
          >
            <Icons.Gamepad2 className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">FUMIK</h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base">Play together, anywhere.</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-white space-y-6 sm:space-y-8">
          
          {/* Connection Status Banner (Optional) */}
          {!isConnected && !isLoading && (
            <div className="bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-widest p-3 rounded-xl flex items-center justify-center gap-2 border border-orange-100">
              <Icons.WifiOff className="w-4 h-4" /> Connecting...
            </div>
          )}

          {/* Identity */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Your Name</label>
            <input 
              type="text" 
              maxLength={16}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-orange-500 p-3 sm:p-4 rounded-xl outline-none text-slate-900 transition-all font-bold text-base sm:text-lg placeholder:text-slate-300 placeholder:font-normal shadow-sm"
            />
          </div>

          {/* Avatar Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Choose Avatar</label>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {AVATARS.slice(0, 8).map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={clsx(
                    "aspect-square flex items-center justify-center rounded-xl border-2 transition-all duration-300",
                    selectedAvatar === avatar 
                    ? "border-orange-500 bg-orange-50 text-orange-600 scale-105 shadow-md shadow-orange-500/20" 
                    : "border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  )}
                >
                  <DynamicIcon name={avatar} className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <AnimatePresence mode="wait">
              {!isJoining ? (
                <motion.div 
                  key="main-actions"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-3"
                >
                  <button 
                    onClick={handleCreateRoom}
                    disabled={isLoading || !isConnected}
                    className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white w-full py-4 sm:py-5 rounded-xl font-bold tracking-tight transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase text-sm sm:text-base shadow-lg shadow-orange-500/25"
                  >
                    {isLoading ? <Icons.Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6" /> : <Icons.PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
                    Create New Game
                  </button>
                  <button 
                    onClick={() => setIsJoining(true)}
                    disabled={isLoading || !isConnected}
                    className="border-2 border-slate-200 bg-transparent text-slate-600 hover:border-orange-500 hover:text-orange-500 disabled:opacity-50 disabled:cursor-not-allowed w-full py-4 sm:py-5 rounded-xl font-bold tracking-tight transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase text-sm sm:text-base"
                  >
                    <Icons.Hash className="w-5 h-5 sm:w-6 sm:h-6" />
                    Join with Code
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="join-actions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <input 
                    type="text" 
                    maxLength={5}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-orange-500 p-4 rounded-xl outline-none text-slate-900 transition-all font-bold text-center text-3xl sm:text-4xl py-5 sm:py-6 tracking-[10px] placeholder:tracking-normal shadow-sm uppercase"
                  />
                  <div className="flex gap-2 sm:gap-3">
                    <button 
                      onClick={() => setIsJoining(false)}
                      disabled={isLoading}
                      className="flex-1 border-2 border-slate-200 bg-transparent text-slate-600 hover:bg-slate-50 disabled:opacity-50 py-4 sm:py-5 rounded-xl font-bold uppercase tracking-tight transition-all active:scale-[0.98] text-sm sm:text-base"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleJoinRoom}
                      disabled={isLoading || !isConnected}
                      className="flex-[2] bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white py-4 sm:py-5 rounded-xl font-bold uppercase tracking-tight transition-all active:scale-[0.98] flex items-center justify-center text-sm sm:text-base shadow-lg shadow-orange-500/25"
                    >
                      {isLoading ? <Icons.Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6" /> : "Join Game"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Global Play v1.5.2</p>
        </div>
      </motion.div>
    </main>
  );
}
