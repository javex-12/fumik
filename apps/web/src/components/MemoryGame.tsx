"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import clsx from "clsx";

export default function MemoryGame() {
  const { room, socket } = useSocket();
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;
    socket.on('memory:sequence', async (data) => {
      for (const step of data.sequence) {
        setActive(step);
        await new Promise(r => setTimeout(r, 600));
        setActive(null);
        await new Promise(r => setTimeout(r, 200));
      }
    });
    return () => { socket.off('memory:sequence'); };
  }, [socket]);

  const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <div className="grid grid-cols-2 gap-8">
        {COLORS.map((color, i) => (
          <button 
            key={i} 
            onClick={() => socket?.emit('game:input', { code: room?.code, data: { step: i } })}
            className={clsx(
              "w-40 h-40 rounded-3xl transition-all active:scale-95 border-8",
              color,
              active === i ? "opacity-100 scale-105 border-white" : "opacity-30 border-transparent"
            )}
          />
        ))}
      </div>
    </div>
  );
}
