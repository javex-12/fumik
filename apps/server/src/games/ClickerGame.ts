import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

export class ClickerGame extends BaseGame {
  constructor() {
    super('clicker');
  }

  start(io: Server, room: Room) {
    room.gameState = {
      status: 'starting',
      clicks: room.players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
      duration: 10000, // 10 seconds
    };

    io.to(room.code).emit('clicker:starting', { countdown: 3 });

    setTimeout(() => {
      this.startPlaying(io, room);
    }, 3000);
  }

  private startPlaying(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'clicker') return;

    room.gameState.status = 'playing';
    room.gameState.startTime = Date.now();
    
    io.to(room.code).emit('clicker:go', { duration: room.gameState.duration });

    setTimeout(() => {
      this.endGame(io, room);
    }, room.gameState.duration);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'clicker' || room.gameState.status !== 'playing') return;

    room.gameState.clicks[socket.id] = (room.gameState.clicks[socket.id] || 0) + 1;
  }

  private endGame(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'clicker') return;

    const clicks = room.gameState.clicks;
    const sorted = Object.entries(clicks)
      .map(([id, count]) => ({ id, count: count as number }))
      .sort((a, b) => b.count - a.count);

    // Award scores
    sorted.forEach((item, index) => {
      const player = room.players.find(p => p.id === item.id);
      if (player) {
        if (index === 0) player.score += 100;
        else if (index === 1) player.score += 70;
        else if (index === 2) player.score += 50;
        else player.score += 20;
      }
    });

    const winnerName = room.players.find(p => p.id === sorted[0]?.id)?.name || 'Nobody';
    
    io.to(room.code).emit('clicker:results', { clicks, winner: winnerName });
    
    setTimeout(() => {
      this.end(io, room, winnerName);
    }, 5000);
  }
}