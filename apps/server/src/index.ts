import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import Matter from 'matter-js';
import os from 'os';
import mongoose from 'mongoose';
import { Room, Player } from '@fumik/shared/types';
import { ROOM_CODE_LENGTH, INACTIVITY_TIMEOUT } from '@fumik/shared/constants';
import { gameRegistry } from './games/GameRegistry';
import { ReflexGame } from './games/ReflexGame';
import { BrainGame } from './games/BrainGame';
import { ClickerGame } from './games/ClickerGame';
import { VoteGame } from './games/VoteGame';
import { ScribbleGame } from './games/ScribbleGame';
import { MathGame } from './games/MathGame';
import { EmojiGame } from './games/EmojiGame';
import { TicTacToeGame } from './games/TicTacToeGame';
import { MemoryGame } from './games/MemoryGame';
import { BallGame } from './games/BallGame';
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

gameRegistry.register(new ReflexGame());
gameRegistry.register(new BrainGame());
gameRegistry.register(new ClickerGame());
gameRegistry.register(new VoteGame());
gameRegistry.register(new ScribbleGame());
gameRegistry.register(new MathGame());
gameRegistry.register(new EmojiGame());
gameRegistry.register(new TicTacToeGame());
gameRegistry.register(new MemoryGame());
gameRegistry.register(new BallGame());

const app = express();
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());

app.get('/ping', (req, res) => res.send({ status: 'pong' }));
app.get('/', (req, res) => res.send({ status: 'online', ip: localIP }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms: Map<string, Room> = new Map();
const onlineUsers: Map<string, { socketId: string, name: string, avatar: string }> = new Map();
let totalConnections = 0;

// Broadcast full list + count to ALL clients so everyone's UI updates in real-time
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
    if (now.getTime() - room.lastActivity.getTime() > INACTIVITY_TIMEOUT) {
      console.log(`🧹 Deleting expired room: ${code}`);
      rooms.delete(code);
    }
  });
}, 60000);

