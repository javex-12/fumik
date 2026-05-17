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
  const { socket, room } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  
  const [peers, setPeers] = useState<{ [id: string]: Peer.Instance }>({});
  const [streams, setStreams] = useState<{ [id: string]: MediaStream }>({});
  const myStream = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;
    socket.on('chat:message', (msg: Message) => setMessages(prev => [...prev, msg]));
    socket.on('call:signal', ({ from, signal }: { from: string, signal: any }) => {
      if (peers[from]) peers[from].signal(signal);
      else startCall(false, from, signal);
    });
    return () => {
      socket.off('chat:message');
      socket.off('call:signal');
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
      } catch (err) { return; }
    }
    if (initiator && room) {
      room.players.forEach(p => { if (p.id !== socket?.id && p.isConnected) createPeer(p.id, true); });
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

  return (
    <>
      {isCallActive && (
        <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
          <div className="w-24 h-32 md:w-32 md:h-24 bg-slate-900 rounded-2xl overflow-hidden border-2 border-orange-500 relative shadow-lg pointer-events-auto">
            <video autoPlay muted playsInline ref={el => { if(el) el.srcObject = myStream.current; }} className={clsx("w-full h-full object-cover", !isVideoOn && "hidden")} />
            <div className="absolute bottom-2 left-2 text-[8px] font-bold text-white bg-black/40 px-2 py-0.5 rounded">You</div>
          </div>
          {Object.entries(streams).map(([id, stream]) => (
            <div key={id} className="w-24 h-32 md:w-32 md:h-24 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-md pointer-events-auto">
              <video autoPlay playsInline ref={el => { if(el) el.srcObject = stream; }} className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 text-[8px] font-bold text-white bg-black/40 px-2 py-0.5 rounded">
                {room?.players.find(p => p.id === id)?.name || 'Guest'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-xl border border-white p-2 rounded-full shadow-2xl shadow-slate-200/50">
        {isCallActive ? (
          <>
            <button onClick={toggleMic} className={clsx("w-12 h-12 rounded-full flex items-center justify-center", isMicOn ? "bg-slate-50 text-slate-400" : "bg-red-50 text-red-500")}>
              {isMicOn ? <Icons.Mic className="w-5 h-5" /> : <Icons.MicOff className="w-5 h-5" />}
            </button>
            <button onClick={toggleVideo} className={clsx("w-12 h-12 rounded-full flex items-center justify-center", isVideoOn ? "bg-slate-50 text-slate-400" : "bg-red-50 text-red-500")}>
              {isVideoOn ? <Icons.Video className="w-5 h-5" /> : <Icons.VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={endCall} className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white"><Icons.PhoneOff className="w-5 h-5" /></button>
          </>
        ) : (
          <button onClick={() => startCall(true)} className="flex items-center gap-2 bg-orange-50 text-orange-600 hover:bg-orange-100 px-6 py-3 rounded-full font-bold text-sm transition-colors">
            <Icons.Video className="w-4 h-4" /> Link Up
          </button>
        )}
        <div className="w-px h-6 bg-slate-100 mx-1" />
        <button onClick={() => setIsChatOpen(true)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 relative">
          <Icons.MessageSquare className="w-5 h-5" />
          {messages.length > 0 && !isChatOpen && <div className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse" />}
        </button>
      </div>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-full md:w-96 bg-white border-l border-slate-100 z-[60] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Icons.MessageSquare className="w-4 h-4 text-primary" /> Messages</h3>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-300 hover:text-slate-900"><Icons.X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.playerId === socket?.id ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-bold text-slate-300 uppercase mb-1">{msg.playerName}</span>
                  <div className={`p-4 rounded-2xl text-sm ${msg.playerId === socket?.id ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600'}`}>{msg.message}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-6 border-t border-slate-50">
              <div className="relative">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Your message..." className="input-clean pr-16" />
                <button onClick={sendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center"><Icons.Send className="w-4 h-4" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
