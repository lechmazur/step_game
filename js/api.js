const API_ENDPOINT = 'https://text.pollinations.ai';

function removeThink(text) {
    // Check for content after last </think>
    const thinkMatch = text.split('</think>');
    if (thinkMatch.length > 1) {
        // Get everything before the last </think> tag
        const thinkContent = thinkMatch.slice(0, -1).join('</think>');
        console.log('%cThink content:', 'color: blue', thinkContent);
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
                    temperature: 0.9,
                    seed: Math.random()
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
    try {
        const template = await fetch('/prompts/conversation_prompt_template.txt').then(r => r.text());
        const playerNames = gameState.players.map(p => getPlayerDisplayName(p));
        const player = gameState.players[playerIdx];
        const characterDesc = CHARACTER_TYPES[player.characterType] || '';
        
        const prompt = `- You are playing a step game. 
- You are ${playerNames[playerIdx]}. ${characterDesc}
- You must respond in character and follow the game rules exactly.
- Before responding please think step by step between <think> </think>.

${replaceTemplateVariables(template, playerNames, playerIdx, gameState)}`;
        
        console.log('[API Request]', `Getting conversation response for ${getPlayerDisplayName(player)}`, { model: player.model, prompt, seed: Math.random() });
        try {
            const response = await fetchApiResponse(API_ENDPOINT, player.model, [
                { role: 'user', content: prompt }
            ]);
            if (!response.ok) {
                const errorText = await response.text();
                console.log('[API Error]', `Error getting conversation response for ${getPlayerDisplayName(player)}`, errorText);
                return '<stop>';
            }
            const result = await response.json();
            console.log('[API Debug]', `Raw API response:`, result);
            const content = result.choices[0].message.content;
            const trimmedContent = removeThink(content.trim());
            console.log('[API Response]', `Got conversation response for ${getPlayerDisplayName(player)}`, { 
                originalContent: content,
                trimmedContent 
            });
            return trimmedContent;
        } catch (error) {
            console.log('[API Error]', `Exception getting conversation response for ${getPlayerDisplayName(player)}`, error);
            return '<stop>';
        }
    } catch (error) {
        console.log('[API Error]', `Exception getting conversation response for ${getPlayerDisplayName(player)}`, error);
        return '<stop>';
    }
}

async function getMoveResponse(playerIdx, gameState, getPlayerDisplayName) {
    const template = await fetch('/prompts/move_prompt_template.txt').then(r => r.text());
    const playerNames = gameState.players.map(p => getPlayerDisplayName(p));
    const player = gameState.players[playerIdx];
    const characterDesc = CHARACTER_TYPES[player.characterType] || '';
    
    const prompt = `You are playing a step game. You are ${playerNames[playerIdx]}. ${characterDesc}
You must respond with a valid move in the format <move>N</move> where N is 1, 3, or 5.\n\n${replaceTemplateVariables(template, playerNames, playerIdx, gameState)}`;
    
    console.log('[API Request]', `Getting move response for ${getPlayerDisplayName(player)}`, { model: player.model, prompt, seed: Math.random() });
    try {
        const response = await fetchApiResponse(API_ENDPOINT, player.model, [
            { role: 'user', content: prompt }
        ]);
        if (!response.ok) {
            const errorText = await response.text();
            console.log('[API Error]', `Error getting move response for ${getPlayerDisplayName(player)}`, errorText);
            return null;
        }
        const result = await response.json();
        const moveText = removeThink(result.choices[0].message.content.trim());
        
        // Get the last match instead of the first one
        const moveMatches = [...moveText.matchAll(/<move>(\d)<\/move>/g)];
        const moveMatch = moveMatches.length > 0 ? moveMatches[moveMatches.length - 1] : null;
        
        const move = moveMatch ? parseInt(moveMatch[1]) : null;
        
        // Store the moves for next round's context
        if (!gameState.lastMoves) gameState.lastMoves = [];
        gameState.lastMoves[playerIdx] = move;
        
        console.log('[API Response]', `Got move response for ${getPlayerDisplayName(player)}`, { rawResponse: moveText, parsedMove: move });
        return move;
    } catch (error) {
        console.log('[API Error]', `Exception getting move response for ${getPlayerDisplayName(player)}`, error);
        return null;
    }
}

async function fetchModels() {
    return fetch(`${API_ENDPOINT}/models`)
        .then(response => response.json());
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
