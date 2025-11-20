// Theme management for the Tic Tac Toe application

let themeToggle;
let prefersDark;

// Initialize theme system
export function initTheme() {
    themeToggle = document.getElementById('theme-toggle');
    prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    if (!themeToggle) {
        console.warn('Theme toggle button not found');
        return;
    }

    // Set up event listeners
    themeToggle.addEventListener('click', toggleTheme);
    prefersDark.addEventListener('change', handleSystemThemeChange);

    // Load and apply initial theme
    loadTheme();
}

// Apply theme to the document
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = '🌙';
    }
}

// Toggle theme manually
function toggleTheme() {
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

// Handle system theme preference changes
function handleSystemThemeChange(e) {
    // Only apply system preference if user hasn't manually set a theme
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
}

// Load theme from localStorage or system preference
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Use system preference as default
        applyTheme(prefersDark.matches ? 'dark' : 'light');
    }
}

// Get current theme
export function getCurrentTheme() {
    return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
}

// Set theme programmatically
export function setTheme(theme) {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
}