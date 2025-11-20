// Firebase Configuration
// This file contains the Firebase configuration for the Tic Tac Toe application

export const firebaseConfig = {
    apiKey: "AIzaSyDk8eVrKZSXbCDE1QdmpMZ6y9PgBtYlK4I",
    authDomain: "tic-tac-toe-41a5c.firebaseapp.com",
    projectId: "tic-tac-toe-41a5c",
    storageBucket: "tic-tac-toe-41a5c.firebasestorage.app",
    messagingSenderId: "17510786092",
    appId: "1:17510786092:web:5734cd305289b0b3d99d89",
    measurementId: "G-8GTZKD290J"
};

// App ID for multi-tenancy support
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Check for environment-specific configuration
export function getFirebaseConfig() {
    // Priority: 1. Environment Config (Preview), 2. Manual Config (Deploy)
    if (typeof __firebase_config !== 'undefined') {
        return JSON.parse(__firebase_config);
    }
    return firebaseConfig;
}

// Validate configuration
export function validateConfig(config) {
    if (!config || !config.apiKey || config.apiKey.includes("REPLACE_THIS")) {
        throw new Error("Firebase configuration is missing or incomplete. Please update config/firebase.js");
    }
    return true;
}