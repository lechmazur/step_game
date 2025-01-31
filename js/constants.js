// Game constants
const FINISH_LINE = 5; // Reduced to make games shorter
const MAX_SUB_ROUNDS = 2;
const DEFAULT_CHARACTER_TYPE = 'competitive';

const CHARACTER_TYPES = {
    'diplomat': 'Negotiates, starts friendly, pushes back if needed',
    'strategist': 'Plans carefully, adapts strategy based on results',
    'cautious': 'Prefers to pump unless threatened',
    'aggressive': 'More likely to dump for higher gains',
    'trickster': 'Unpredictable, keeps others guessing',
    'competitive': 'You want to win above all. Ties or losses are inconceivable.',
    'selective-ally': 'You choose one ally to trust and coordinate with to make the other player lose. Communicate at the start of the round which ally you want to cooperate with and make sure they agree.',
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
