import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

const SCRIBBLE_WORDS = [
  'Pizza', 'Elephant', 'Lagos', 'Football', 'Robot', 'Dancing', 'Burger', 'Africa', 'Ocean', 'Rocket', 'Money', 'Magic'
];

export class ScribbleGame extends BaseGame {
  constructor() {
    super('scribble');
  }

  start(io: Server, room: Room) {
    room.gameState = {
      status: 'starting',
      round: 0,
      drawerOrder: room.players.filter(p => p.isConnected).map(p => p.userId).sort(() => Math.random() - 0.5),
    };

    io.to(room.code).emit('scribble:starting', { countdown: 3 });

    setTimeout(() => {
      this.startRound(io, room);
    }, 3000);
  }

  private startRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'scribble') return;

    const drawerUserId = room.gameState.drawerOrder[room.gameState.round % room.gameState.drawerOrder.length];
    const word = SCRIBBLE_WORDS[Math.floor(Math.random() * SCRIBBLE_WORDS.length)];

    room.gameState.drawerUserId = drawerUserId;
    room.gameState.word = word;
    room.gameState.canvas = [];
    room.gameState.status = 'playing';

    const drawer = room.players.find(p => p.userId === drawerUserId);
    
    room.players.forEach(p => {
      if (p.userId === drawerUserId) {
        io.to(p.id).emit('scribble:word', { word });
      } else {
        io.to(p.id).emit('scribble:ready', { drawer: drawer?.name });
      }
    });

    io.to(room.code).emit('scribble:roundStart', { drawerId: drawer?.id, round: room.gameState.round + 1 });

    room.gameState.timer = setTimeout(() => {
      this.endRound(io, room);
    }, 60000);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'scribble') return;
    const { action, ...payload } = data;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (action === 'draw') {
      if (room.gameState.drawerUserId !== player.userId) return;
      room.gameState.canvas.push(payload);
      socket.broadcast.to(room.code).emit('scribble:update', { canvas: [payload] });
    } else if (action === 'guess') {
      if (room.gameState.drawerUserId === player.userId) return;
      const correctWord = room.gameState.word.toLowerCase();
      const guess = payload.text.toLowerCase().trim();

      if (guess === correctWord) {
        const drawer = room.players.find(p => p.userId === room.gameState.drawerUserId);
        
        player.score += 100;
        if (drawer) drawer.score += 50;

        io.to(room.code).emit('scribble:correct', { player: player.name, word: room.gameState.word });
        this.endRound(io, room);
      } else {
        socket.emit('scribble:wrong', { text: payload.text });
      }
    }
  }

  private endRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'scribble') return;

    clearTimeout(room.gameState.timer);
    room.gameState.round++;

    if (room.gameState.round >= room.gameState.drawerOrder.length) {
      const winner = [...room.players].sort((a, b) => b.score - a.score)[0].name;
      this.end(io, room, winner);
    } else {
      setTimeout(() => {
        this.startRound(io, room);
      }, 4000);
    }
  }
}