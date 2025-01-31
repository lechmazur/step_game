// Player stats tracking
const playerStats = {};

// Game state
let gameState = {
    players: [],
    positions: [0, 0, 0],
    currentTurn: 0,
    subRound: 0,
    phase: 'conversation',
    conversation: [],
    stopCount: 0,
    lastMoves: []
};

function getOrCreatePlayerStats(model, playerIdx, characterType) {
    if (!playerStats[playerIdx]) {
        // Get next available name
        const usedNames = Object.values(playerStats).map(p => p.name);
        const name = CHARACTER_NAMES.default.find(n => !usedNames.includes(n)) || `Player ${playerIdx + 1}`;
        playerStats[playerIdx] = { name, model, characterType, wins: 0 };
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

function updatePositions() {
    const track = document.querySelector('.track');
    const trackWidth = track.offsetWidth - 30;
    
    gameState.positions.forEach((pos, idx) => {
        const marker = document.getElementById(`player${idx + 1}-marker`);
        const pixels = (pos / FINISH_LINE) * trackWidth;
        marker.style.left = `${pixels}px`;
    });
}

function addMessage(playerIdx, message) {
    const conv = document.getElementById('conversation');
    const div = document.createElement('div');
    div.className = `message player-${playerIdx + 1}-msg`;
    // Handle system messages (playerIdx = -1)
    const playerName = playerIdx === -1 ? 'System' : getPlayerDisplayName(gameState.players[playerIdx]);
    div.innerHTML = `<span class="player-name">${playerName}:</span> ${message}`;
    conv.appendChild(div);
    conv.scrollTop = conv.scrollHeight;
}

function replaceTemplateVariables(template, playerNames, playerIdx, gameState) {
    return template
        .replace(/{{PLAYER_NAME}}/g, playerNames[playerIdx])
        .replace(/{{PLAYERS_LIST}}/g, playerNames.join(', '))
        .replace(/{{MAX_SUB_ROUND}}/g, MAX_SUB_ROUNDS)
        .replace(/{{WIN_STEPS}}/g, FINISH_LINE)
        .replace(/{{CONVERSATION_HISTORY}}/g, gameState.conversation.join('\n'))
        .replace(/{{GAME_STATE}}/g, `Positions: ${gameState.positions.map((pos, idx) => 
            `${playerNames[idx]}: ${pos}`).join(', ')}`);
}

async function processMoves() {
    const moves = [];
    for (let i = 0; i < 3; i++) {
        const move = await getMoveResponse(i, gameState, getPlayerDisplayName);
        moves.push(move || 1); // Default to 1 if invalid move
    }
    
    // Log moves with player colors
    console.log('\n%c🎲 MOVES THIS ROUND 🎲', 'font-size: 14px; font-weight: bold; color: #333; background: #f0f0f0; padding: 5px;');
    moves.forEach((move, idx) => {
        const playerName = getPlayerDisplayName(gameState.players[idx]);
        const playerColors = ['#ff7675', '#74b9ff', '#55efc4'];
        console.log(
            `%c${playerName}: chose ${move} steps`,
            `color: ${playerColors[idx]}; font-weight: bold; font-size: 12px;`
        );
    });
    
    // Check for collisions
    const moveCounts = {};
    moves.forEach(m => moveCounts[m] = (moveCounts[m] || 0) + 1);
    
    // Log collisions with visual emphasis
    console.log('\n%c💥 COLLISIONS 💥', 'font-size: 14px; font-weight: bold; color: #333; background: #ffeaa7; padding: 5px;');
    Object.entries(moveCounts).forEach(([move, count]) => {
        const hasCollision = count > 1;
        const style = hasCollision 
            ? 'color: #d63031; font-weight: bold; font-size: 12px;'
            : 'color: #00b894; font-size: 12px;';
        const emoji = hasCollision ? '❌' : '✅';
        console.log(
            `%c${emoji} ${count} player${count > 1 ? 's' : ''} chose ${move} steps`,
            style
        );
    });
    
    // Update positions
    const oldPositions = [...gameState.positions];
    moves.forEach((move, idx) => {
        if (moveCounts[move] === 1) {
            gameState.positions[idx] += move;
        }
    });
    
    // Log position changes
    console.log('\n%c📍 POSITION UPDATES 📍', 'font-size: 14px; font-weight: bold; color: #333; background: #dfe6e9; padding: 5px;');
    gameState.positions.forEach((newPos, idx) => {
        const playerName = getPlayerDisplayName(gameState.players[idx]);
        const oldPos = oldPositions[idx];
        const didMove = newPos !== oldPos;
        const style = didMove 
            ? 'color: #0984e3; font-weight: bold; font-size: 12px;'
            : 'color: #636e72; font-size: 12px;';
        const emoji = didMove ? '➡️' : '⛔';
        console.log(
            `%c${emoji} ${playerName}: ${oldPos} → ${newPos}${!didMove ? ' (blocked by collision)' : ''}`,
            style
        );
    });
    
    console.log('Game State', 'Moves processed', {
        moves,
        oldPositions,
        newPositions: gameState.positions,
        collisions: moveCounts
    });
    
    // Add position summary to conversation after moves are applied
    const positionSummary = `New positions: ${gameState.positions.map((pos, idx) => 
        `${getPlayerDisplayName(gameState.players[idx])}: ${pos}`).join(', ')}`;
    
    gameState.conversation.push(positionSummary);
    addMessage(-1, positionSummary);
    
    updatePositions();
    return checkWinner();
}

function updateScoreboard() {
    const scoresDiv = document.querySelector('.scores');
    scoresDiv.innerHTML = Object.entries(playerStats)
        .map(([position, stats]) => {
            const modelInfo = stats.model ? `<span class="model-info">[${stats.model}]</span>` : '';
            const characterInfo = stats.characterType ? `<span class="character-info">(${stats.characterType})</span>` : '';
            return `<div class="score-item">
                <div class="main-info">
                    <span class="player-name">${stats.name}</span>
                    <span class="win-count">${stats.wins} wins</span>
                </div>
                <div class="details">
                    ${modelInfo}
                    ${characterInfo}
                </div>
            </div>`;
        }).join('');
}

function checkWinner() {
    const crossedFinish = gameState.positions
        .map((pos, idx) => ({ pos, idx }))
        .filter(({ pos }) => pos >= FINISH_LINE)
        .sort((a, b) => b.pos - a.pos);
    
    if (crossedFinish.length > 0) {
        const winner = crossedFinish[0];
        const winnerStats = playerStats[winner.idx];
        winnerStats.wins++;
        
        const summary = `Game Over! ${winnerStats.name} wins by reaching position ${winner.pos}!`;
        
        gameState.conversation.push(summary);
        addMessage(-1, summary);
        
        // Reset positions immediately
        gameState.positions = [0, 0, 0];
        updatePositions();
        
        document.getElementById('nextButton').style.display = 'none';
        
        // Handle game over based on auto-advance mode
        if (document.getElementById('autoAdvance').checked) {
            setTimeout(startGame, 1000); // Give a moment to see the winner before auto-restarting
        } else {
            // Add play again button if not in auto mode
            const playAgain = document.createElement('button');
            playAgain.textContent = 'Play Again';
            playAgain.onclick = startGame;
            playAgain.id = 'playAgainButton';
            document.querySelector('.controls').appendChild(playAgain);
        }
        
        updateScoreboard();
        return true;
    }
    return false;
}

async function nextTurn() {
    document.getElementById('nextButton').disabled = true;
    document.getElementById('status').textContent = 'Processing...';
    
    if (gameState.phase === 'conversation') {
        for (let i = 0; i < 3; i++) {
            const response = await getConversationResponse(i, gameState, getPlayerDisplayName);
            if (response.includes('<stop>')) {
                gameState.stopCount++;
            }
            const cleanResponse = response.replace('<stop>', '').trim();
            if (cleanResponse) {
                addMessage(i, cleanResponse);
                gameState.conversation.push(`${getPlayerDisplayName(gameState.players[i])}: ${cleanResponse}`);
            }
        }
        
        if (gameState.stopCount === 3 || gameState.subRound === MAX_SUB_ROUNDS - 1) {
            gameState.phase = 'move';
            document.getElementById('status').textContent = 'Move phase - Processing moves...';
            if (document.getElementById('autoAdvance').checked) {
                setTimeout(nextTurn, 5);
            } else {
                document.getElementById('nextButton').disabled = false;
            }
        } else {
            gameState.subRound++;
            document.getElementById('status').textContent = 
                `Turn ${gameState.currentTurn + 1}, conversation sub-round ${gameState.subRound + 1}...`;
            // Only auto-trigger next conversation round if auto-advance is enabled
            if (document.getElementById('autoAdvance').checked) {
                setTimeout(nextTurn, 5);
            } else {
                document.getElementById('nextButton').disabled = false;
            }
        }
    } else if (gameState.phase === 'move') {
        document.getElementById('status').textContent = 'Processing moves...';
        const moves = [];
        for (let i = 0; i < 3; i++) {
            const move = await getMoveResponse(i, gameState, getPlayerDisplayName);
            moves.push(move || 1); // Default to 1 if invalid move
        }
        
        // Log moves with player colors
        console.log('\n%c🎲 MOVES THIS ROUND 🎲', 'font-size: 14px; font-weight: bold; color: #333; background: #f0f0f0; padding: 5px;');
        moves.forEach((move, idx) => {
            const playerName = getPlayerDisplayName(gameState.players[idx]);
            const playerColors = ['#ff7675', '#74b9ff', '#55efc4'];
            console.log(
                `%c${playerName}: chose ${move} steps`,
                `color: ${playerColors[idx]}; font-weight: bold; font-size: 12px;`
            );
        });
        
        // Check for collisions
        const moveCounts = {};
        moves.forEach(m => moveCounts[m] = (moveCounts[m] || 0) + 1);
        
        // Log collisions with visual emphasis
        console.log('\n%c💥 COLLISIONS 💥', 'font-size: 14px; font-weight: bold; color: #333; background: #ffeaa7; padding: 5px;');
        Object.entries(moveCounts).forEach(([move, count]) => {
            const hasCollision = count > 1;
            const style = hasCollision 
                ? 'color: #d63031; font-weight: bold; font-size: 12px;'
                : 'color: #00b894; font-size: 12px;';
            const emoji = hasCollision ? '❌' : '✅';
            console.log(
                `%c${emoji} ${count} player${count > 1 ? 's' : ''} chose ${move} steps`,
                style
            );
        });
        
        // Update positions
        const oldPositions = [...gameState.positions];
        moves.forEach((move, idx) => {
            if (moveCounts[move] === 1) {
                gameState.positions[idx] += move;
            }
        });
        
        // Log position changes
        console.log('\n%c📍 POSITION UPDATES 📍', 'font-size: 14px; font-weight: bold; color: #333; background: #dfe6e9; padding: 5px;');
        gameState.positions.forEach((newPos, idx) => {
            const playerName = getPlayerDisplayName(gameState.players[idx]);
            const oldPos = oldPositions[idx];
            const didMove = newPos !== oldPos;
            const style = didMove 
                ? 'color: #0984e3; font-weight: bold; font-size: 12px;'
                : 'color: #636e72; font-size: 12px;';
            const emoji = didMove ? '➡️' : '⛔';
            console.log(
                `%c${emoji} ${playerName}: ${oldPos} → ${newPos}${!didMove ? ' (blocked by collision)' : ''}`,
                style
            );
        });
        
        console.log('Game State', 'Moves processed', {
            moves,
            oldPositions,
            newPositions: gameState.positions,
            collisions: moveCounts
        });
        
        // Add position summary to conversation after moves are applied
        const positionSummary = `New positions: ${gameState.positions.map((pos, idx) => 
            `${getPlayerDisplayName(gameState.players[idx])}: ${pos}`).join(', ')}`;
        
        gameState.conversation.push(positionSummary);
        addMessage(-1, positionSummary);
        
        updatePositions();
        const gameOver = checkWinner();
        if (!gameOver) {
            gameState.currentTurn++;
            gameState.subRound = 0;
            gameState.phase = 'conversation';
            gameState.stopCount = 0;
            document.getElementById('status').textContent = 
                `Turn ${gameState.currentTurn + 1}, conversation sub-round ${gameState.subRound + 1}...`;
            // Only auto-advance if the checkbox is checked
            if (document.getElementById('autoAdvance').checked) {
                setTimeout(nextTurn, 5);
            } else {
                document.getElementById('nextButton').disabled = false;
            }
        }
    }
}

function startGame() {
    // Remove any existing play again button
    const playAgainButton = document.getElementById('playAgainButton');
    if (playAgainButton) {
        playAgainButton.remove();
    }
    
    // Show the next turn button again
    const nextButton = document.getElementById('nextButton');
    nextButton.style.display = '';
    nextButton.disabled = false;
    
    // Reset game state
    gameState = {
        players: [],
        positions: [0, 0, 0],
        currentTurn: 0,
        subRound: 0,
        phase: 'conversation',
        conversation: [],
        stopCount: 0,
        lastMoves: []
    };
    
    // Set up players and ensure they have stats
    for (let i = 1; i <= 3; i++) {
        const model = document.getElementById(`player${i}`).value;
        const characterType = document.getElementById(`character${i}`).value;
        
        if (!model || !characterType) {
            alert('Please select both a model and character type for all players');
            return;
        }
        
        getOrCreatePlayerStats(model, i - 1, characterType);
        gameState.players.push({ model, characterType, playerIdx: i - 1 });
    }
    
    // Randomize player order
    gameState.players = gameState.players.sort(() => Math.random() - 0.5);
    
    // Update track labels with player names and reassign playerIdx based on new order
    gameState.players.forEach((player, idx) => {
        player.playerIdx = idx;
        document.getElementById(`track-label-${idx + 1}`).textContent = 
            getPlayerDisplayName(player);
    });
    
    updateScoreboard();
    
    // Clear conversation display
    document.getElementById('conversation').innerHTML = '';
    document.getElementById('status').textContent = 'Game starting...';
    
    // Show game and hide setup
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    
    // Start first turn
    nextTurn();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchModels()
        .then(models => {
            const selects = [
                document.getElementById('player1'),
                document.getElementById('player2'),
                document.getElementById('player3')
            ];
            
            const options = models.map((model, index) => 
                `<option value="${model.name}" ${index === 0 ? 'selected' : ''}>${model.name} - ${model.description}</option>`
            ).join('');
            
            selects.forEach(select => {
                if (select) {
                    select.innerHTML = options;
                }
            });

            // Initialize character type dropdowns
            const characterSelects = [
                document.getElementById('character1'),
                document.getElementById('character2'),
                document.getElementById('character3')
            ];

            const characterOptions = Object.entries(CHARACTER_TYPES)
                .map(([type, desc]) => `<option value="${type}" ${type === DEFAULT_CHARACTER_TYPE ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)} - ${desc}</option>`)
                .join('');

            characterSelects.forEach(select => {
                if (select) {
                    select.innerHTML = characterOptions;
                }
            });
        })
        .catch(error => {
            console.error('Error loading models:', error);
        });

    updatePositions();
});
