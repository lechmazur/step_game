// Game constants
const FINISH_LINE = 5; // Reduced to make games shorter
const MAX_SUB_ROUNDS = 1;
const DEFAULT_CHARACTER_TYPE = 'strategist';

const CHARACTER_TYPES = {
    'diplomat': 'Negotiates, starts friendly, pushes back if needed',
    'strategist': 'Plans carefully, adapts strategy based on results',
    'cautious': 'Prefers to pump unless threatened',
    'aggressive': 'More likely to dump for higher gains',
    'trickster': 'Unpredictable, keeps others guessing',
    'titfortat': 'First pump then copy last majority'
};

const CHARACTER_NAMES = {
    'default': [
        'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 
        'Jack', 'Kate', 'Liam', 'Mia', 'Noah'
    ]
};

// Pump or Dump payoffs
const PAYOFFS = {
    ALL_PUMP: 1,      // When all players pump
    LONE_DUMPER: 3,   // When exactly one player dumps
    TWO_DUMPERS: 1,   // When exactly two players dump
    ALL_DUMP: 0       // When all players dump
};
