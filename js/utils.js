function generateSeed() {
    return Math.floor(Math.random() * 1000000);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function log(category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${category}] ${message}`;
    console.log(logMessage);
    if (data) {
        console.log('Data:', data);
    }
}

function logWithTimestamp(prefix, ...args) {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3 
    });
    console.log(`[${timestamp}] ${prefix}:`, ...args);
}

function logData(data) {
    if (typeof data === 'object') {
        console.log('Data:', JSON.stringify(data, null, 2));
    } else {
        console.log('Data:', data);
    }
}
