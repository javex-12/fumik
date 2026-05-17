import { Server, Socket } from 'socket.io';
import { Room } from '@fumik/shared/types';
import { IGame } from './BaseGame';

class GameRegistry {
  private games: Map<string, IGame> = new Map();

  register(game: IGame) {
    this.games.set(game.type, game);
  }

  get(type: string): IGame | undefined {
    return this.games.get(type);
  }
}

export const gameRegistry = new GameRegistry();
