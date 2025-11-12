// Main Entry Point - Clean and Simple
import { GameController } from './js/game-controller.js';

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameController();
    game.initialize();
});