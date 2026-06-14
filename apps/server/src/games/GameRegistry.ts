import { BrainGame } from './BrainGame';
import { ClickerGame } from './ClickerGame';
import { ScribbleGame } from './ScribbleGame';

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
gameRegistry.register(new ClickerGame());
gameRegistry.register(new ScribbleGame());
