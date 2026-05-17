"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";

export default function EmojiGame() {
  const { room, socket } = useSocket();
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;
    socket.on('emoji:question', (data) => setOptions(data.options));
    return () => { socket.off('emoji:question'); };
  }, [socket]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-white/30 uppercase tracking-[0.5em] mb-12">Find the Odd One Out</div>
      <div className="grid grid-cols-2 gap-8">
        {options.map((emoji, i) => (
          <button 
            key={i} 
            onClick={() => socket?.emit('game:input', { code: room?.code, data: { emoji } })}
            className="w-32 h-32 text-6xl bg-white/5 rounded-3xl hover:bg-white/10 border border-white/5 transition-all active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
