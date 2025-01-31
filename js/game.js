// Player stats tracking
const playerStats = {};

// Game state
let gameState = {
    players: [],
    scores: [0, 0, 0],
    currentTurn: 0,
    subRound: 0,
    phase: 'conversation',
    conversation: [],
    stopCount: 0,
    lastMoves: [],
    currentRound: 1,
    reasoningEnabled: [true, true, true]
};

// Memoization cache for prompts
const promptCache = {
    common: null,
    reasoning: null,
    conversation: null,
    move: null
};

async function loadPrompt(type) {
    if (promptCache[type]) {
        return promptCache[type];
    }
    
    try {
        // Use _rules.txt for common and reasoning, _prompt_template.txt for conversation and move
        const suffix = type === 'common' || type === 'reasoning' ? '_rules.txt' : '_prompt_template.txt';
        const response = await fetch(`prompts/${type}${suffix}`);
        const text = await response.text();
        promptCache[type] = text;
        return text;
    } catch (error) {
        console.error(`Error loading ${type} prompt:`, error);
        return '';
    }
}

function getOrCreatePlayerStats(model, playerIdx, characterType) {
    if (!playerStats[playerIdx]) {
        // Get next available name
        const usedNames = Object.values(playerStats).map(p => p.name);
        const name = CHARACTER_NAMES.default.find(n => !usedNames.includes(n)) || `Player ${playerIdx + 1}`;
        playerStats[playerIdx] = { 
            name, 
            model, 
            characterType, 
            roundWins: 0, 
            totalPoints: 0 
        };
    } else {
        // Update model and character type if they changed
        playerStats[playerIdx].model = model;
        playerStats[playerIdx].characterType = characterType;
    }
    return playerStats[playerIdx];
}

function getPlayerDisplayName(player) {
    const stats = getOrCreatePlayerStats(player.model, player.playerIdx, player.characterType);
    const displayName = stats.name;
    return displayName;
}

// Helper functions for move processing
function parseMoveResponse(move) {
    if (!move) return 'pump';
    
    // Try to extract move from XML-style tags first
    const moveMatch = move.match(/<move>\s*(pump|dump)\s*<\/move>/i);
    if (moveMatch) {
        return moveMatch[1].toLowerCase().trim();
    }
    
    // Fallback: check if the raw response contains pump or dump
    return move.toLowerCase().trim().includes('dump') ? 'dump' : 'pump';
}

function logPlayerMoves(moves, gameState, getPlayerDisplayName) {
    console.log('\n%c🎲 MOVES THIS TURN 🎲', 'font-size: 14px; font-weight: bold; color: #333; background: #f0f0f0; padding: 5px;');
    const playerColors = ['#ff7675', '#74b9ff', '#55efc4'];
    moves.forEach((move, idx) => {
        const playerName = getPlayerDisplayName(gameState.players[idx]);
        console.log(
            `%c${playerName}: chose to ${move}`,
            `color: ${playerColors[idx]}; font-weight: bold; font-size: 12px;`
        );
    });
}

function calculatePoints(moves) {
    const pumpCount = moves.filter(m => m === 'pump').length;
    const dumpCount = moves.filter(m => m === 'dump').length;
    
    console.log('Move counts:', { pumpCount, dumpCount });
    
    let points = new Array(3).fill(0);
    
    if (pumpCount === 3) {
        return points.map(() => PAYOFFS.ALL_PUMP.pumpers);
    } else if (dumpCount === 1) {
        return moves.map(move => move === 'dump' ? PAYOFFS.LONE_DUMPER.dumpers : PAYOFFS.LONE_DUMPER.pumpers);
    } else if (dumpCount === 2) {
        return moves.map(move => move === 'dump' ? PAYOFFS.TWO_DUMPERS.dumpers : PAYOFFS.TWO_DUMPERS.pumpers);
    } else if (dumpCount === 3) {
        return points.map(() => PAYOFFS.ALL_DUMP.dumpers);
    }
    
    return points;
}

function logPointsEarned(points, gameState, getPlayerDisplayName) {
    console.log('\n%c💰 POINTS EARNED 💰', 'font-size: 14px; font-weight: bold; color: #333; background: #ffeaa7; padding: 5px;');
    points.forEach((point, idx) => {
        const playerName = getPlayerDisplayName(gameState.players[idx]);
        const style = point > 0 
            ? 'color: #00b894; font-weight: bold; font-size: 12px;'
            : 'color: #d63031; font-size: 12px;';
        const emoji = point > 0 ? '✅' : '❌';
        console.log(
            `%c${emoji} ${playerName} earned ${point} points (total: ${gameState.scores[idx]})`,
            style
        );
    });
}

