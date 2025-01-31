// Game constants
export const FINISH_LINE = 20;
export const MAX_SUB_ROUNDS = 3;
export const DEFAULT_CHARACTER_TYPE = 'strategist';

// Character types with personalities and strategies
export const CHARACTER_TYPES = {
    'diplomat': 'A charismatic negotiator who believes in "you scratch my back, I scratch yours." Starts friendly with small moves but isn\'t afraid to push back if others get aggressive.',
    'strategist': 'A chess player at heart who carefully plans each move. Prefers balanced choices and adapts their strategy based on what seems to be working best.',
    'scared': 'A cautious player who\'s been burned before. Takes small, safe steps when comfortable but will make big moves when backed into a corner.',
    'daredevil': 'A thrill-seeker who loves taking risks. "Go big or go home" is their motto, believing that bold moves are the most fun way to play.',
    'trickster': 'An unpredictable player who keeps others guessing. Sometimes plays it safe, sometimes goes all in - they enjoy the psychological game as much as the race.',
    'peacemaker': 'A natural mediator who believes everyone can win together. Tries to set a cooperative tone and avoids moves that might spark aggressive competition.',
    'tit_for_tat': 'A fair player who believes in reciprocity. Always starts with a cooperative small move, then mirrors the previous move of whoever is closest to winning. Known for being clear, predictable, and promoting cooperation through example.',
};
