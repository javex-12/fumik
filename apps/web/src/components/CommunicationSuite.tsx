"use client";

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/lib/socket';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Peer from 'simple-peer';
import clsx from 'clsx';

interface Message {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
}

export default function CommunicationSuite() {
  const { socket, room, userId } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsible pill state
  
  const [peers, setPeers] = useState<{ [id: string]: Peer.Instance }>({});
  const [streams, setStreams] = useState<{ [id: string]: MediaStream }>({});
  const myStream = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;
    const handleMsg = (msg: Message) => setMessages(prev => [...prev, msg]);
    const handleSignal = ({ from, signal }: { from: string, signal: any }) => {
      if (peers[from]) peers[from].signal(signal);
      else startCall(false, from, signal);
    };

    socket.on('chat:message', handleMsg);
    socket.on('call:signal', handleSignal);
    
    return () => {
      socket.off('chat:message', handleMsg);
      socket.off('call:signal', handleSignal);
    };
  }, [socket, peers]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !room || !socket) return;
    socket.emit('chat:message', { code: room.code, message: newMessage });
    setNewMessage('');
  };

  const startCall = async (initiator: boolean, targetId?: string, incomingSignal?: any) => {
    if (!myStream.current) {
      try {
        myStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setIsCallActive(true);
      } catch (err) { 
        console.error("Camera access denied", err);
        return; 
      }
    }
    if (initiator && room) {
      room.players.forEach(p => { 
        if (p.userId !== userId && p.isConnected) createPeer(p.id, true); 
      });
    } else if (targetId) createPeer(targetId, false, incomingSignal);
  };

  const createPeer = (targetId: string, initiator: boolean, incomingSignal?: any) => {
    const peer = new Peer({ initiator, trickle: false, stream: myStream.current || undefined });
    peer.on('signal', signal => socket?.emit('call:signal', { to: targetId, signal }));
    peer.on('stream', stream => setStreams(prev => ({ ...prev, [targetId]: stream })));
    if (incomingSignal) peer.signal(incomingSignal);
    setPeers(prev => ({ ...prev, [targetId]: peer }));
  };

  const toggleMic = () => { if (myStream.current) { myStream.current.getAudioTracks().forEach(track => (track.enabled = !isMicOn)); setIsMicOn(!isMicOn); } };
  const toggleVideo = () => { if (myStream.current) { myStream.current.getVideoTracks().forEach(track => (track.enabled = !isVideoOn)); setIsVideoOn(!isVideoOn); } };
  const endCall = () => {
    myStream.current?.getTracks().forEach(track => track.stop());
    myStream.current = null;
    Object.values(peers).forEach(peer => peer.destroy());
    setPeers({}); setStreams({}); setIsCallActive(false);
  };

  // Don't show anything if not in a room and no active call
  if (!room && !isCallActive) return null;

  const unreadMessages = messages.length > 0 && !isChatOpen;

  return (
    <>
      <AnimatePresence>
        {isCallActive && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-8 right-8 z-[100] flex flex-col items-end gap-4 pointer-events-none"
          >
            <div className="w-24 h-32 md:w-32 md:h-40 bg-slate-900 rounded-2xl overflow-hidden border-2 border-orange-500/50 relative shadow-2xl pointer-events-auto group">
              <video autoPlay muted playsInline ref={el => { if(el) el.srcObject = myStream.current; }} className={clsx("w-full h-full object-cover", !isVideoOn && "hidden")} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 text-[8px] font-black text-white uppercase tracking-widest bg-orange-500 px-2 py-1 rounded">YOU</div>
            </div>
            {Object.entries(streams).map(([id, stream]) => (
              <div key={id} className="w-24 h-32 md:w-32 md:h-40 bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 relative shadow-xl pointer-events-auto">
                <video autoPlay playsInline ref={el => { if(el) el.srcObject = stream; }} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-2 left-2 text-[8px] font-black text-white uppercase tracking-widest bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded">
                  {room?.players.find(p => p.id === id)?.name || 'LEGEND'}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3 pointer-events-none">
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="flex flex-col gap-2 bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-2 rounded-[2rem] shadow-2xl shadow-black/50 pointer-events-auto"
            >
              {isCallActive ? (
                <>
                  <button onClick={toggleMic} className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", isMicOn ? "bg-slate-800 text-slate-400" : "bg-red-500/20 text-red-500 border border-red-500/30")}>
                    {isMicOn ? <Icons.Mic className="w-5 h-5" /> : <Icons.MicOff className="w-5 h-5" />}
                  </button>
                  <button onClick={toggleVideo} className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", isVideoOn ? "bg-slate-800 text-slate-400" : "bg-red-500/20 text-red-500 border border-red-500/30")}>
                    {isVideoOn ? <Icons.Video className="w-5 h-5" /> : <Icons.VideoOff className="w-5 h-5" />}
                  </button>
                  <div className="w-10 h-px bg-slate-800 mx-auto" />
                  <button onClick={endCall} className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/20 hover:scale-110 active:scale-90 transition-all"><Icons.PhoneOff className="w-5 h-5" /></button>
                </>
              ) : (
                <button onClick={() => startCall(true)} className="w-12 h-12 flex items-center justify-center bg-orange-600 text-white rounded-2xl transition-all shadow-lg hover:scale-110 active:scale-95" title="Link Up Voice/Video">
                  <Icons.Video className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-px bg-slate-800 mx-auto" />
              <button onClick={() => { setIsChatOpen(true); setIsExpanded(false); }} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 relative hover:text-white transition-colors" title="Open Chat">
                <Icons.MessageSquare className="w-5 h-5" />
                {unreadMessages && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-slate-900 animate-pulse" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className={clsx(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border-2 pointer-events-auto transition-all active:scale-90",
            isExpanded ? "bg-slate-800 border-slate-700 text-slate-400 rotate-45" : "bg-orange-500 border-orange-400 text-white hover:bg-orange-600"
          )}
        >
          {isExpanded ? <Icons.Plus className="w-6 h-6" /> : (
             <div className="relative">
                <Icons.Radio className="w-6 h-6" />
                {unreadMessages && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-orange-500 animate-bounce" />}
             </div>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-slate-950 border-l border-slate-800 z-[110] flex flex-col shadow-2xl">
            <div className="p-8 border-b border-slate-900 flex justify-between items-center bg-slate-950/50 backdrop-blur-md">
              <h3 className="font-black italic text-xl uppercase tracking-tight flex items-center gap-3">
                <Icons.MessageSquare className="w-6 h-6 text-orange-500" /> 
                Messages
              </h3>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-500 hover:text-white transition-colors"><Icons.X /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.03),transparent_80%)]">
              {messages.map((msg, i) => (
                <div key={i} className={clsx("flex flex-col max-w-[85%]", msg.playerId === socket?.id ? "items-end self-end ml-auto" : "items-start")}>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{msg.playerName}</span>
                  <div className={clsx("p-4 rounded-3xl text-sm font-medium", msg.playerId === socket?.id ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm shadow-lg shadow-orange-500/20" : "bg-slate-900 text-slate-300 rounded-tl-sm border border-slate-800")}>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-6 border-t border-slate-900 bg-slate-950/50 backdrop-blur-md">
              <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-2 focus-within:border-orange-500/50 transition-colors">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                  placeholder="Type a message..." 
                  className="w-full bg-transparent border-none outline-none text-white px-4 placeholder:text-slate-600 text-sm" 
                />
                <button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Icons.Send className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
