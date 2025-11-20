// Room management for the Tic Tac Toe application
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { generateRoomCode, validateRoomCode, handleError } from './utils.js';

export class RoomManager {
    constructor(db, appId, logFunction) {
        this.db = db;
        this.appId = appId;
        this.log = logFunction;
        this.unsubscribeRooms = null;
        this.authManager = null; // Will be set externally
        this.gameManager = null; // Will be set externally
    }

    setAuthManager(authManager) {
        this.authManager = authManager;
    }

    setGameManager(gameManager) {
        this.gameManager = gameManager;
    }

    // Helper function to switch views
    switchView(view) {
        const views = ['name', 'menu', 'join', 'lobby', 'game'];
        views.forEach(id => {
            document.getElementById(`view-${id}`).classList.add('hidden');
        });
        document.getElementById(`view-${view}`).classList.remove('hidden');
    }

    async createRoom() {
        if (!this.authManager.getCurrentUser()) {
            this.log("Wait for login...", 'error');
            return;
        }

        const roomCode = generateRoomCode();
        const currentUser = this.authManager.getCurrentUser();
        const playerName = this.authManager.getCurrentPlayerName();

        try {
            this.log(`Creating ${roomCode}...`);

            // Create room document
            const roomData = {
                board: Array(9).fill(null),
                turn: 'X',
                status: 'waiting',
                winner: null,
                playerX: currentUser.uid,
                playerO: null,
                createdAt: Date.now(),
                playerXWantsRematch: false,
                playerOWantsRematch: false,
                playerXName: playerName,
                playerOName: null,
                playerXWins: 0,
                playerOWins: 0,
                lastStarter: 'O' // O starts first, so next is X
            };

            const roomRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'rooms', `room_${roomCode}`);
            await setDoc(roomRef, roomData);

            // Update UI
            const lobbyCodeEl = document.getElementById('lobby-code');
            if (lobbyCodeEl) {
                lobbyCodeEl.textContent = roomCode;
            }

            this.switchView('lobby');
            this.gameManager.startGameListener(roomCode);

            this.log(`Room ${roomCode} created successfully`);

        } catch (error) {
            const errorMessage = handleError(error, 'Create Room');
            
            if (error.code === 'permission-denied') {
                this.log("FIX: Go to Firebase Console > Firestore > Rules. Change 'allow read, write: if false;' to 'if true;'", 'error');
            }
        }
    }

    async joinRoom() {
        if (!this.authManager.getCurrentUser()) {
            this.log("Please wait for authentication", 'error');
            return;
        }

        const codeInput = document.getElementById('join-code-input');
        const errorDiv = document.getElementById('join-error');
        
        if (!codeInput) {
            this.log("Join code input not found", 'error');
            return;
        }

        const code = codeInput.value.toUpperCase().trim();

        // Clear previous errors
        if (errorDiv) {
            errorDiv.textContent = '';
        }

        // Validate code format
        if (!validateRoomCode(code)) {
            const error = "Invalid code format. Use format: XXX-XX-XXX";
            this.log(error, 'error');
            if (errorDiv) {
                errorDiv.textContent = error;
            }
            return;
        }

        const currentUser = this.authManager.getCurrentUser();
        const playerName = this.authManager.getCurrentPlayerName();

        try {
            this.log(`Joining ${code}...`);

            const roomRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'rooms', `room_${code}`);
            const snap = await getDoc(roomRef);

            if (!snap.exists()) {
                const error = "Room not found";
                this.log(error, 'error');
                if (errorDiv) {
                    errorDiv.textContent = error;
                }
                return;
            }

            const roomData = snap.data();

            // Check if room is full
            if (roomData.playerX !== currentUser.uid && roomData.playerO && roomData.playerO !== currentUser.uid) {
                const error = "Room is full";
                this.log(error, 'error');
                if (errorDiv) {
                    errorDiv.textContent = error;
                }
                return;
            }

            // Join or rejoin room
            if (!roomData.playerO && roomData.playerX !== currentUser.uid) {
                // Join as player O
                await updateDoc(roomRef, {
                    playerO: currentUser.uid,
                    status: 'playing',
                    playerOName: playerName
                });
                this.log("Joined as Player O");
            } else if (roomData.playerX === currentUser.uid && !roomData.playerXName) {
                // Update player X name if missing
                await updateDoc(roomRef, {
                    playerXName: playerName
                });
                this.log("Rejoined as Player X");
            } else if (roomData.playerO === currentUser.uid) {
                this.log("Rejoined as Player O");
            } else {
                this.log("Rejoined as Player X");
            }

            this.switchView('game');
            this.gameManager.startGameListener(code);

        } catch (error) {
            const errorMessage = handleError(error, 'Join Room');
            if (errorDiv) {
                errorDiv.textContent = errorMessage;
            }
        }
    }

    listenForRooms() {
        if (this.unsubscribeRooms) {
            this.unsubscribeRooms();
        }

        const roomsCollection = collection(this.db, 'artifacts', this.appId, 'public', 'data', 'rooms');
        
        this.unsubscribeRooms = onSnapshot(roomsCollection, (snapshot) => {
            this.updateRoomList(snapshot);
        }, (error) => {
            this.log(`Failed to listen for rooms: ${error.message}`, 'error');
        });
    }

    updateRoomList(snapshot) {
        const roomListEl = document.getElementById('room-list');
        if (!roomListEl) return;

        roomListEl.innerHTML = '';
        let roomCount = 0;

        snapshot.forEach((doc) => {
            const room = doc.data();
            const roomCode = doc.id.replace('room_', '');

            // Only show waiting rooms that need a second player
            if (room.status === 'waiting' && !room.playerO) {
                roomCount++;
                const roomItem = this.createRoomListItem(room, roomCode);
                roomListEl.appendChild(roomItem);
            }
        });

        // Show message if no rooms available
        if (roomCount === 0) {
            roomListEl.innerHTML = '<p style="padding: 1rem; text-align: center; color: #64748b;">No available rooms.</p>';
        }
    }

    createRoomListItem(room, roomCode) {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.onclick = () => {
            const joinCodeInput = document.getElementById('join-code-input');
            if (joinCodeInput) {
                joinCodeInput.value = roomCode;
            }
            this.joinRoom();
        };

        const nameEl = document.createElement('span');
        nameEl.className = 'room-item-name';
        nameEl.textContent = `${room.playerXName || 'Anonymous'}'s Room`;

        const playersEl = document.createElement('span');
        playersEl.className = 'room-item-players';
        playersEl.textContent = '1/2 Players';

        roomItem.appendChild(nameEl);
        roomItem.appendChild(playersEl);

        return roomItem;
    }

    stopListening() {
        if (this.unsubscribeRooms) {
            this.unsubscribeRooms();
            this.unsubscribeRooms = null;
        }
    }

    cleanup() {
        this.stopListening();
    }
}