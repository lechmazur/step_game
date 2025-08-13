// DOM manipulation functions

function updateScoreboard(scores, players, getPlayerDisplayName, playerStats) {
    const scoresDiv = document.querySelector('#scores');
    scoresDiv.innerHTML = '';
    scores.forEach((score, idx) => {
        const playerName = getPlayerDisplayName(players[idx]);
        const stats = playerStats[idx] || { roundWins: 0 };
        const div = document.createElement('div');
        div.className = `score player-${idx + 1}-score`;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'player-name';
        nameSpan.textContent = playerName;
        
        const infoSpan = document.createElement('span');
        infoSpan.className = 'player-info';
        infoSpan.textContent = `${players[idx].model} - ${players[idx].characterType}`;
        
        const winSpan = document.createElement('span');
        winSpan.className = 'win-count';
        winSpan.textContent = `${stats.roundWins} Won`;
        
        div.appendChild(nameSpan);
        div.appendChild(infoSpan);
        div.appendChild(winSpan);
        
        scoresDiv.appendChild(div);
        
        // Update player marker position
        const marker = document.getElementById(`player${idx + 1}-marker`);
        if (marker) {
            const position = (score / FINISH_LINE) * 100;
            marker.style.left = `${Math.min(position, 100)}%`;
        }
    });
}

function addMessage(playerIdx, message, players, getPlayerDisplayName) {
    const conv = document.getElementById('conversation');
    const div = document.createElement('div');
    div.className = `message player-${playerIdx + 1}-msg`;
    // Handle system messages (playerIdx = -1)
    const playerName = playerIdx === -1 ? 'System' : getPlayerDisplayName(players[playerIdx]);
    div.innerHTML = `<span class="player-name">${playerName}:</span> ${message}`;
    conv.appendChild(div);
    conv.scrollTop = conv.scrollHeight;
}

function updatePlayerLabels(players, getPlayerDisplayName, gameState) {
    players.forEach((player, idx) => {
        const labelDiv = document.getElementById(`track-label-${idx + 1}`);
        if (labelDiv) {
            const score = gameState.scores[idx];
            labelDiv.textContent = `${getPlayerDisplayName(player)} (${score} pts)`;
        }
    });
}

function setGameVisibility(visible) {
    document.getElementById('setup').style.display = visible ? 'none' : 'block';
    document.getElementById('game').style.display = visible ? 'block' : 'none';
}

function clearConversation() {
    document.getElementById('conversation').innerHTML = '';
}

function updateGameStatus(message) {
    document.getElementById('status').textContent = message;
}

function setNextButtonState(enabled) {
    const nextButton = document.getElementById('nextButton');
    nextButton.disabled = !enabled;
    nextButton.style.display = enabled ? '' : 'none';
}

function setAutoAdvanceState(enabled) {
    document.getElementById('autoAdvance').checked = enabled;
}

function getPlayerSelections() {
    const selections = [];
    for (let i = 1; i <= 3; i++) {
        selections.push({
            model: document.getElementById(`player${i}`).value,
            characterType: document.getElementById(`character${i}`).value
        });
    }
    return selections;
}

function initializeModelSelects(models) {
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
}

function initializeCharacterSelects(characterTypes, defaultType) {
    const characterSelects = [
        document.getElementById('character1'),
        document.getElementById('character2'),
        document.getElementById('character3')
    ];

    const characterOptions = Object.entries(characterTypes)
        .map(([type, desc]) => `<option value="${type}" ${type === defaultType ? 'selected' : ''}>${type.charAt(0).toUpperCase() + type.slice(1)} - ${desc}</option>`)
        .join('');

    characterSelects.forEach(select => {
        if (select) {
            select.innerHTML = characterOptions;
        }
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchModels()
        .then(models => {
            initializeModelSelects(models);
            initializeCharacterSelects(CHARACTER_TYPES, DEFAULT_CHARACTER_TYPE);
        })
        .catch(error => {
            console.error('Error loading models:', error);
        });
});
