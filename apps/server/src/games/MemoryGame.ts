import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

export class MemoryGame extends BaseGame {
  constructor() {
    super('memory');
  }

  start(io: Server, room: Room) {
    room.gameState = {
      status: 'starting',
      round: 1,
      sequence: [],
      eliminatedUserIds: [],
    };

    io.to(room.code).emit('memory:starting', { countdown: 3 });

    setTimeout(() => {
      this.startRound(io, room);
    }, 3000);
  }

  private startRound(io: Server, room: Room) {
    if (!room.gameState || room.currentGame !== 'memory') return;

    // Add new step to sequence
    const nextStep = Math.floor(Math.random() * 4); // 0: Red, 1: Blue, 2: Green, 3: Yellow
    room.gameState.sequence.push(nextStep);
    room.gameState.status = 'showing';
    room.gameState.playerProgress = room.players.reduce((acc, p) => ({ ...acc, [p.userId]: 0 }), {});

    io.to(room.code).emit('memory:sequence', { 
      sequence: room.gameState.sequence,
      round: room.gameState.round 
    });

    // Wait for sequence to finish showing (e.g. 1s per step + buffer)
    const showDuration = room.gameState.sequence.length * 800 + 1000;
    
    setTimeout(() => {
      if (!room.gameState) return;
      room.gameState.status = 'input';
      io.to(room.code).emit('memory:input_start');
    }, showDuration);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'memory' || room.gameState.status !== 'input') return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player || room.gameState.eliminatedUserIds?.includes(player.userId)) return;

    const { step } = data;
    const progress = room.gameState.playerProgress[player.userId];
    const expected = room.gameState.sequence[progress];

    if (step === expected) {
      room.gameState.playerProgress[player.userId]++;
      
      if (room.gameState.playerProgress[player.userId] === room.gameState.sequence.length) {
        // Player completed sequence
        player.score += 10 * room.gameState.round;
        
        // Check if all survivors finished
        const survivors = room.players.filter(p => p.isConnected && !room.gameState.eliminatedUserIds?.includes(p.userId));
        const finishedCount = Object.keys(room.gameState.playerProgress).filter((uid) => {
           return room.gameState.playerProgress[uid] === room.gameState.sequence.length || room.gameState.eliminatedUserIds?.includes(uid);
        }).length;

        if (finishedCount === survivors.length + (room.gameState.eliminatedUserIds?.length || 0)) {
          this.nextRound(io, room);
        }
      }
    } else {
      // Wrong step
      if (!room.gameState.eliminatedUserIds) room.gameState.eliminatedUserIds = [];
      room.gameState.eliminatedUserIds.push(player.userId);
      socket.emit('memory:eliminated');
      
      const survivors = room.players.filter(p => p.isConnected && !room.gameState.eliminatedUserIds.includes(p.userId));
      if (survivors.length === 0) {
        this.end(io, room, 'Nobody');
      } else if (survivors.length === 1 && room.players.length > 1) {
        this.end(io, room, survivors[0].name);
      }
    }
  }

  private nextRound(io: Server, room: Room) {
    room.gameState.round++;
    io.to(room.code).emit('memory:round_success');
    setTimeout(() => {
      this.startRound(io, room);
    }, 2000);
  }
}