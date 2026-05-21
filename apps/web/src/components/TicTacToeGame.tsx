"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import clsx from "clsx";

export default function TicTacToeGame() {
  const { room, socket, userId } = useSocket();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    socket.on('tictactoe:start', (data) => { setBoard(data.board); setTurn(data.turn); });
    socket.on('tictactoe:update', (data) => { 
      setBoard(data.board); 
      setTurn(data.turn); 
      if (data.winner) setWinner(data.winner);
    });
    return () => { socket.off('tictactoe:start'); socket.off('tictactoe:update'); };
  }, [socket]);

  const me = room?.players.find(p => p.userId === userId);
  const myTeam = (me as any)?.team;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 font-body p-6">
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-4xl font-black italic tracking-tighter text-white">TIC TAC TOE</h2>
        <div className="flex items-center justify-center gap-3">
          <div className={clsx("px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all", turn === 'X' ? "bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20 scale-110" : "bg-slate-900 text-slate-500 border-slate-800")}>Team X</div>
          <div className={clsx("px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all", turn === 'O' ? "bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20 scale-110" : "bg-slate-900 text-slate-500 border-slate-800")}>Team O</div>
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 bg-slate-900/40 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-800 backdrop-blur-md shadow-2xl">
          {board.map((cell, i) => (
            <button 
              key={i} 
              onClick={() => socket?.emit('game:input', { code: room?.code, data: { index: i } })}
              disabled={!!cell || !!winner || myTeam !== turn}
              className={clsx(
                "w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 text-4xl sm:text-5xl font-black rounded-2xl sm:rounded-3xl border-2 transition-all flex items-center justify-center relative group overflow-hidden",
                cell === 'X' ? "bg-orange-500/10 border-orange-500/30 text-orange-500 shadow-inner" : 
                cell === 'O' ? "bg-slate-800/50 border-slate-700 text-white shadow-inner" : 
                "bg-slate-950 border-slate-800 hover:border-orange-500/50 hover:bg-slate-900"
              )}
            >
              {cell}
              {!cell && !winner && myTeam === turn && <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          ))}
        </div>

        {winner && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem] z-20 border border-orange-500/20">
            <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-2">Match Result</div>
            <div className="text-5xl font-black italic text-white tracking-tighter mb-4">{winner === 'DRAW' ? 'DRAW' : `TEAM ${winner} WINS`}</div>
          </div>
        )}
      </div>

      <div className="mt-12 flex flex-col items-center gap-4">
        <div className="px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.avatar}`} />
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">You are Team <span className="text-orange-500">{myTeam || '?'}</span></div>
        </div>
        {myTeam !== turn && !winner && <div className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] animate-pulse">Waiting for opposite team...</div>}
      </div>
    </div>
  );
}
