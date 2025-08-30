// const API_ENDPOINT = 'https://text.pollinations.ai';

const API_ENDPOINT = 'http://localhost:16385';

function removeThink(text, playerIdx, playerName) {
    // Check for content after last </think>
    const thinkMatch = text.split('</think>');
    if (thinkMatch.length > 1) {
        // Get everything before the last </think> tag
        const thinkContent = thinkMatch.slice(0, -1).join('</think>');
        console.log('%cThink content:', 'color: blue', thinkContent);
        
        // Update the thoughts display
        const thoughtsDiv = document.querySelector('#player-thoughts .thoughts');
        const playerThoughtId = `player-${playerIdx + 1}-thought`;
        let playerThought = document.getElementById(playerThoughtId);
        
        if (!playerThought) {
            playerThought = document.createElement('div');
            playerThought.id = playerThoughtId;
            playerThought.className = `thought player-${playerIdx + 1}-thought`;
            thoughtsDiv.appendChild(playerThought);
        }

        if (thinkContent) {
            playerThought.innerHTML = `<strong>${playerName}:</strong> ${thinkContent}`;
        }
        
        // Return everything after the last </think> tag
        return thinkMatch[thinkMatch.length - 1].trim();
    }
    return text;
}

async function fetchApiResponse(url, model, messages) {
    const maxRetries = 3;
    const initialDelay = 1000; // Initial delay of 1 second
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Calculate exponential backoff delay
            const backoffDelay = initialDelay * Math.pow(2, attempt);
            await delay(backoffDelay);
            
            const response = await fetch(url+'/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.5,
                    seed: Math.floor(Math.random() * 1000000), // Generate a random seed for each request, between 0 and 999999Math.random()
                    referrer: "roblox"
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            if (attempt === maxRetries - 1) {
                // If this was the last attempt, throw the error
                throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            }
            console.log(`Attempt ${attempt + 1} failed, retrying... Error: ${error.message}`);
        }
    }
}

async function getConversationResponse(playerIdx, gameState, getPlayerDisplayName) {
    const playerNames = gameState.players.map(getPlayerDisplayName);

    try {
        const [commonPrompt, conversationPrompt] = await Promise.all([
            loadPrompt('common'),
            loadPrompt('conversation')
        ]);
        
        const fullTemplate = commonPrompt + '\n\n' + conversationPrompt;
        const prompt = replaceTemplateVariables(fullTemplate, playerNames, playerIdx, gameState);
        
        console.log('[API Request]', `Getting conversation response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, { model: gameState.players[playerIdx].model, prompt, seed: Math.random() });
        
        try {
            const response = await fetchApiResponse(API_ENDPOINT, gameState.players[playerIdx].model, [
                { role: 'user', content: prompt }
            ]);
            if (!response.ok) {
                const errorText = await response.text();
                console.log('[API Error]', `Error getting conversation response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, errorText);
                return '<stop>';
            }
            const result = await response.json();
            console.log('[API Debug]', `Raw API response:`, result);
            
            // Add null check for content
            const content = result?.choices?.[0]?.message?.content;
            if (!content) {
                console.log('[API Error]', `No content in response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, result);
                return '<stop>';
            }
            
            const trimmedContent = removeThink(content.trim(), playerIdx, getPlayerDisplayName(gameState.players[playerIdx]));
            console.log('[API Response]', `Got conversation response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, { 
                originalContent: content,
                trimmedContent 
            });
            return trimmedContent;
        } catch (error) {
            console.log('[API Error]', `Exception getting conversation response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, error);
            return '<stop>';
        }
    } catch (error) {
        console.log('[API Error]', `Exception getting conversation response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, error);
        return '<stop>';
    }
}

async function getMoveResponse(playerIdx, gameState, getPlayerDisplayName) {
    const playerNames = gameState.players.map(getPlayerDisplayName);

    try {
        const [commonPrompt, movePrompt] = await Promise.all([
            loadPrompt('common'),
            loadPrompt('move')
        ]);
        
        const fullTemplate = commonPrompt + '\n\n' + movePrompt;
        const prompt = replaceTemplateVariables(fullTemplate, playerNames, playerIdx, gameState);
        
        console.log('[API Request]', `Getting move response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, { model: gameState.players[playerIdx].model, prompt, seed: Math.random() });
        
        try {
            const response = await fetchApiResponse(API_ENDPOINT, gameState.players[playerIdx].model, [
                { role: 'user', content: prompt }
            ]);
            if (!response.ok) {
                const errorText = await response.text();
                console.log('[API Error]', `Error getting move response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, errorText);
                return null;
            }
            const result = await response.json();
            
            // Add null check for content
            const content = result?.choices?.[0]?.message?.content;
            if (!content) {
                console.log('[API Error]', `No content in response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, result);
                return null;
            }
            
            const moveText = removeThink(content.trim(), playerIdx, getPlayerDisplayName(gameState.players[playerIdx]));
            
            console.log('[API Response]', `Got move response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, { rawResponse: moveText });
            return moveText;
        } catch (error) {
            console.log('[API Error]', `Exception getting move response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, error);
            return null;
        }
    } catch (error) {
        console.log('[API Error]', `Exception getting move response for ${getPlayerDisplayName(gameState.players[playerIdx])}`, error);
        return null;
    }
}

async function fetchModels() {
    return fetch(`${API_ENDPOINT}/models`)
        .then(response => response.json());
}

function replaceTemplateVariables(template, playerNames, playerIdx, gameState) {
    const characterType = gameState.players[playerIdx].characterType;
    const result = template
        .replace(/{{PLAYER_NAME}}/g, playerNames[playerIdx])
        .replace(/{{PLAYERS_LIST}}/g, playerNames.join(', '))
        .replace(/{{CHARACTER_TYPE}}/g, characterType)
        .replace(/{{CHARACTER_DESCRIPTION}}/g, CHARACTER_TYPES[characterType])
        .replace(/{{MAX_SUB_ROUND}}/g, MAX_SUB_ROUNDS)
        .replace(/{{WIN_STEPS}}/g, FINISH_LINE)
        .replace(/{{CONVERSATION_HISTORY}}/g, gameState.conversation.join('\n'))
        .replace(/{{GAME_STATE}}/g, `Scores: ${gameState.scores.map((score, idx) => 
            `${playerNames[idx]}: ${score}`).join(', ')}`);

    // Add reasoning rules if enabled for this player
    if (gameState.reasoningEnabled[playerIdx]) {
        return result + '\n' + (promptCache.reasoning || '');
    }
    return result;
}
