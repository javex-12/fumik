import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import Matter from 'matter-js';
import os from 'os';
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

dotenv.config();

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
  console.log(`🔌 New Connection: ${socket.id}`);

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('social:login', ({ userId, name, avatar }) => {
    console.log(`👤 Social Login: ${name} (${userId})`);
    onlineUsers.set(userId, { socketId: socket.id, name, avatar });
    io.emit('social:online-count', onlineUsers.size);
  });

  socket.on('social:get-online', () => {
    const users = Array.from(onlineUsers.entries()).map(([userId, data]) => ({
      userId,
      ...data
    }));
    socket.emit('social:online-list', users);
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

    console.log(`🎮 Start Game: ${gameType} in ${code}`);
    room.currentGame = gameType;
    room.gameStatus = 'readying';
    room.players.forEach(p => p.isReady = false);
    io.to(code).emit('room:update', room);

    if (gameType === 'brain') {
      console.log(`🧠 Generating AI questions for room ${code}...`);
      const aiQuestions = await GroqService.generateQuestions("mixed trivia", 10);
      if (aiQuestions) {
        room.gameState = { ...room.gameState, aiQuestions };
        console.log(`✅ AI Questions ready!`);
      }
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
    console.log(`🔌 Disconnected: ${socket.id}`);
    
    onlineUsers.forEach((data, userId) => {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    });
    io.emit('social:online-count', onlineUsers.size);

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
