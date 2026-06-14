import { BrainGame } from './BrainGame';

class GameRegistry {
  private games: Map<string, any> = new Map();

  register(game: any) {
    this.games.set(game.type, game);
  }

  get(type: string): any | undefined {
    return this.games.get(type);
  }
}

export const gameRegistry = new GameRegistry();
gameRegistry.register(new BrainGame());