io.on('connection', (socket) => {
  totalConnections++;
  console.log(`🔌 New Connection: ${socket.id} (Total: ${totalConnections})`);
  broadcastOnlineList();

  socket.on('ping', () => {
    socket.emit('pong');
  });

  // --- SOCIAL: Register / Login by username + device token ---
  socket.on('social:register', async ({ username, token, avatar }) => {
    try {
      if (!isMongoConnected()) {
        let user = Array.from(inMemoryUsers.values()).find(u => u.token === token);
        if (user) {
          user.avatar = avatar;
          user.isOnline = true;
          onlineUsers.set(user._id, { socketId: socket.id, name: user.username, avatar: user.avatar });
          broadcastOnlineList();
          socket.emit('social:registered', { ok: true, username: user.username, userId: user._id });
        } else {
          const taken = Array.from(inMemoryUsers.values()).find(u => u.username === username.toLowerCase().trim());
          if (taken) {
            return socket.emit('social:registered', { ok: false, error: `"${username}" is already taken. Pick a different name!` });
          }
          const mockId = 'mem_' + Math.random().toString(36).substr(2, 9);
          const newUser = { _id: mockId, username: username.toLowerCase().trim(), token, avatar, isOnline: true, friends: [], friendRequests: [] };
          inMemoryUsers.set(mockId, newUser);
          onlineUsers.set(mockId, { socketId: socket.id, name: newUser.username, avatar });
          broadcastOnlineList();
          socket.emit('social:registered', { ok: true, username: newUser.username, userId: mockId });
        }
        return;
      }

      let user = await User.findOne({ token });
      if (user) {
        // Existing user: update avatar and online status
        user.avatar = avatar;
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        onlineUsers.set(user._id.toString(), { socketId: socket.id, name: user.username, avatar: user.avatar });
        broadcastOnlineList();
        socket.emit('social:registered', { ok: true, username: user.username, userId: user._id.toString() });
      } else {
        // New user: check if username is taken
        const taken = await User.findOne({ username: username.toLowerCase().trim() });
        if (taken) {
          return socket.emit('social:registered', { ok: false, error: `"${username}" is already taken. Pick a different name!` });
        }
        user = new User({ username: username.toLowerCase().trim(), token, avatar, isOnline: true });
        await user.save();
        onlineUsers.set(user._id.toString(), { socketId: socket.id, name: user.username, avatar });
        broadcastOnlineList();
        socket.emit('social:registered', { ok: true, username: user.username, userId: user._id.toString() });
      }
    } catch (err: any) {
      socket.emit('social:registered', { ok: false, error: 'Server error. Try again.' });
    }
  });

  socket.on('social:get-online', async () => {
    try {
      const users = Array.from(onlineUsers.entries()).map(([userId, data]) => ({ userId, ...data }));
      socket.emit('social:online-list', users);
    } catch (err) {}
  });

  socket.on('social:search', async ({ query }) => {
    try {
      if (!isMongoConnected()) {
        const results = Array.from(inMemoryUsers.values())
          .filter(u => u.username.toLowerCase().includes(query.toLowerCase().trim()))
          .slice(0, 10);
        socket.emit('social:search-results', results.map(u => ({
          userId: u._id,
          name: u.username,
          avatar: u.avatar,
          isOnline: onlineUsers.has(u._id)
        })));
        return;
      }

      const results = await User.find({
        username: { $regex: query, $options: 'i' }
      }).limit(10).select('_id username avatar');
      socket.emit('social:search-results', results.map(u => ({
        userId: u._id.toString(),
        name: u.username,
        avatar: u.avatar,
        isOnline: onlineUsers.has(u._id.toString())
      })));
    } catch (err) {
      socket.emit('social:search-results', []);
    }
  });

  socket.on('social:friend-request', async ({ fromUserId, toUserId }) => {
    try {
      if (!isMongoConnected()) {
        const toUser = inMemoryUsers.get(toUserId);
        const fromUser = inMemoryUsers.get(fromUserId);
        if (!toUser || !fromUser) return;
        if (!toUser.friendRequests.includes(fromUserId)) {
          toUser.friendRequests.push(fromUserId);
        }
        const targetSocket = onlineUsers.get(toUserId);
        if (targetSocket) {
          io.to(targetSocket.socketId).emit('social:friend-request', {
            fromUserId,
            fromName: fromUser.username,
            fromAvatar: fromUser.avatar
          });
        }
        return;
      }

      const toUser = await User.findById(toUserId);
      if (!toUser) return;
      const alreadySent = toUser.friendRequests.map(id => id.toString()).includes(fromUserId);
      if (!alreadySent) {
        toUser.friendRequests.push(new mongoose.Types.ObjectId(fromUserId));
        await toUser.save();
      }
      const targetSocket = onlineUsers.get(toUserId);
      const fromUser = await User.findById(fromUserId).select('username avatar');
      if (targetSocket && fromUser) {
        io.to(targetSocket.socketId).emit('social:friend-request', {
          fromUserId,
          fromName: fromUser.username,
          fromAvatar: fromUser.avatar
        });
      }
    } catch (err) {}
  });

  socket.on('social:accept-friend', async ({ myUserId, fromUserId }) => {
    try {
      if (!isMongoConnected()) {
        const me = inMemoryUsers.get(myUserId);
        const them = inMemoryUsers.get(fromUserId);
        if (!me || !them) return;
        if (!me.friends.includes(fromUserId)) {
          me.friends.push(fromUserId);
        }
        me.friendRequests = me.friendRequests.filter((id: string) => id !== fromUserId);
        if (!them.friends.includes(myUserId)) {
          them.friends.push(myUserId);
        }
        socket.emit('social:friends-updated', { message: `You and ${them.username} are now friends!` });
        return;
      }

      const me = await User.findById(myUserId);
      const them = await User.findById(fromUserId);
      if (!me || !them) return;
      // Add to each other's friends list and remove from pending
      if (!me.friends.map(id => id.toString()).includes(fromUserId)) {
        me.friends.push(new mongoose.Types.ObjectId(fromUserId));
      }
      me.friendRequests = me.friendRequests.filter(id => id.toString() !== fromUserId) as any;
      if (!them.friends.map(id => id.toString()).includes(myUserId)) {
        them.friends.push(new mongoose.Types.ObjectId(myUserId));
      }
      await me.save();
      await them.save();
      socket.emit('social:friends-updated', { message: `You and ${them.username} are now friends!` });
    } catch (err) {}
  });

  socket.on('social:get-friends', async ({ userId }) => {
    try {
      if (!isMongoConnected()) {
        const user = inMemoryUsers.get(userId);
        if (!user) return;
        socket.emit('social:friends-list', {
          friends: user.friends.map((friendId: string) => {
            const f = inMemoryUsers.get(friendId);
            return f ? { userId: f._id, name: f.username, avatar: f.avatar, isOnline: onlineUsers.has(f._id) } : null;
          }).filter(Boolean),
          requests: user.friendRequests.map((reqId: string) => {
            const f = inMemoryUsers.get(reqId);
            return f ? { userId: f._id, name: f.username, avatar: f.avatar } : null;
          }).filter(Boolean)
        });
        return;
      }

      const user = await User.findById(userId).populate('friends', '_id username avatar').populate('friendRequests', '_id username avatar');
      if (!user) return;
      socket.emit('social:friends-list', {
        friends: (user.friends as any[]).map((f: any) => ({
          userId: f._id.toString(), name: f.username, avatar: f.avatar,
          isOnline: onlineUsers.has(f._id.toString())
        })),
        requests: (user.friendRequests as any[]).map((f: any) => ({
          userId: f._id.toString(), name: f.username, avatar: f.avatar
        }))
      });
    } catch (err) {}
  });

  socket.on('social:invite', ({ toUserId, fromName, roomCode }) => {
    const target = onlineUsers.get(toUserId);
    if (target) {
      io.to(target.socketId).emit('social:invite', { fromName, roomCode });
    }
  });

  socket.on('room:create', async ({ name, avatar, userId }) => {
    console.log(`🏠 Create Room: ${name} (${userId})`);
    let code = generateRoomCode();
    while (rooms.has(code)) code = generateRoomCode();

    const host: Player = {
      id: socket.id, userId, name, avatar, isHost: true, score: 0, isReady: false, isConnected: true,
    };

    const newRoom: Room = {
      code, players: [host], currentGame: null, gameStatus: 'lobby', gameState: null,
      round: 0, leaderboard: [], createdAt: new Date(), lastActivity: new Date(), adminId: userId
    };

    rooms.set(code, newRoom);
    socket.join(code);
    socket.emit('room:created', newRoom);
    console.log(`✅ Room Created: ${code}`);
  });

  socket.on('room:join', ({ code, name, avatar, userId }) => {
    console.log(`🤝 Join Request: ${name} (${userId}) -> ${code}`);
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Room not found');

    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) {
      existingPlayer.id = socket.id;
      existingPlayer.isConnected = true;
      existingPlayer.name = name;
      existingPlayer.avatar = avatar;
      
      if (room.adminId === userId) {
        const currentHost = room.players.find(p => p.isHost);
        if (currentHost && currentHost.userId !== userId) currentHost.isHost = false;
        existingPlayer.isHost = true;
      }
    } else {
      const newPlayer: Player = {
        id: socket.id, userId, name, avatar, isHost: false, score: 0, isReady: false, isConnected: true,
      };
      room.players.push(newPlayer);
    }

    room.lastActivity = new Date();
    socket.join(code);
    io.to(code).emit('room:update', room);
    socket.emit('room:joined', room);
    console.log(`✅ Player Joined/Reconnected: ${name} to ${code}`);
  });

  socket.on('room:get', ({ code, userId }) => {
    console.log(`🔍 Get Room Data: ${code} (User: ${userId})`);
    const room = rooms.get(code);
    if (room) {
      if (userId) {
        const player = room.players.find(p => p.userId === userId);
        if (player) {
          player.id = socket.id;
          player.isConnected = true;
        }
      }
      socket.join(code);
      io.to(code).emit('room:update', room);
      console.log(`✅ Data Sent and Re-linked for ${code}`);
    } else {
      console.log(`❌ Room ${code} not found`);
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('game:start', async ({ code, gameType }) => {
    const room = rooms.get(code);
    if (!room) return;
    
    const requester = room.players.find(p => p.id === socket.id);
    if (!requester?.isHost) return;

    console.log(`🎮 Start Game Sequence: ${gameType} in ${code}`);
    room.currentGame = gameType;
    room.gameStatus = 'readying';
    room.players.forEach(p => p.isReady = false);
    
    // Immediate broadcast that we are readying
    io.to(code).emit('room:update', room);

    if (gameType === 'brain') {
      io.to(code).emit('system:narrator', { message: "Accessing Encrypted Trivia Database... Stand by." });
      try {
        const aiQuestions = await GroqService.generateQuestions("mixed trivia", 10);
        if (aiQuestions) {
          room.gameState = { ...room.gameState, aiQuestions };
          io.to(code).emit('system:narrator', { message: "Neural pathways established. AI dataset loaded." });
        } else {
          io.to(code).emit('system:narrator', { message: "AI Database offline. Using local emergency dataset." });
        }
      } catch (e) {
        io.to(code).emit('system:narrator', { message: "Neural link failed. Switching to local memory." });
      }
    }
  });

  socket.on('room:leave', ({ code }) => {
    const room = rooms.get(code);
    if (room) {
      room.players = room.players.filter(p => p.id !== socket.id);
      socket.leave(code);
      if (room.players.length === 0) {
        rooms.delete(code);
      } else {
        // Elect new host if needed
        if (!room.players.some(p => p.isHost)) {
          const next = room.players.find(p => p.isConnected);
          if (next) next.isHost = true;
        }
        io.to(code).emit('room:update', room);
      }
      socket.emit('room:left');
    }
  });

  socket.on('game:abort', ({ code }) => {
    const room = rooms.get(code);
    if (room && room.players.find(p => p.id === socket.id)?.isHost) {
      room.gameStatus = 'lobby';
      room.currentGame = null;
      room.gameState = null;
      io.to(code).emit('room:update', room);
      io.to(code).emit('system:narrator', { message: "Simulation Aborted by Commander." });
    }
  });

  socket.on('game:ready', ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = true;
      console.log(`👍 Player Ready: ${player.name}`);
      io.to(code).emit('room:update', room);
      const activePlayers = room.players.filter(p => p.isConnected);
      if (activePlayers.every(p => p.isReady)) {
        console.log(`🚀 All Ready! Starting ${room.currentGame}`);
        room.gameStatus = 'playing';
        io.to(code).emit('room:update', room);
        const game = gameRegistry.get(room.currentGame!);
        if (game) game.start(io, room);
      }
    }
  });

  socket.on('game:input', ({ code, data }) => {
    const room = rooms.get(code);
    if (room?.currentGame) {
      const game = gameRegistry.get(room.currentGame);
      if (game) game.handleInput(io, socket, room, data);
    }
  });

  socket.on('chat:message', ({ code, message }) => {
    const room = rooms.get(code);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    io.to(code).emit('chat:message', {
      playerId: player.id,
      userId: player.userId,
      playerName: player.name,
      message,
      timestamp: new Date()
    });
  });

  socket.on('call:signal', ({ to, signal }) => {
    io.to(to).emit('call:signal', {
      from: socket.id,
      signal
    });
  });

  socket.on('disconnect', () => {
    totalConnections--;
    console.log(`🔌 Disconnected: ${socket.id} (Total: ${totalConnections})`);
    
    onlineUsers.forEach((data, userId) => {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    });
    broadcastOnlineList();

    rooms.forEach((room, code) => {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        const wasHost = room.players[playerIndex].isHost;
        room.players[playerIndex].isConnected = false;

        if (wasHost) {
          const nextPlayer = room.players.find(p => p.isConnected && p.userId !== room.players[playerIndex].userId);
          if (nextPlayer) {
            room.players[playerIndex].isHost = false;
            nextPlayer.isHost = true;
            console.log(`👑 New Host assigned: ${nextPlayer.name} in room ${code}`);
          }
        }

        io.to(code).emit('room:update', room);
      }
    });
  });
});

const PORT = Number(process.env.PORT) || 8080;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 FUMIK ONLINE
Local:   http://localhost:${PORT}
Network: http://${localIP}:${PORT}
  `);
});
