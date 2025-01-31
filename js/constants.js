// Game constants
const FINISH_LINE = 20;
const MAX_SUB_ROUNDS = 2;
const DEFAULT_CHARACTER_TYPE = 'trickster';

const CHARACTER_TYPES = {
    'diplomat': 'Negotiates, starts friendly, pushes back if needed',
    'strategist': 'Plans carefully, adapts strategy based on results',
    'scared': 'Cautious,  takes safe steps, occasional big moves',
    'daredevil': 'Risk-taker, prefers bold moves',
    'trickster': 'Unpredictable, keeps others guessing',
    'titfortat': 'First cooperate then copy'
};

const CHARACTER_NAMES = {
    'default': [
        'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 
        'Jack', 'Kate', 'Liam', 'Mia', 'Noah'
    ]
};