async function processMoves() {
    // Create promises for all move responses simultaneously
    const movePromises = [0, 1, 2].map(i => getMoveResponse(i, gameState, getPlayerDisplayName));
    
    // Wait for all moves to complete in parallel
    const rawMoves = await Promise.all(movePromises);
    
    // Process all moves
    const moves = rawMoves.map((move, i) => {
        console.log(`Raw move response for player ${i}:`, move);
        const finalMove = parseMoveResponse(move);
        console.log(`Final move for player ${i}:`, finalMove);
        return finalMove;
    });
    
    // Log final moves array and player moves
    console.log('Final moves array:', moves);
    logPlayerMoves(moves, gameState, getPlayerDisplayName);
    
    // Calculate and apply points
    const points = calculatePoints(moves);
    gameState.scores = gameState.scores.map((score, idx) => score + points[idx]);
    
    // Create and add score summary message
    const scoreMessage = `Current scores: ${gameState.scores.map((score, idx) => 
        `${getPlayerDisplayName(gameState.players[idx])}: ${score}`
    ).join(', ')}`;
    addMessage(-1, scoreMessage, gameState.players, getPlayerDisplayName);
    
    // Log points earned
    logPointsEarned(points, gameState, getPlayerDisplayName);
    
    // Store moves for history and update UI
    gameState.lastMoves = moves;
    updateScoreboard(gameState.scores, gameState.players, getPlayerDisplayName, playerStats);
    updatePlayerLabels(gameState.players, getPlayerDisplayName, gameState);
    
    // Handle round transition
    const hasWinner = checkWinner();
    if (hasWinner) {
        startNewRound();
        gameState.phase = 'conversation';
        gameState.subRound = 0;
        setNextButtonState(true);
        return;
    }
    
    // Continue with normal turn progression if no winner
    if (gameState.subRound < MAX_SUB_ROUNDS - 1) {
        gameState.subRound++;
        gameState.phase = 'conversation';
        gameState.stopCount = 0;
    }
}

function checkWinner() {
    // Check if any player has reached or exceeded FINISH_LINE
    const winners = gameState.scores
        .map((score, idx) => ({ score, idx }))
        .filter(({ score }) => score >= FINISH_LINE);
    
    if (winners.length > 0) {
        // Find highest score among winners
        const maxScore = Math.max(...winners.map(w => w.score));
        const finalWinners = winners.filter(w => w.score === maxScore);
        
        // Update player stats for winners - award half point if tied
        const pointsToAward = finalWinners.length > 1 ? 0.5 : 1;
        finalWinners.forEach(winner => {
            const stats = playerStats[winner.idx];
            stats.roundWins += pointsToAward;
            stats.totalPoints += winner.score;
        });
        
        // Create winner message
        const winnerNames = finalWinners
            .map(w => getPlayerDisplayName(gameState.players[w.idx]))
            .join(' and ');
        
        const message = finalWinners.length > 1
            ? `Round ${gameState.currentRound} Over! ${winnerNames} tie for the win with ${maxScore} points and each get half a point!`
            : `Round ${gameState.currentRound} Over! ${winnerNames} wins with ${maxScore} points!`;
            
        addMessage(-1, message, gameState.players, getPlayerDisplayName);
        
        return true;
    }
    return false;
}

function startNewRound() {
    // Increment round counter
    gameState.currentRound++;
    
    // Reset round-specific state
    gameState.scores = [0, 0, 0];
    gameState.currentTurn = 0;
    gameState.subRound = 0;
    gameState.phase = 'conversation';
    gameState.conversation = [];
    gameState.stopCount = 0;
    gameState.lastMoves = [];
    
    // Update UI for new round
    updateGameStatus(`Starting Round ${gameState.currentRound}...`);
    updateScoreboard(gameState.scores, gameState.players, getPlayerDisplayName, playerStats);
    updatePlayerLabels(gameState.players, getPlayerDisplayName, gameState);
    
    // Add round start message to conversation
    const roundStartMessage = `Round ${gameState.currentRound} begins! Current standings: ${
        Object.values(playerStats)
            .map(stats => `${stats.name}: ${stats.roundWins} wins`)
            .join(', ')
    }`;
    addMessage(-1, roundStartMessage, gameState.players, getPlayerDisplayName);
}

