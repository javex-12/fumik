import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

export class MathGame extends BaseGame {
  constructor() {
    super('math');
  }

  start(io: Server, room: Room) {
    room.gameState = {
      status: 'starting',
      round: 0,
      totalRounds: 10,
    };

    io.to(room.code).emit('math:starting', { countdown: 3 });

    setTimeout(() => {
      this.startRound(io, room);
    }, 3000);
  }

  private startRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'math') return;

    const operators = ['+', '-', '*'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a, b, answer;

    if (op === '*') {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
    } else {
      a = Math.floor(Math.random() * 100) + 1;
      b = Math.floor(Math.random() * 100) + 1;
    }

    if (op === '+') answer = a + b;
    else if (op === '-') answer = a - b;
    else answer = a * b;

    room.gameState.question = `${a} ${op} ${b}`;
    room.gameState.answer = answer;
    room.gameState.status = 'playing';
    room.gameState.startTime = Date.now();
    room.gameState.answeredUserIds = [];

    io.to(room.code).emit('math:question', {
      question: room.gameState.question,
      round: room.gameState.round + 1,
      total: room.gameState.totalRounds
    });

    room.gameState.timer = setTimeout(() => {
      this.endRound(io, room);
    }, 8000);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'math' || room.gameState.status !== 'playing') return;
    const { answer } = data;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (room.gameState.answeredUserIds.includes(player.userId)) return;

    if (parseInt(answer) === room.gameState.answer) {
      const timeTaken = Date.now() - room.gameState.startTime;
      const points = Math.max(10, 100 - Math.floor(timeTaken / 100));
      player.score += points;
      room.gameState.answeredUserIds.push(player.userId);
      socket.emit('math:correct', { points });
      
      // If everyone answered correctly, end round early
      const activePlayers = room.players.filter(p => p.isConnected);
      if (room.gameState.answeredUserIds.length === activePlayers.length) {
        this.endRound(io, room);
      }
    } else {
      socket.emit('math:wrong');
    }
  }

  private endRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'math') return;

    clearTimeout(room.gameState.timer);
    room.gameState.round++;

    io.to(room.code).emit('math:reveal', { answer: room.gameState.answer });

    if (room.gameState.round >= room.gameState.totalRounds) {
      const winner = [...room.players].sort((a, b) => b.score - a.score)[0].name;
      this.end(io, room, winner);
    } else {
      setTimeout(() => {
        this.startRound(io, room);
      }, 3000);
    }
  }
}