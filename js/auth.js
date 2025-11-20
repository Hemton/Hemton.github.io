// Authentication management for the Tic Tac Toe application
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

export class AuthManager {
    constructor(auth, logFunction) {
        this.auth = auth;
        this.log = logFunction;
        this.currentUser = null;
        this.currentPlayerName = null;
    }

    async initialize() {
        // Set up authentication state listener
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.log(`User: ${user.uid.slice(0,5)}...`);
            }
        });

        // Perform initial authentication
        await this.signIn();
    }

    async signIn() {
        try {
            // Check for custom token first
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                try {
                    await signInWithCustomToken(this.auth, __initial_auth_token);
                    this.log("Signed in (Custom Token)");
                    return;
                } catch (e) {
                    this.log("Custom token failed, falling back to anonymous", 'warn');
                }
            }

            // Fall back to anonymous authentication
            await signInAnonymously(this.auth);
            this.log("Signed in Anonymously");

        } catch (error) {
            this.log(`AUTH ERROR: ${error.message}`, 'error');
            
            if (error.code === 'auth/api-key-not-valid') {
                this.log("EXPLANATION: Invalid Firebase API key. Please check your configuration.", 'error');
            }
            
            throw error;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentPlayerName() {
        return this.currentPlayerName;
    }

    setPlayerName(name) {
        this.currentPlayerName = name;
        this.log(`Player name set: ${name}`);
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    // Wait for authentication to complete
    async waitForAuth(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (this.isAuthenticated()) {
                resolve(this.currentUser);
                return;
            }

            const timer = setTimeout(() => {
                unsubscribe();
                reject(new Error('Authentication timeout'));
            }, timeout);

            const unsubscribe = onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve(user);
                }
            });
        });
    }
}