import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';
import { TRIVIA_QUESTIONS } from '../questions';

export class BrainGame extends BaseGame {
  constructor() {
    super('brain');
  }

  start(io: Server, room: Room) {
    room.gameState = {
      status: 'starting',
      round: 0,
      totalRounds: 10,
      questions: [...TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10),
    };

    io.to(room.code).emit('brain:starting', { countdown: 3 });

    setTimeout(() => {
      this.startRound(io, room);
    }, 3000);
  }

  private startRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'brain') return;

    room.gameState.status = 'playing';
    room.gameState.playerAnswers = {};
    room.gameState.currentQuestion = room.gameState.questions[room.gameState.round];
    room.gameState.questionStartTime = Date.now();
    room.round = room.gameState.round + 1;

    io.to(room.code).emit('brain:question', {
      question: room.gameState.currentQuestion,
      round: room.round,
      total: room.gameState.totalRounds,
    });

    room.gameState.timer = setTimeout(() => {
      this.endRound(io, room);
    }, 10000);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'brain') return;
    const { questionId, answerIndex } = data;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isConnected || room.gameState.playerAnswers[socket.id] !== undefined) return;

    const currentQuestion = room.gameState.currentQuestion;
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const now = Date.now();
    const timeTaken = now - room.gameState.questionStartTime;

    room.gameState.playerAnswers[socket.id] = { answerIndex, isCorrect, timeTaken };

    if (isCorrect) {
      const correctAnswers = Object.values(room.gameState.playerAnswers).filter((a: any) => a.isCorrect);
      const points = correctAnswers.length === 1 ? 100 : correctAnswers.length === 2 ? 80 : correctAnswers.length === 3 ? 70 : 60;
      player.score += points;
    } else {
      player.score -= 10;
    }

    const activePlayers = room.players.filter(p => p.isConnected);
    if (Object.keys(room.gameState.playerAnswers).length === activePlayers.length) {
      this.endRound(io, room);
    }
  }

  private endRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'brain') return;

    clearTimeout(room.gameState.timer);

    const correctIndex = room.gameState.currentQuestion.correctIndex;
    
    io.to(room.code).emit('brain:reveal', {
      correctIndex,
      playerAnswers: room.gameState.playerAnswers,
      scores: room.players.map(p => ({ id: p.id, score: p.score })),
    });

    room.gameState.round++;

    if (room.gameState.round >= room.gameState.totalRounds) {
      setTimeout(() => {
        const sortedScores = [...room.players].sort((a, b) => b.score - a.score);
        this.end(io, room, sortedScores);
      }, 4000);
    } else {
      setTimeout(() => {
        this.startRound(io, room);
      }, 4000);
    }
  }
}
