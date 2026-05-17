"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import clsx from "clsx";

export default function TicTacToeGame() {
  const { room, socket } = useSocket();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");

  useEffect(() => {
    if (!socket) return;
    socket.on('tictactoe:start', (data) => { setBoard(data.board); setTurn(data.turn); });
    socket.on('tictactoe:update', (data) => { setBoard(data.board); setTurn(data.turn); });
    return () => { socket.off('tictactoe:start'); socket.off('tictactoe:update'); };
  }, [socket]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-indigo-500 font-black text-2xl mb-8 uppercase italic">Team {turn}'s Turn</div>
      <div className="grid grid-cols-3 gap-4">
        {board.map((cell, i) => (
          <button 
            key={i} 
            onClick={() => socket?.emit('game:input', { code: room?.code, data: { index: i } })}
            className={clsx(
              "w-24 h-24 text-4xl font-black rounded-2xl border transition-all flex items-center justify-center",
              cell ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5 hover:border-indigo-500/50"
            )}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}
