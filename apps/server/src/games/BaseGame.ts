import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';

export interface IGame {
  type: string;
  start(io: Server, room: Room): void;
  handleInput(io: Server, socket: Socket, room: Room, data: any): void;
  cleanup?(): void;
}

export abstract class BaseGame implements IGame {
  constructor(public type: string) {}

  abstract start(io: Server, room: Room): void;
  abstract handleInput(io: Server, socket: Socket, room: Room, data: any): void;

  protected broadcastUpdate(io: Server, roomCode: string, room: Room) {
    io.to(roomCode).emit('room:update', room);
  }

  protected end(io: Server, room: Room, winner?: string | Player[]) {
    io.to(room.code).emit(`${this.type}:gameover`, { winner });
    room.currentGame = null;
    room.gameState = null;
    io.to(room.code).emit('room:update', room);
  }
}
