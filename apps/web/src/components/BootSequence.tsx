"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((v) => {
        if (v >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return 100;
        }
        return v + 1.5;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [onComplete]);

  // Animated background particles
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
    }));
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center overflow-hidden font-body">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]" />
        
        {/* Floaties */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: `${p.y}%`, opacity: 0 }}
            animate={{ 
              y: [`${p.y}%`, `${(p.y - 20 + 100) % 100}%`],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: p.duration, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute bg-white rounded-full"
            style={{ 
              left: `${p.x}%`, 
              width: p.size, 
              height: p.size 
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <div className="relative inline-block">
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
               className="absolute -inset-8 border border-white/5 rounded-full" 
             />
             <motion.div 
               animate={{ rotate: -360 }}
               transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
               className="absolute -inset-12 border border-orange-500/10 rounded-full" 
             />
             
             <h1 className="text-8xl md:text-9xl font-black text-white italic tracking-tighter relative z-10 mix-blend-difference">
               FUMIK
             </h1>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <motion.p 
              initial={{ letterSpacing: "0.2em", opacity: 0 }}
              animate={{ letterSpacing: "0.6em", opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-orange-500 font-black uppercase text-[10px] ml-[0.6em]"
            >
              The Social Gaming OS
            </motion.p>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1 h-1 bg-orange-500 rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>

        <div className="w-72 space-y-4">
          <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600 to-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
          
          <div className="flex justify-between items-center px-1">
            <div className="text-white/20 font-mono text-[8px] uppercase tracking-widest">
              SYSTEM_BOOT_SEQUENCE
            </div>
            <div className="text-orange-500/50 font-mono text-[8px] font-bold">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 text-center">
        <p className="text-slate-800 font-black uppercase tracking-[0.4em] text-[8px]">
          FUMIK ENGINE v2.0.4 // HYPER-STABLE
        </p>
      </div>
    </div>
  );
}
