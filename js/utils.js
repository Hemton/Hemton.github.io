// Utility functions for the Tic Tac Toe application

// Logging utility
export function log(msg, type = 'info') {
    const logDiv = document.getElementById('debug-log');
    if (logDiv) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type === 'error' ? 'log-error' : type === 'warn' ? 'log-warn' : ''}`;
        entry.textContent = `> ${msg}`;
        logDiv.appendChild(entry);
        logDiv.scrollTop = logDiv.scrollHeight;
    }
    console.log(msg);
}

// Generate room code
export function generateRoomCode() {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    return `${code.slice(0,3)}-${code.slice(3,5)}-${code.slice(5,8)}`;
}

// Validate room code format
export function validateRoomCode(code) {
    const trimmedCode = code.toUpperCase().trim();
    return trimmedCode.length >= 8 && /^[0-9]{3}-[0-9]{2}-[0-9]{3}$/.test(trimmedCode);
}

// Check for winning combinations
export function checkWinner(board) {
    const wins = [
        [0,1,2], [3,4,5], [6,7,8], // Rows
        [0,3,6], [1,4,7], [2,5,8], // Columns
        [0,4,8], [2,4,6]           // Diagonals
    ];
    
    for (let combo of wins) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    // Check for draw
    if (!board.includes(null)) {
        return 'DRAW';
    }
    
    return null;
}

// Format player name for display
export function formatPlayerName(name, isCurrentUser = false) {
    const displayName = name || 'Anonymous';
    return isCurrentUser ? `${displayName} (You)` : displayName;
}

// Debounce function for performance optimization
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Deep clone utility for game state
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Error message handler
export function handleError(error, context = '') {
    let message = error.message || 'An unknown error occurred';
    
    // Provide user-friendly error messages
    switch (error.code) {
        case 'permission-denied':
            message = 'Permission denied. Please check Firebase security rules.';
            break;
        case 'auth/api-key-not-valid':
            message = 'Invalid Firebase API key. Please check your configuration.';
            break;
        case 'unavailable':
            message = 'Service temporarily unavailable. Please try again.';
            break;
    }
    
    log(`${context ? context + ': ' : ''}${message}`, 'error');
    return message;
}