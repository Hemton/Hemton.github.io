// Firebase imports
import { initializeApp as initFirebaseApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Import configuration
import { getFirebaseConfig, validateConfig, appId } from '../config/firebase.js';

// Import utilities
import { log } from './utils.js';
import { initTheme } from './theme.js';
import { GameManager } from './game.js';
import { RoomManager } from './room.js';
import { AuthManager } from './auth.js';

// Global variables
let app, db, auth;
let gameManager, roomManager, authManager;

// Initialize the application
async function initializeApplication() {
    try {
        // Get and validate Firebase configuration
        const firebaseConfig = getFirebaseConfig();
        validateConfig(firebaseConfig);

        // Initialize Firebase
        app = initFirebaseApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        log("Firebase initialized.");

        // Initialize managers
        authManager = new AuthManager(auth, log);
        gameManager = new GameManager(db, appId, log);
        roomManager = new RoomManager(db, appId, log);

        // Set up manager dependencies
        gameManager.setAuthManager(authManager);
        roomManager.setAuthManager(authManager);
        roomManager.setGameManager(gameManager);

        // Initialize theme
        initTheme();

        // Initialize authentication
        await authManager.initialize();

        // Set up global window functions for onclick handlers
        setupGlobalFunctions();

        log("Application initialized successfully.");
    } catch (error) {
        log(`Initialization Error: ${error.message}`, 'error');
        
        // Show config modal if configuration is missing
        if (error.message.includes('Firebase configuration')) {
            document.getElementById('config-modal').style.display = 'flex';
        }
    }
}

// Set up global functions for HTML onclick handlers
function setupGlobalFunctions() {
    window.createRoom = () => roomManager.createRoom();
    window.joinRoom = () => roomManager.joinRoom();
    window.switchView = (view) => switchView(view);
    window.makeMove = (index) => gameManager.makeMove(index);
    window.resetGame = () => gameManager.resetGame();
    window.setPlayerName = () => setPlayerName();
    window.leaveGame = () => gameManager.leaveGame();
}

// View management functions
export function setPlayerName() {
    const name = document.getElementById('name-input').value.trim();
    if (name) {
        authManager.setPlayerName(name);
        switchView('menu');
    }
}

export function switchView(view) {
    const views = ['name', 'menu', 'join', 'lobby', 'game'];
    views.forEach(id => {
        document.getElementById(`view-${id}`).classList.add('hidden');
    });
    document.getElementById(`view-${view}`).classList.remove('hidden');

    if (view === 'menu') {
        roomManager.listenForRooms();
    } else {
        roomManager.stopListening();
    }
}

// Error handling
window.onerror = function(msg) { 
    log(`Global Error: ${msg}`, 'error'); 
    return false; 
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApplication);