// Game constants
const FINISH_LINE = 5; // Reduced to make games shorter
const MAX_SUB_ROUNDS = 2;
const DEFAULT_CHARACTER_TYPE = 'trickster';

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

const PAYOFFS = {
    ALL_PUMP: {
        pumpers: 1,
        dumpers: 0
    },
    LONE_DUMPER: {
        dumpers: 2,
        pumpers: 0
    },
    TWO_DUMPERS: {
        dumpers: 0,
        pumpers: 1.5
    },
    ALL_DUMP: {
        dumpers: 0.5,
        pumpers: 0
    }
};
