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
      eliminatedIds: [],
      lives: room.players.reduce((acc, p) => ({ ...acc, [p.id]: 3 }), {}),
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
    room.gameState.votes = {};
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

    if (room.gameState.votes[socket.id] !== undefined) return;
    room.gameState.votes[socket.id] = option;

    const activePlayers = room.players.filter(p => p.isConnected && !room.gameState.eliminatedIds.includes(p.id));
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

    const activePlayers = room.players.filter(p => p.isConnected && !room.gameState.eliminatedIds.includes(p.id));
    
    activePlayers.forEach(p => {
      const vote = room.gameState.votes[p.id];
      if (majority === 'NONE' || vote !== majority) {
        room.gameState.lives[p.id]--;
      }
    });

    Object.entries(room.gameState.lives).forEach(([pid, lives]) => {
      if ((lives as number) <= 0 && !room.gameState.eliminatedIds.includes(pid)) {
        room.gameState.eliminatedIds.push(pid);
      }
    });

    const survivors = room.players.filter(p => p.isConnected && !room.gameState.eliminatedIds.includes(p.id));

    io.to(room.code).emit('vote:reveal', {
      votes: room.gameState.votes,
      majority,
      lives: room.gameState.lives,
      eliminated: room.gameState.eliminatedIds,
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