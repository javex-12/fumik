export const ROOM_CODE_LENGTH = 5;
export const MAX_PLAYERS = 12;
export const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const RECONNECT_WINDOW = 2 * 60 * 1000; // 2 minutes

export const AVATARS = [
  'User', 'Zap', 'Shield', 'Sword', 'Target', 'Trophy', 'Rocket', 'Ghost', 'Crown', 'Star', 'Heart', 'Flame', 'Brain', 'Gamepad', 'Mic', 'Camera'
];

export const GAME_TYPES: { [key: string]: string } = {
  reflex: 'Reflex Royale',
  brain: 'Brain War',
  ball: 'Ball Blitz',
  scribble: 'Scribble Smash',
  vote: 'Vote or Die',
  clicker: 'Fastest Finger',
  memory: 'Pattern Match',
  tictactoe: 'Tic Tac Toe',
  math: 'Mental Math',
  emoji: 'Emoji Hunt',
  color: 'Stroop Effect'
};