async function nextTurn() {
    setNextButtonState(false);
    updateGameStatus('Processing...');
    
    if (gameState.phase === 'conversation') {
        // Create an array of player indices and shuffle it
        const playerOrder = [0, 1, 2].sort(() => Math.random() - 0.5);
        
        // Create promises for all responses simultaneously
        const responsePromises = playerOrder.map(playerIdx => 
            getConversationResponse(playerIdx, gameState, getPlayerDisplayName)
        );
        
        // Wait for all responses to complete in parallel
        const responses = await Promise.all(responsePromises);
        
        // Process all responses in the original shuffled order
        responses.forEach((response, index) => {
            const playerIdx = playerOrder[index];
            const cleanResponse = response.replace('<stop>', '').trim();
            if (cleanResponse) {
                addMessage(playerIdx, cleanResponse, gameState.players, getPlayerDisplayName);
                gameState.conversation.push(`${getPlayerDisplayName(gameState.players[playerIdx])}: ${cleanResponse}`);
            }
            if (response.includes('<stop>')) {
                gameState.stopCount++;
            }
        });
        
        if (gameState.stopCount === 3 || gameState.subRound === MAX_SUB_ROUNDS - 1) {
            gameState.phase = 'move';
            updateGameStatus('Move phase - Processing moves...');
            if (document.getElementById('autoAdvance').checked) {
                setTimeout(nextTurn, 500); // Increased delay
            } else {
                setNextButtonState(true);
            }
        } else {
            gameState.subRound++;
            updateGameStatus(`Turn ${gameState.currentTurn + 1}, conversation sub-round ${gameState.subRound + 1}...`);
            if (document.getElementById('autoAdvance').checked) {
                setTimeout(nextTurn, 500); // Increased delay
            } else {
                setNextButtonState(true);
            }
        }
    } else if (gameState.phase === 'move') {
        updateGameStatus('Processing moves...');
        
        const gameOver = await processMoves();
        
        if (!gameOver) {
            gameState.currentTurn++;
            gameState.subRound = 0;
            gameState.phase = 'conversation';
            gameState.stopCount = 0;
            updateGameStatus(`Turn ${gameState.currentTurn + 1}, conversation sub-round ${gameState.subRound + 1}...`);
            // Only auto-advance if the checkbox is checked
            if (document.getElementById('autoAdvance').checked) {
                setTimeout(nextTurn, 500); // Increased delay
            } else {
                setNextButtonState(true);
            }
        }
    }
}

function startGame() {
    const players = [];
    const reasoningEnabled = [];
    
    for (let i = 1; i <= 3; i++) {
        const model = document.getElementById(`player${i}`).value;
        const characterType = document.getElementById(`character${i}`).value;
        reasoningEnabled.push(document.getElementById(`reasoning${i}`).checked);
        
        if (!model || !characterType) {
            alert('Please select model and character type for all players');
            return;
        }
        
        players.push({
            model,
            characterType,
            playerIdx: i - 1
        });
    }
    
    // Load all prompts at game start
    loadPrompt('common').then(commonPrompt => {
        promptCache.common = commonPrompt;
    });
    loadPrompt('reasoning').then(reasoningPrompt => {
        promptCache.reasoning = reasoningPrompt;
    });
    loadPrompt('conversation').then(conversationPrompt => {
        promptCache.conversation = conversationPrompt;
    });
    loadPrompt('move').then(movePrompt => {
        promptCache.move = movePrompt;
    });
    
    gameState = {
        players,
        scores: [0, 0, 0],
        currentTurn: 0,
        subRound: 0,
        phase: 'conversation',
        conversation: [],
        stopCount: 0,
        lastMoves: [],
        currentRound: 1,
        reasoningEnabled
    };
    
    // Randomize player order
    gameState.players = gameState.players.sort(() => Math.random() - 0.5);
    
    // Update player labels and reassign playerIdx based on new order
    gameState.players.forEach((player, idx) => player.playerIdx = idx);
    updatePlayerLabels(gameState.players, getPlayerDisplayName, gameState);
    
    // Clear conversation and update status
    clearConversation();
    updateGameStatus('Game starting...');
    
    // Show game and hide setup
    setGameVisibility(true);
    
    // Update initial scoreboard
    updateScoreboard(gameState.scores, gameState.players, getPlayerDisplayName, playerStats);
    
    // Start first turn
    nextTurn();
}

function getPlayerSelections() {
    const selections = [];
    for (let i = 1; i <= 3; i++) {
        const model = document.getElementById(`player${i}`).value;
        const characterType = document.getElementById(`character${i}`).value;
        selections.push({ model, characterType });
    }
    return selections;
}
