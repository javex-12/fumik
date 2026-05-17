import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

const EMOJI_SETS = [
  { group: ['🍎', '🍐', '🍑', '🍒', '🍓'], odd: '🥦' },
  { group: ['🐶', '🐱', '🐭', '🐹', '🐰'], odd: '✈️' },
  { group: ['🚗', '🚕', '🚙', '🚌', '🏎️'], odd: '🍔' },
  { group: ['⚽', '🏀', '🏈', '⚾', '🎾'], odd: '🎻' },
  { group: ['🎸', '🎺', '🎻', '🎹', '🥁'], odd: '⚽' },
];

export class EmojiGame extends BaseGame {
  constructor() {
    super('emoji');
  }

  start(io: Server, room: Room) {
    room.gameState = {
      status: 'starting',
      round: 0,
      totalRounds: 8,
    };

    io.to(room.code).emit('emoji:starting', { countdown: 3 });

    setTimeout(() => {
      this.startRound(io, room);
    }, 3000);
  }

  private startRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'emoji') return;

    const set = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];
    const options = [...set.group.slice(0, 3), set.odd].sort(() => Math.random() - 0.5);
    
    room.gameState.options = options;
    room.gameState.correctEmoji = set.odd;
    room.gameState.status = 'playing';
    room.gameState.startTime = Date.now();
    room.gameState.answeredIds = [];

    io.to(room.code).emit('emoji:question', {
      options,
      round: room.gameState.round + 1,
      total: room.gameState.totalRounds
    });

    room.gameState.timer = setTimeout(() => {
      this.endRound(io, room);
    }, 5000);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'emoji' || room.gameState.status !== 'playing') return;
    const { emoji } = data;

    if (room.gameState.answeredIds.includes(socket.id)) return;

    if (emoji === room.gameState.correctEmoji) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.score += 50;
        room.gameState.answeredIds.push(socket.id);
        socket.emit('emoji:correct');
        
        const activePlayers = room.players.filter(p => p.isConnected);
        if (room.gameState.answeredIds.length === activePlayers.length) {
          this.endRound(io, room);
        }
      }
    } else {
      socket.emit('emoji:wrong');
    }
  }

  private endRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'emoji') return;

    clearTimeout(room.gameState.timer);
    room.gameState.round++;

    io.to(room.code).emit('emoji:reveal', { correct: room.gameState.correctEmoji });

    if (room.gameState.round >= room.gameState.totalRounds) {
      const winner = [...room.players].sort((a, b) => b.score - a.score)[0].name;
      this.end(io, room, winner);
    } else {
      setTimeout(() => {
        this.startRound(io, room);
      }, 2500);
    }
  }
}