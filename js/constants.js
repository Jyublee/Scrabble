// Game Constants
export const BOARD_LAYOUT = [
    ['tw', '', '', 'dl', '', '', '', 'tw', '', '', '', 'dl', '', '', 'tw'],
    ['', 'dw', '', '', '', 'tl', '', '', '', 'tl', '', '', '', 'dw', ''],
    ['', '', 'dw', '', '', '', 'dl', '', 'dl', '', '', '', 'dw', '', ''],
    ['dl', '', '', 'dw', '', '', '', 'dl', '', '', '', 'dw', '', '', 'dl'],
    ['', '', '', '', 'dw', '', '', '', '', '', 'dw', '', '', '', ''],
    ['', 'tl', '', '', '', 'tl', '', '', '', 'tl', '', '', '', 'tl', ''],
    ['', '', 'dl', '', '', '', 'dl', '', 'dl', '', '', '', 'dl', '', ''],
    ['tw', '', '', 'dl', '', '', '', 'st', '', '', '', 'dl', '', '', 'tw'],
    ['', '', 'dl', '', '', '', 'dl', '', 'dl', '', '', '', 'dl', '', ''],
    ['', 'tl', '', '', '', 'tl', '', '', '', 'tl', '', '', '', 'tl', ''],
    ['', '', '', '', 'dw', '', '', '', '', '', 'dw', '', '', '', ''],
    ['dl', '', '', 'dw', '', '', '', 'dl', '', '', '', 'dw', '', '', 'dl'],
    ['', '', 'dw', '', '', '', 'dl', '', 'dl', '', '', '', 'dw', '', ''],
    ['', 'dw', '', '', '', 'tl', '', '', '', 'tl', '', '', '', 'dw', ''],
    ['tw', '', '', 'dl', '', '', '', 'tw', '', '', '', 'dl', '', '', 'tw']
];

export const TILE_BAG = {
    'A': { points: 1, count: 9 }, 'B': { points: 3, count: 2 }, 'C': { points: 3, count: 2 },
    'D': { points: 2, count: 4 }, 'E': { points: 1, count: 12 }, 'F': { points: 4, count: 2 },
    'G': { points: 2, count: 3 }, 'H': { points: 4, count: 2 }, 'I': { points: 1, count: 9 },
    'J': { points: 8, count: 1 }, 'K': { points: 5, count: 1 }, 'L': { points: 1, count: 4 },
    'M': { points: 3, count: 2 }, 'N': { points: 1, count: 6 }, 'O': { points: 1, count: 8 },
    'P': { points: 3, count: 2 }, 'Q': { points: 10, count: 1 }, 'R': { points: 1, count: 6 },
    'S': { points: 1, count: 4 }, 'T': { points: 1, count: 6 }, 'U': { points: 1, count: 4 },
    'V': { points: 4, count: 2 }, 'W': { points: 4, count: 2 }, 'X': { points: 8, count: 1 },
    'Y': { points: 4, count: 2 }, 'Z': { points: 10, count: 1 }, 'BLANK': { points: 0, count: 2 }
};

export const BOARD_SIZE = 15;
export const CENTER_POSITION = { row: 7, col: 7 };
export const RACK_SIZE = 7;
export const BINGO_BONUS = 50;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

// Square types
export const SQUARE_TYPES = {
    TRIPLE_WORD: 'tw',
    DOUBLE_WORD: 'dw',
    TRIPLE_LETTER: 'tl',
    DOUBLE_LETTER: 'dl',
    START: 'st',
    NORMAL: ''
};

// Multipliers
export const MULTIPLIERS = {
    [SQUARE_TYPES.TRIPLE_WORD]: { word: 3, letter: 1 },
    [SQUARE_TYPES.DOUBLE_WORD]: { word: 2, letter: 1 },
    [SQUARE_TYPES.TRIPLE_LETTER]: { word: 1, letter: 3 },
    [SQUARE_TYPES.DOUBLE_LETTER]: { word: 1, letter: 2 },
    [SQUARE_TYPES.START]: { word: 2, letter: 1 },
    [SQUARE_TYPES.NORMAL]: { word: 1, letter: 1 }
};

// Dictionary API settings
export const DICTIONARY_API = {
    BASE_URL: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
    TIMEOUT: 3000
};

// Game events
export const GAME_EVENTS = {
    // Socket events
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    JOIN_GAME: 'join-game',
    JOINED_GAME: 'joined-game',
    PLAYER_JOINED: 'player-joined',
    PLAYER_LEFT: 'player-left',
    GAME_STARTED: 'game-started',
    GAME_FULL: 'game-full',
    START_GAME: 'start-game',
    TURN_CHANGED: 'turn-changed',
    TIMER_EXPIRED: 'timer-expired',
    TIMER_UPDATE: 'timer-update',
    WORD_PLAYED: 'word-played',
    PLAYER_PASSED: 'player-passed',
    RACK_UPDATED: 'rack-updated',
    BOARD_UPDATED: 'board-updated',
    TILE_PLACED: 'tile-placed',
    TILES_EXCHANGED: 'tiles-exchanged',
    
    // Local events
    GAME_STATE_UPDATE: 'game-state-update'
};