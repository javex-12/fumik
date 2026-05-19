import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

const VOTE_QUESTIONS = [
  { q: "Pizza or Jollof Rice?", a: "Pizza", b: "Jollof Rice" },
  { q: "Beach or Mountains?", a: "Beach", b: "Mountains" },
  { q: "Call or Text?", a: "Call", b: "Text" },
  { q: "Early Bird or Night Owl?", a: "Early Bird", b: "Night Owl" },
  { q: "Money or Love?", a: "Money", b: "Love" },
  { q: "Instagram or WhatsApp?", a: "Instagram", b: "WhatsApp" },
  { q: "Hot or Cold?", a: "Hot", b: "Cold" },
];

export class VoteGame extends BaseGame {
  constructor() {
    super('vote');
  }

  start(io: Server, room: Room) {
    room.gameState = {
      status: 'starting',
      round: 0,
      eliminatedUserIds: [],
      lives: room.players.reduce((acc, p) => ({ ...acc, [p.userId]: 3 }), {}),
    };

    io.to(room.code).emit('vote:starting', { countdown: 3 });

    setTimeout(() => {
      this.startRound(io, room);
    }, 3000);
  }

  private startRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'vote') return;

    const question = VOTE_QUESTIONS[Math.floor(Math.random() * VOTE_QUESTIONS.length)];
    room.gameState.currentQuestion = question;
    room.gameState.votes = {}; // userId -> option
    room.gameState.status = 'playing';
    room.gameState.round++;

    io.to(room.code).emit('vote:question', { question, round: room.gameState.round });

    room.gameState.timer = setTimeout(() => {
      this.endRound(io, room);
    }, 10000);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'vote' || room.gameState.status !== 'playing') return;
    const { option } = data;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || room.gameState.eliminatedUserIds.includes(player.userId)) return;

    if (room.gameState.votes[player.userId] !== undefined) return;
    room.gameState.votes[player.userId] = option;

    const activePlayers = room.players.filter(p => p.isConnected && !room.gameState.eliminatedUserIds.includes(p.userId));
    if (Object.keys(room.gameState.votes).length === activePlayers.length) {
      this.endRound(io, room);
    }
  }

  private endRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'vote') return;

    clearTimeout(room.gameState.timer);

    const votes = Object.values(room.gameState.votes);
    const countA = votes.filter(v => v === 'A').length;
    const countB = votes.filter(v => v === 'B').length;

    let majority: 'A' | 'B' | 'NONE';
    if (countA > countB) majority = 'A';
    else if (countB > countA) majority = 'B';
    else majority = 'NONE';

    const activePlayers = room.players.filter(p => p.isConnected && !room.gameState.eliminatedUserIds.includes(p.userId));
    
    activePlayers.forEach(p => {
      const vote = room.gameState.votes[p.userId];
      if (majority === 'NONE' || vote !== majority) {
        room.gameState.lives[p.userId]--;
      }
    });

    Object.entries(room.gameState.lives).forEach(([uid, lives]) => {
      if ((lives as number) <= 0 && !room.gameState.eliminatedUserIds.includes(uid)) {
        room.gameState.eliminatedUserIds.push(uid);
      }
    });

    const survivors = room.players.filter(p => p.isConnected && !room.gameState.eliminatedUserIds.includes(p.userId));

    io.to(room.code).emit('vote:reveal', {
      votes: room.gameState.votes,
      majority,
      lives: room.gameState.lives,
      eliminated: room.gameState.eliminatedUserIds,
    });

    if (survivors.length <= 1) {
      this.end(io, room, survivors[0]?.name || 'Nobody');
    } else {
      setTimeout(() => {
        this.startRound(io, room);
      }, 4000);
    }
  }
}