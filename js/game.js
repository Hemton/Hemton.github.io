// Game management for the Tic Tac Toe application
import { doc, getDoc, updateDoc, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { checkWinner } from './utils.js';

export class GameManager {
    constructor(db, appId, logFunction) {
        this.db = db;
        this.appId = appId;
        this.log = logFunction;
        this.currentRoom = null;
        this.gameData = null;
        this.unsubscribeGame = null;
        this.authManager = null; // Will be set externally
    }

    setAuthManager(authManager) {
        this.authManager = authManager;
    }

    // Helper function to switch views
    switchView(view) {
        const views = ['name', 'menu', 'join', 'lobby', 'game'];
        views.forEach(id => {
            document.getElementById(`view-${id}`).classList.add('hidden');
        });
        document.getElementById(`view-${view}`).classList.remove('hidden');
    }

    async makeMove(index) {
        if (!this.gameData || !this.authManager.getCurrentUser() || this.gameData.status !== 'playing') {
            return;
        }

        const currentUser = this.authManager.getCurrentUser();
        const isPlayerX = this.gameData.playerX === currentUser.uid;
        const isPlayerO = this.gameData.playerO === currentUser.uid;
        const playerSymbol = isPlayerX ? 'X' : (isPlayerO ? 'O' : null);

        // Check if it's the player's turn and cell is empty
        if (this.gameData.turn !== playerSymbol || this.gameData.board[index]) {
            return;
        }

        // Make the move
        const newBoard = [...this.gameData.board];
        newBoard[index] = playerSymbol;

        // Check for winner
        const winner = checkWinner(newBoard);

        // Prepare updates
        const roomRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'rooms', `room_${this.currentRoom}`);
        const updates = {
            board: newBoard,
            turn: playerSymbol === 'X' ? 'O' : 'X',
            status: winner ? 'finished' : 'playing',
            winner: winner || null,
            playerXWantsRematch: false,
            playerOWantsRematch: false
        };

        // Update scores and last starter
        if (winner) {
            updates.lastStarter = this.gameData.turn;

            if (winner === 'X') {
                updates.playerXWins = (this.gameData.playerXWins || 0) + 1;
            } else if (winner === 'O') {
                updates.playerOWins = (this.gameData.playerOWins || 0) + 1;
            }
        }

        try {
            await updateDoc(roomRef, updates);
            this.log(`Move made at position ${index}`);
        } catch (error) {
            this.log(`Failed to make move: ${error.message}`, 'error');
        }
    }

    async resetGame() {
        if (!this.currentRoom || !this.authManager.getCurrentUser()) {
            return;
        }

        const currentUser = this.authManager.getCurrentUser();
        const roomRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'rooms', `room_${this.currentRoom}`);

        try {
            const roomSnap = await getDoc(roomRef);
            const roomData = roomSnap.data();

            const isPlayerX = roomData.playerX === currentUser.uid;
            const playerWantsRematchField = isPlayerX ? 'playerXWantsRematch' : 'playerOWantsRematch';

            // Mark that this player wants a rematch
            await updateDoc(roomRef, { [playerWantsRematchField]: true });

            // Check if both players want a rematch
            const updatedRoomSnap = await getDoc(roomRef);
            const updatedRoomData = updatedRoomSnap.data();

            if (updatedRoomData.playerXWantsRematch && updatedRoomData.playerOWantsRematch) {
                // Both players want rematch, start new game
                const newStarter = updatedRoomData.lastStarter === 'X' ? 'O' : 'X';
                await updateDoc(roomRef, {
                    board: Array(9).fill(null),
                    turn: newStarter,
                    status: 'playing',
                    winner: null,
                    playerXWantsRematch: false,
                    playerOWantsRematch: false,
                    lastStarter: newStarter
                });
                this.log('New game started');
            } else {
                this.log('Waiting for opponent to accept rematch');
            }
        } catch (error) {
            this.log(`Failed to reset game: ${error.message}`, 'error');
        }
    }

    async leaveGame() {
        if (!this.currentRoom || !this.authManager.getCurrentUser()) {
            return;
        }

        const currentUser = this.authManager.getCurrentUser();
        const roomRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'rooms', `room_${this.currentRoom}`);

        try {
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) {
                this.cleanup();
                this.switchView('menu');
                return;
            }

            const roomData = roomSnap.data();
            const isPlayerX = roomData.playerX === currentUser.uid;
            const isPlayerO = roomData.playerO === currentUser.uid;

            if (isPlayerX && !roomData.playerO) {
                // Only player in room, delete it
                await deleteDoc(roomRef);
            } else {
                // Update room to remove this player
                const updates = { status: 'waiting' };
                if (isPlayerX) {
                    updates.playerX = null;
                    updates.playerXName = null;
                } else if (isPlayerO) {
                    updates.playerO = null;
                    updates.playerOName = null;
                }
                await updateDoc(roomRef, updates);
            }

            this.log('Left game');
        } catch (error) {
            this.log(`Failed to leave game: ${error.message}`, 'error');
        }

        this.cleanup();
        this.switchView('menu');
    }

    startGameListener(roomCode) {
        this.currentRoom = roomCode;
        
        if (this.unsubscribeGame) {
            this.unsubscribeGame();
        }

        const roomRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'rooms', `room_${roomCode}`);
        this.unsubscribeGame = onSnapshot(roomRef, (snap) => {
            if (!snap.exists()) {
                this.log("Room deleted or does not exist.");
                this.cleanup();
                this.switchView('menu');
                return;
            }

            this.gameData = snap.data();
            this.updateUI(this.gameData);

            // Switch to game view if game is playing and we're in lobby
            if (this.gameData.status === 'playing' && !document.getElementById('view-lobby').classList.contains('hidden')) {
                this.switchView('game');
            }
        });

        // Handle page unload
        this.setupUnloadHandler();
    }

    setupUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            if (this.currentRoom && this.authManager.getCurrentUser() && this.gameData) {
                const roomRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'rooms', `room_${this.currentRoom}`);
                const isPlayerX = this.gameData.playerX === this.authManager.getCurrentUser().uid;

                if (isPlayerX && !this.gameData.playerO) {
                    // If only player X is in the room, delete it on leaving
                    deleteDoc(roomRef);
                }
            }
        });
    }

    updateUI(data) {
        const currentUser = this.authManager.getCurrentUser();
        if (!currentUser) return;

        // Update room code display
        const roomCodeEl = document.getElementById('game-room-code');
        if (roomCodeEl) {
            roomCodeEl.textContent = this.currentRoom;
        }

        const isPlayerX = data.playerX === currentUser.uid;
        const isPlayerO = data.playerO === currentUser.uid;
        const playerSymbol = isPlayerX ? 'X' : (isPlayerO ? 'O' : null);

        // Update player indicators
        const p1Indicator = document.getElementById('p1-indicator');
        const p2Indicator = document.getElementById('p2-indicator');
        if (p1Indicator && p2Indicator) {
            p1Indicator.textContent = `${data.playerXName || 'Player 1'} (X)${isPlayerX ? ' (You)' : ''}`;
            p2Indicator.textContent = `${data.playerOName || 'Player 2'} (O)${isPlayerO ? ' (You)' : ''}`;
        }

        // Update scores
        const p1Score = document.getElementById('p1-score');
        const p2Score = document.getElementById('p2-score');
        if (p1Score && p2Score) {
            p1Score.textContent = data.playerXWins || 0;
            p2Score.textContent = data.playerOWins || 0;
        }

        // Update game board
        this.updateBoard(data, playerSymbol);

        // Update game status
        this.updateStatus(data, playerSymbol, isPlayerX, isPlayerO);
    }

    updateBoard(data, playerSymbol) {
        const boardEl = document.getElementById('board');
        if (!boardEl) return;

        boardEl.innerHTML = '';
        data.board.forEach((cellValue, index) => {
            const cellButton = document.createElement('button');
            cellButton.className = `cell ${cellValue || ''}`;
            cellButton.textContent = cellValue || '';
            cellButton.disabled = !!cellValue || data.status !== 'playing' || data.turn !== playerSymbol;
            cellButton.onclick = () => this.makeMove(index);
            boardEl.appendChild(cellButton);
        });
    }

    updateStatus(data, playerSymbol, isPlayerX, isPlayerO) {
        const statusEl = document.getElementById('game-status');
        const controlsEl = document.getElementById('game-controls');
        const rematchStatusEl = document.getElementById('rematch-status');

        if (!statusEl) return;

        if (data.status === 'finished') {
            // Game finished
            if (data.winner === 'DRAW') {
                statusEl.textContent = "Draw!";
            } else if (data.winner === playerSymbol) {
                statusEl.textContent = "You Won!";
            } else {
                statusEl.textContent = "You Lost!";
            }

            if (controlsEl) {
                controlsEl.classList.remove('hidden');
            }

            // Update rematch status
            if (rematchStatusEl) {
                const youWantRematch = (isPlayerX && data.playerXWantsRematch) || (isPlayerO && data.playerOWantsRematch);
                const opponentWantsRematch = (isPlayerX && data.playerOWantsRematch) || (isPlayerO && data.playerXWantsRematch);

                if (youWantRematch && !opponentWantsRematch) {
                    rematchStatusEl.textContent = "Waiting for opponent to accept rematch...";
                } else if (!youWantRematch && opponentWantsRematch) {
                    rematchStatusEl.textContent = "Opponent wants a rematch!";
                } else {
                    rematchStatusEl.textContent = "";
                }
            }
        } else if (data.status === 'playing') {
            // Game in progress
            statusEl.textContent = data.turn === playerSymbol ? "Your Turn" : "Opponent's Turn";
            
            if (controlsEl) {
                controlsEl.classList.add('hidden');
            }
            
            if (rematchStatusEl) {
                rematchStatusEl.textContent = "";
            }
        } else {
            // Waiting for opponent
            statusEl.textContent = "Waiting for opponent...";
            
            if (controlsEl) {
                controlsEl.classList.add('hidden');
            }
            
            if (rematchStatusEl) {
                rematchStatusEl.textContent = "";
            }
        }
    }

    cleanup() {
        this.currentRoom = null;
        this.gameData = null;
        
        if (this.unsubscribeGame) {
            this.unsubscribeGame();
            this.unsubscribeGame = null;
        }
    }

    getCurrentRoom() {
        return this.currentRoom;
    }

    getGameData() {
        return this.gameData;
    }
}