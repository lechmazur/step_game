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
    currentRound: 1
};

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

function replaceTemplateVariables(template, playerNames, playerIdx, gameState) {
    const characterType = gameState.players[playerIdx].characterType;
    return template
        .replace(/{{PLAYER_NAME}}/g, playerNames[playerIdx])
        .replace(/{{PLAYERS_LIST}}/g, playerNames.join(', '))
        .replace(/{{CHARACTER_TYPE}}/g, characterType)
        .replace(/{{CHARACTER_DESCRIPTION}}/g, CHARACTER_TYPES[characterType])
        .replace(/{{MAX_SUB_ROUND}}/g, MAX_SUB_ROUNDS)
        .replace(/{{WIN_STEPS}}/g, FINISH_LINE)
        .replace(/{{CONVERSATION_HISTORY}}/g, gameState.conversation.join('\n'))
        .replace(/{{GAME_STATE}}/g, `Scores: ${gameState.scores.map((score, idx) => 
            `${playerNames[idx]}: ${score}`).join(', ')}`);
}

async function processMoves() {
    // Create promises for all move responses simultaneously
    const movePromises = [0, 1, 2].map(i => getMoveResponse(i, gameState, getPlayerDisplayName));
    
    // Wait for all moves to complete in parallel
    const rawMoves = await Promise.all(movePromises);
    
    // Process all moves
    const moves = rawMoves.map((move, i) => {
        console.log(`Raw move response for player ${i}:`, move);
        
        // If move is null or undefined, default to pump
        if (!move) {
            console.log(`No valid move received for player ${i}, defaulting to pump`);
            return 'pump';
        }
        
        // Try to extract move from XML-style tags first
        const moveMatch = move.match(/<move>\s*(pump|dump)\s*<\/move>/i);
        if (moveMatch) {
            const finalMove = moveMatch[1].toLowerCase().trim();
            console.log(`Found move in tags for player ${i}:`, finalMove);
            return finalMove;
        }
        
        // Fallback: check if the raw response contains pump or dump
        const rawMove = move.toLowerCase().trim();
        const finalMove = rawMove.includes('dump') ? 'dump' : 'pump';
        console.log(`Using fallback for player ${i}, raw: "${rawMove}", final: "${finalMove}"`);
        return finalMove;
    });
    
    // Log final moves array for verification
    console.log('Final moves array:', moves);
    
    // Log moves with player colors
    console.log('\n%c🎲 MOVES THIS TURN 🎲', 'font-size: 14px; font-weight: bold; color: #333; background: #f0f0f0; padding: 5px;');
    moves.forEach((move, idx) => {
        const playerName = getPlayerDisplayName(gameState.players[idx]);
        const playerColors = ['#ff7675', '#74b9ff', '#55efc4'];
        console.log(
            `%c${playerName}: chose to ${move}`,
            `color: ${playerColors[idx]}; font-weight: bold; font-size: 12px;`
        );
    });
    
    // Count pumps and dumps
    const pumpCount = moves.filter(m => m === 'pump').length;
    const dumpCount = moves.filter(m => m === 'dump').length;
    
    console.log('Move counts:', { pumpCount, dumpCount });
    
    // Calculate points based on game rules
    let points = new Array(3).fill(0);
    if (pumpCount === 3) {
        // All pump - everyone gets the pumper reward
        points = points.map(() => PAYOFFS.ALL_PUMP.pumpers);
    } else if (dumpCount === 1) {
        // One dumper - dumper gets dumper reward, others get pumper reward
        moves.forEach((move, idx) => {
            points[idx] = move === 'dump' ? PAYOFFS.LONE_DUMPER.dumpers : PAYOFFS.LONE_DUMPER.pumpers;
        });
    } else if (dumpCount === 2) {
        // Two dumpers - dumpers get dumper reward, pumper gets pumper reward
        moves.forEach((move, idx) => {
            points[idx] = move === 'dump' ? PAYOFFS.TWO_DUMPERS.dumpers : PAYOFFS.TWO_DUMPERS.pumpers;
        });
    } else if (dumpCount === 3) {
        // All dump - everyone gets the dumper reward
        points = points.map(() => PAYOFFS.ALL_DUMP.dumpers);
    }
    
    // Update scores
    gameState.scores = gameState.scores.map((score, idx) => score + points[idx]);
    
    // Create score summary message
    const scoreMessage = `Current scores: ${gameState.scores.map((score, idx) => 
        `${getPlayerDisplayName(gameState.players[idx])}: ${score}`
    ).join(', ')}`;
    
    // Add summary to conversation
    addMessage(-1, scoreMessage, gameState.players, getPlayerDisplayName);
    
    // Log points with visual emphasis
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
    
    // Store moves for history
    gameState.lastMoves = moves;
    
    // Update UI with new scores
    updateScoreboard(gameState.scores, gameState.players, getPlayerDisplayName, playerStats);
    updatePlayerLabels(gameState.players, getPlayerDisplayName, gameState);
    
    // Check for winner and handle round transition
    const hasWinner = checkWinner();
    
    // If we have a winner, start new round
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
        if (document.getElementById('autoAdvance').checked) {
            setTimeout(nextTurn, 5);
        } else {
            setNextButtonState(true);
        }
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
    // Reset game state
    gameState = {
        players: [],
        scores: [0, 0, 0],
        currentTurn: 0,
        subRound: 0,
        phase: 'conversation',
        conversation: [],
        stopCount: 0,
        lastMoves: [],
        currentRound: 1
    };
    
    // Get player selections and validate
    const selections = getPlayerSelections();
    for (let i = 0; i < selections.length; i++) {
        const { model, characterType } = selections[i];
        if (!model || !characterType) {
            alert('Please select both a model and character type for all players');
            return;
        }
        getOrCreatePlayerStats(model, i, characterType);
        gameState.players.push({ model, characterType, playerIdx: i });
    }
    
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
