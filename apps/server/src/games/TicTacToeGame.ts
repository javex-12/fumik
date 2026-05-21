import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';

export class TicTacToeGame extends BaseGame {
  constructor() {
    super('tictactoe');
  }

  start(io: Server, room: Room) {
    // Assign teams and store in gameState instead of just player object
    const players = room.players.filter(p => p.isConnected);
    const teams: Record<string, string> = {};
    players.forEach((p, i) => {
      const team = i % 2 === 0 ? 'X' : 'O';
      (p as any).team = team;
      teams[p.userId] = team;
    });

    room.gameState = {
      status: 'playing',
      board: Array(9).fill(null),
      turn: 'X',
      winner: null,
      teams: teams
    };

    io.to(room.code).emit('tictactoe:start', { 
      teams: teams,
      board: room.gameState.board,
      turn: room.gameState.turn
    });
    
    // Also update room to sync teams in player list
    io.to(room.code).emit('room:update', room);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'tictactoe' || room.gameState.status !== 'playing') return;
    const { index } = data;
    const player = room.players.find(p => p.id === socket.id);
    const playerTeam = (player as any)?.team;

    if (!playerTeam || playerTeam !== room.gameState.turn) return;
    if (room.gameState.board[index] !== null) return;

    room.gameState.board[index] = playerTeam;
    
    const winner = this.checkWinner(room.gameState.board);
    if (winner) {
      room.gameState.status = 'result';
      room.gameState.winner = winner;
      
      // Award points to team
      room.players.forEach(p => {
        if ((p as any).team === winner) p.score += 100;
      });

      io.to(room.code).emit('tictactoe:update', { board: room.gameState.board, turn: room.gameState.turn, winner });
      
      setTimeout(() => {
        this.end(io, room, `Team ${winner}`);
      }, 5000);
    } else if (room.gameState.board.every((cell: any) => cell !== null)) {
      room.gameState.status = 'result';
      io.to(room.code).emit('tictactoe:update', { board: room.gameState.board, turn: room.gameState.turn, winner: 'DRAW' });
      setTimeout(() => {
        this.end(io, room, 'DRAW');
      }, 5000);
    } else {
      room.gameState.turn = room.gameState.turn === 'X' ? 'O' : 'X';
      io.to(room.code).emit('tictactoe:update', { board: room.gameState.board, turn: room.gameState.turn });
    }
  }

  private checkWinner(board: any[]) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
  }
}