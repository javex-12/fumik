import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

export class ReflexGame extends BaseGame {
  constructor() {
    super('reflex');
  }

  start(io: Server, room: Room) {
    room.gameState = {
      status: 'starting',
      round: 0,
      eliminatedIds: [],
      lives: room.players.reduce((acc, p) => ({ ...acc, [p.id]: 3 }), {}),
    };

    io.to(room.code).emit('reflex:starting', { countdown: 3 });

    setTimeout(() => {
      this.startRound(io, room);
    }, 3000);
  }

  private startRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'reflex') return;

    room.gameState.status = 'waiting';
    room.gameState.tappedIds = [];
    room.gameState.signalTime = 0;
    room.gameState.winner = null;
    room.round++;

    io.to(room.code).emit('reflex:waiting', { round: room.round });

    const delay = Math.floor(Math.random() * 3500) + 1500;
    
    room.gameState.timer = setTimeout(() => {
      if (!room.gameState) return;
      room.gameState.status = 'GO';
      room.gameState.signalTime = Date.now();
      io.to(room.code).emit('reflex:GO');

      room.gameState.roundEndTimer = setTimeout(() => {
        this.endRound(io, room);
      }, 2000);
    }, delay);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'reflex') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isConnected || room.gameState.eliminatedIds?.includes(socket.id)) return;

    const now = Date.now();
    const { status, signalTime, tappedIds } = room.gameState;

    if (status === 'waiting') {
      player.score -= 5;
      socket.emit('reflex:penalty', { playerId: socket.id });
      return;
    }

    if (status === 'GO' && !tappedIds.includes(socket.id)) {
      const reactionTime = now - signalTime;
      tappedIds.push(socket.id);
      
      if (tappedIds.length === 1) {
        player.score += 10;
        room.gameState.winner = player.name;
        socket.broadcast.to(room.code).emit('reflex:roundWinner', { winner: player.name, reactionTime });
        socket.emit('reflex:roundWinner', { winner: player.name, reactionTime });
      }

      const activePlayers = room.players.filter(p => p.isConnected && !room.gameState.eliminatedIds.includes(p.id));
      if (tappedIds.length === activePlayers.length) {
        this.endRound(io, room);
      }
    }
  }

  private endRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'reflex') return;

    clearTimeout(room.gameState.timer);
    clearTimeout(room.gameState.roundEndTimer);

    const activePlayers = room.players.filter(p => p.isConnected && !room.gameState.eliminatedIds.includes(p.id));
    const tappedIds = room.gameState.tappedIds;

    activePlayers.forEach(p => {
      if (!tappedIds.includes(p.id)) {
        room.gameState.lives[p.id]--;
      }
    });

    if (tappedIds.length === activePlayers.length && activePlayers.length > 1) {
      const lastId = tappedIds[tappedIds.length - 1];
      room.gameState.lives[lastId]--;
    }

    Object.entries(room.gameState.lives).forEach(([pid, lives]) => {
      if ((lives as number) <= 0 && !room.gameState.eliminatedIds.includes(pid)) {
        room.gameState.eliminatedIds.push(pid);
      }
    });

    const survivors = room.players.filter(p => p.isConnected && !room.gameState.eliminatedIds.includes(p.id));

    io.to(room.code).emit('reflex:result', {
      lives: room.gameState.lives,
      eliminated: room.gameState.eliminatedIds,
      winner: room.gameState.winner,
    });

    if (survivors.length <= 1) {
      const gameWinner = survivors[0]?.name || 'Nobody';
      this.end(io, room, gameWinner);
    } else {
      setTimeout(() => {
        this.startRound(io, room);
      }, 3000);
    }
  }
}
