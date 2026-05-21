import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

export class BrainGame extends BaseGame {
  constructor() {
    super('brain');
  }

  start(io: Server, room: Room) {
    // Strictly require AI questions pre-fetched during readying phase
    const questions = room.gameState?.aiQuestions;
    
    if (!questions || questions.length === 0) {
      io.to(room.code).emit('system:narrator', { message: "Critical Error: Brain War dataset not found. Aborting." });
      room.gameStatus = 'lobby';
      room.currentGame = null;
      io.to(room.code).emit('room:update', room);
      return;
    }

    room.gameState = {
      ...room.gameState,
      status: 'starting',
      round: 0,
      totalRounds: questions.length,
      questions: questions,
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

    // Clean up previous timer if any
    if (room.gameState.timer) clearTimeout(room.gameState.timer);

    room.gameState.timer = setTimeout(() => {
      this.endRound(io, room);
    }, 10000);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'brain' || room.gameState.status !== 'playing') return;
    const { answerIndex } = data;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isConnected || room.gameState.playerAnswers[player.userId] !== undefined) return;

    const currentQuestion = room.gameState.currentQuestion;
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const now = Date.now();
    const timeTaken = now - room.gameState.questionStartTime;

    room.gameState.playerAnswers[player.userId] = { answerIndex, isCorrect, timeTaken };

    if (isCorrect) {
      // Correct answer speed bonus
      const points = Math.max(10, Math.floor(100 - (timeTaken / 100)));
      player.score += points;
    } else {
      player.score -= 20;
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
      scores: room.players.map(p => ({ id: p.id, userId: p.userId, score: p.score })),
    });

    room.gameState.round++;

    if (room.gameState.round >= room.gameState.totalRounds) {
      setTimeout(() => {
        this.end(io, room, "Match Complete");
      }, 4000);
    } else {
      setTimeout(() => {
        this.startRound(io, room);
      }, 4000);
    }
  }
}