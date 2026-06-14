import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import os from 'os';
import mongoose from 'mongoose';
import { Room, Player } from '@fumik/shared/types';
import { ROOM_CODE_LENGTH, INACTIVITY_TIMEOUT } from '@fumik/shared/constants';
import { gameRegistry } from './games/GameRegistry';
import { BrainGame } from './games/BrainGame';
import { GroqService } from './GroqService';
import { User } from './models/User';

dotenv.config();

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGODB_URI || '';
mongoose.set('bufferCommands', false);
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch(err => console.error('❌ MongoDB Error: Connection failed. Using local in-memory fallback.'));
} else {
  console.warn('⚠️ No MONGODB_URI set. Social features will use in-memory mode.');
}

const inMemoryUsers: Map<string, any> = new Map();
const isMongoConnected = () => mongoose.connection.readyState === 1;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
gameRegistry.register(new BrainGame());

const app = express();
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms: Map<string, Room> = new Map();
const onlineUsers: Map<string, { socketId: string, name: string, avatar: string }> = new Map();
let totalConnections = 0;

function broadcastOnlineList() {
  const list = Array.from(onlineUsers.entries()).map(([userId, data]) => ({ userId, ...data }));
  io.emit('social:online-count', list.length);
  io.emit('social:online-list', list);
  io.emit('social:total-connections', totalConnections);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

setInterval(() => {
  const now = new Date();
  rooms.forEach((room, code) => {
    if (now.getTime() - room.lastActivity.getTime() > INACTIVITY_TIMEOUT) rooms.delete(code);
  });
}, 60000);

io.on('connection', (socket) => {
  totalConnections++;
  broadcastOnlineList();

  socket.on('social:register', async ({ username, token, avatar }) => {
    try {
      let finalUser: any;
      const normalizedName = username.toLowerCase().trim();
      if (!isMongoConnected()) {
        let user = Array.from(inMemoryUsers.values()).find(u => u.token === token);
        if (!user) {
          // Passwordless device-link: If name exists in memory, adopt the new token
          let existingUser = Array.from(inMemoryUsers.values()).find(u => u.username === normalizedName);
          if (existingUser) {
            existingUser.token = token;
            existingUser.avatar = avatar;
            existingUser.isOnline = true;
            user = existingUser;
          } else {
            const mockId = 'mem_' + Math.random().toString(36).substr(2, 9);
            user = { _id: mockId, username: normalizedName, token, avatar, isOnline: true, friends: [], friendRequests: [] };
            inMemoryUsers.set(mockId, user);
          }
        } else { user.avatar = avatar; user.isOnline = true; }
        finalUser = user;
      } else {
        let user = await User.findOne({ token });
        if (!user) {
          // Passwordless device-link: If name exists in DB, adopt the new token
          let existingUser = await User.findOne({ username: normalizedName });
          if (existingUser) {
            existingUser.token = token;
            existingUser.avatar = avatar;
            existingUser.isOnline = true;
            await existingUser.save();
            user = existingUser;
          } else {
            user = new User({ username: normalizedName, token, avatar, isOnline: true });
          }
        } else { user.avatar = avatar; user.isOnline = true; user.lastSeen = new Date(); }
        await user.save();
        finalUser = { _id: user._id.toString(), username: user.username, avatar: user.avatar };
      }
      onlineUsers.set(finalUser._id.toString(), { socketId: socket.id, name: finalUser.username, avatar: finalUser.avatar });
      broadcastOnlineList();
      socket.emit('social:registered', { ok: true, username: finalUser.username, userId: finalUser._id.toString() });
    } catch (err) { socket.emit('social:registered', { ok: false, error: 'Auth failed.' }); }
  });

  socket.on('social:get-online', () => {
    const list = Array.from(onlineUsers.entries()).map(([userId, data]) => ({ userId, ...data }));
    socket.emit('social:online-list', list);
  });

  socket.on('social:search', async ({ query }) => {
    if (!query || query.length < 2) return;
    try {
      if (!isMongoConnected()) {
        const results = Array.from(inMemoryUsers.values()).filter(u => u.username.includes(query.toLowerCase().trim())).slice(0, 10);
        return socket.emit('social:search-results', results.map(u => ({ userId: u._id, name: u.username, avatar: u.avatar, isOnline: onlineUsers.has(u._id) })));
      }
      const results = await User.find({ username: { $regex: query, $options: 'i' } }).limit(10);
      socket.emit('social:search-results', results.map(u => ({ userId: u._id.toString(), name: u.username, avatar: u.avatar, isOnline: onlineUsers.has(u._id.toString()) })));
    } catch (err) { socket.emit('social:search-results', []); }
  });

  socket.on('social:friend-request', async ({ fromUserId, toUserId }) => {
    const target = onlineUsers.get(toUserId);
    const fromUser = isMongoConnected() ? await User.findById(fromUserId) : inMemoryUsers.get(fromUserId);
    if (!fromUser) return;
    
    if (isMongoConnected()) {
      await User.findByIdAndUpdate(toUserId, { $addToSet: { friendRequests: new mongoose.Types.ObjectId(fromUserId) } });
    } else {
      const tu = inMemoryUsers.get(toUserId);
      if (tu && !tu.friendRequests.includes(fromUserId)) tu.friendRequests.push(fromUserId);
    }

    if (target) io.to(target.socketId).emit('social:friend-request', { fromUserId, fromName: fromUser.username, fromAvatar: fromUser.avatar });
    socket.emit('system:narrator', { message: "Request transmitted to target sector." });
  });

  socket.on('social:accept-friend', async ({ myUserId, fromUserId }) => {
    try {
      const me = isMongoConnected() ? await User.findById(myUserId) : inMemoryUsers.get(myUserId);
      const them = isMongoConnected() ? await User.findById(fromUserId) : inMemoryUsers.get(fromUserId);
      if (!me || !them) return;

      if (isMongoConnected()) {
        await User.findByIdAndUpdate(myUserId, { 
          $addToSet: { friends: new mongoose.Types.ObjectId(fromUserId) }, 
          $pull: { friendRequests: new mongoose.Types.ObjectId(fromUserId) } 
        });
        await User.findByIdAndUpdate(fromUserId, { 
          $addToSet: { friends: new mongoose.Types.ObjectId(myUserId) } 
        });
      } else {
        if (!me.friends.includes(fromUserId)) me.friends.push(fromUserId);
        me.friendRequests = me.friendRequests.filter((id: string) => id !== fromUserId);
        if (!them.friends.includes(myUserId)) them.friends.push(myUserId);
      }

      const targetSocket = onlineUsers.get(fromUserId);
      if (targetSocket) {
        io.to(targetSocket.socketId).emit('system:narrator', { message: `${me.username} accepted your link request!` });
        io.to(targetSocket.socketId).emit('social:friends-updated');
      }
      socket.emit('system:narrator', { message: `Neural link with ${them.username} confirmed.` });
      socket.emit('social:friends-updated');
    } catch (err) {}
  });

  socket.on('social:get-friends', async ({ userId }) => {
    try {
      let friends = [], requests = [];
      if (isMongoConnected()) {
        const u = await User.findById(userId).populate('friends', 'username avatar').populate('friendRequests', 'username avatar');
        if (u) {
          friends = (u.friends as any[]).map(f => ({ userId: f._id.toString(), name: f.username, avatar: f.avatar, isOnline: onlineUsers.has(f._id.toString()) }));
          requests = (u.friendRequests as any[]).map(r => ({ userId: r._id.toString(), name: r.username, avatar: r.avatar }));
        }
      } else {
        const u = inMemoryUsers.get(userId);
        if (u) {
          friends = u.friends.map((fid: string) => { const f = inMemoryUsers.get(fid); return f ? { userId: f._id, name: f.username, avatar: f.avatar, isOnline: onlineUsers.has(f._id) } : null; }).filter(Boolean);
          requests = u.friendRequests.map((rid: string) => { const r = inMemoryUsers.get(rid); return r ? { userId: r._id, name: r.username, avatar: r.avatar } : null; }).filter(Boolean);
        }
      }
      socket.emit('social:friends-list', { friends, requests });
    } catch (err) {}
  });

  socket.on('social:invite', ({ toUserId, fromName, roomCode }) => {
    const target = onlineUsers.get(toUserId);
    if (target) io.to(target.socketId).emit('social:invite', { fromName, roomCode });
  });

  socket.on('room:create', ({ name, avatar, userId }) => {
    let code = generateRoomCode();
    while (rooms.has(code)) code = generateRoomCode();
    const newRoom: Room = { code, players: [{ id: socket.id, userId, name, avatar, isHost: true, score: 0, isReady: false, isConnected: true }], currentGame: null, gameStatus: 'lobby', gameState: null, round: 0, leaderboard: [], createdAt: new Date(), lastActivity: new Date(), adminId: userId };
    rooms.set(code, newRoom);
    socket.join(code);
    socket.emit('room:created', newRoom);
  });

  socket.on('room:join', ({ code, name, avatar, userId }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Sector not found.');
    const p = room.players.find(x => x.userId === userId);
    if (p) { p.id = socket.id; p.isConnected = true; } else room.players.push({ id: socket.id, userId, name, avatar, isHost: false, score: 0, isReady: false, isConnected: true });
    socket.join(code);
    io.to(code).emit('room:update', room);
    socket.emit('room:joined', room);
  });

  socket.on('room:get', ({ code, userId }) => {
    const room = rooms.get(code);
    if (room) {
      if (userId) { const p = room.players.find(x => x.userId === userId); if(p) { p.id = socket.id; p.isConnected = true; } }
      socket.join(code);
      io.to(code).emit('room:update', room);
    }
  });

  socket.on('room:leave', ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== socket.id);
    
    if (room.players.length === 0) {
      rooms.delete(code);
    } else {
      const hostExists = room.players.some(p => p.isHost && p.isConnected);
      if (!hostExists) {
        const nextHost = room.players.find(p => p.isConnected);
        if (nextHost) nextHost.isHost = true;
      }
      io.to(code).emit('room:update', room);
    }
    
    socket.leave(code);
    socket.emit('room:left');
  });

  socket.on('game:start', async ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.players.find(p => p.id === socket.id)?.isHost === false) return;
    room.currentGame = 'brain'; room.gameStatus = 'readying'; room.players.forEach(p => p.isReady = false);
    io.to(code).emit('room:update', room);
    io.to(code).emit('system:narrator', { message: "Generating fresh AI patterns..." });
    const qs = await GroqService.generateQuestions("mixed trivia", 10);
    if (qs) { room.gameState = { ...room.gameState, aiQuestions: qs }; io.to(code).emit('system:narrator', { message: "AI dataset injected." }); }
    else io.to(code).emit('system:narrator', { message: "AI link error." });
  });

  socket.on('game:ready', ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    const p = room.players.find(x => x.id === socket.id);
    if (p) { p.isReady = true; io.to(code).emit('room:update', room); if (room.players.filter(x => x.isConnected).every(x => x.isReady)) { room.gameStatus = 'playing'; io.to(code).emit('room:update', room); gameRegistry.get('brain')?.start(io, room); } }
  });

  socket.on('game:abort', ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    
    const p = room.players.find(x => x.id === socket.id);
    if (!p || !p.isHost) return;
    
    room.currentGame = null;
    room.gameStatus = 'lobby';
    room.gameState = null;
    room.players.forEach(p => p.isReady = false);
    
    io.to(code).emit('room:update', room);
    io.to(code).emit('system:narrator', { message: "Match aborted by sector commander." });
  });


  socket.on('game:input', ({ code, data }) => {
    const room = rooms.get(code);
    if (room?.currentGame) gameRegistry.get(room.currentGame)?.handleInput(io, socket, room, data);
  });

  socket.on('disconnect', () => {
    totalConnections--;
    onlineUsers.forEach((v, k) => { if (v.socketId === socket.id) onlineUsers.delete(k); });
    broadcastOnlineList();
    rooms.forEach((room, code) => {
      const p = room.players.find(x => x.id === socket.id);
      if (p) { p.isConnected = false; if (p.isHost) { const next = room.players.find(x => x.isConnected); if(next) next.isHost = true; } io.to(code).emit('room:update', room); }
    });
  });
});

const PORT = Number(process.env.PORT) || 8080;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 FUMIK ONLINE`));
