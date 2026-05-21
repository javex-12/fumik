"use client";

import { useRef, useEffect, useState } from "react";
import { useSocket } from "@/lib/socket";
import { motion } from "framer-motion";

export default function BallGame() {
  const { room, socket } = useSocket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [countdown, setCountdown] = useState(3);
  const [status, setStatus] = useState<'starting' | 'playing'>('starting');
  const joystickRef = useRef<any>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('ball:starting', ({ countdown }) => {
      setStatus('starting');
      setCountdown(countdown);
      if (countdown <= 0) {
        setStatus('playing');
      }
    });

    socket.on('ball:state', (state) => {
      setStatus('playing'); // Ensure status is playing if we are getting state
      setGameState(state);
    });

    return () => {
      socket.off('ball:starting');
      socket.off('ball:state');
    };
  }, [socket]);

  useEffect(() => {
    if (status !== 'playing' || typeof window === 'undefined') return;

    let manager: any;
    
    // Dynamic import to avoid SSR issues with window
    import("nipplejs").then((nipplejs) => {
      const options = {
        zone: document.getElementById('joystick-zone')!,
        mode: 'static' as const,
        position: { left: '80px', bottom: '80px' },
        color: '#f97316', // Updated to orange
        size: 100
      };

      manager = nipplejs.default.create(options);
      joystickRef.current = manager;

      const input = { up: false, down: false, left: false, right: false };
      
      manager.on('move', (evt: any, data: any) => {
        const force = data.force;
        const angle = data.angle.degree;
        
        input.up = angle > 45 && angle < 135 && force > 0.2;
        input.down = angle > 225 && angle < 315 && force > 0.2;
        input.left = (angle > 135 && angle < 225) && force > 0.2;
        input.right = (angle < 45 || angle > 315) && force > 0.2;
        
        socket?.emit('ball:input', { code: room?.code, input });
      });

      manager.on('end', () => {
        socket?.emit('ball:input', { code: room?.code, input: { up: false, down: false, left: false, right: false } });
      });
    });

    return () => manager?.destroy();
  }, [status, room?.code, socket]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid - Updated to light theme
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      // Draw Walls
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Draw Players
      gameState.players.forEach((p: any) => {
        const player = room?.players.find(rp => rp.id === p.id);
        ctx.fillStyle = player?.isHost ? '#f97316' : '#64748b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw Name & Avatar
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${player?.name}`, p.x, p.y - 25);
      });
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, room?.players]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden bg-slate-950 font-body">
      {status === 'starting' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
           <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <h2 className="text-[10rem] font-black text-orange-500 italic leading-none">{countdown}</h2>
            <p className="text-orange-500/40 font-black uppercase tracking-[0.5em] text-xs">Synchronizing Core...</p>
          </motion.div>
        </div>
      )}

      <div className="relative w-full max-w-[800px] aspect-[4/3] border-4 border-slate-900 rounded-[2rem] overflow-hidden bg-slate-950 shadow-2xl">
        <canvas 
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full object-contain"
        />
      </div>

      <div id="joystick-zone" className="absolute bottom-0 left-0 w-64 h-64 z-40 pointer-events-none md:pointer-events-auto" />
      
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-6 border border-slate-100 rounded-3xl shadow-xl w-48">
        <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Live Rankings</h4>
        <div className="space-y-3">
          {room?.players.sort((a,b) => b.score - a.score).slice(0, 5).map((p, i) => (
            <div key={p.id} className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 truncate mr-2">{i+1}. {p.name}</span>
              <span className="text-[10px] font-black text-primary">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}