"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_TYPES = exports.AVATARS = exports.RECONNECT_WINDOW = exports.INACTIVITY_TIMEOUT = exports.MAX_PLAYERS = exports.ROOM_CODE_LENGTH = void 0;
exports.ROOM_CODE_LENGTH = 5;
exports.MAX_PLAYERS = 12;
exports.INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
exports.RECONNECT_WINDOW = 2 * 60 * 1000; // 2 minutes
exports.AVATARS = [
    '🦁', '🐯', '🦊', '🐺', '🦝', '🐸', '🐙', '🦄', '🐲', '🤖', '👾', '🎭', '🧙', '🦸', '🥷', '🎪'
];
exports.GAME_TYPES = {
    reflex: 'Reflex Royale',
    brain: 'Brain War',
    ball: 'Ball Blitz',
    scribble: 'Scribble Smash',
    vote: 'Vote or Die'
};
