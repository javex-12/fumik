export type GameStatus = 'lobby' | 'readying' | 'playing' | 'gameover';

export type Player = {
  id: string;           // socket id
  name: string;         // display name (max 16 chars)
  avatar: string;       // emoji avatar (picked on join)
  isHost: boolean;
  score: number;
  isReady: boolean;
  isConnected: boolean;
}

export type GameType = 
  | 'reflex' 
  | 'brain' 
  | 'ball' 
  | 'scribble' 
  | 'vote' 
  | 'clicker' 
  | 'memory' 
  | 'tictactoe' 
  | 'math' 
  | 'emoji' 
  | 'color';

export type Room = {
  code: string;
  players: Player[];
  currentGame: GameType | null;
  gameStatus: GameStatus;
  gameState: any;
  round: number;
  leaderboard: { name: string; avatar: string; score: number }[];
  createdAt: Date;
  lastActivity: Date;
}

export type Question = {
  id: string;
  category: string;
  question: string;
  options: string[]; // always 4
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}
