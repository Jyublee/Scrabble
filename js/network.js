// Network Manager - Socket.io handling
import { GAME_EVENTS } from './constants.js';

export class NetworkManager {
    constructor() {
        this.socket = null;
        this.currentPlayerId = null;
        this.isHost = false;
        this.gameRoomState = {
            players: [],
            currentPlayer: 0,
            gameStarted: false,
            gameEnded: false
        };
    }

    initialize() {
        this.socket = io();
        this.setupEventListeners();
        return this.socket;
    }

    setupEventListeners() {
        // Connection events
        this.socket.on(GAME_EVENTS.CONNECT, () => {
            console.log('🔗 Connected to server');
            this.updateConnectionStatus('Connected to server', 'text-green-600');
        });
        
        this.socket.on(GAME_EVENTS.DISCONNECT, () => {
            console.log('❌ Disconnected from server');
            this.updateConnectionStatus('Disconnected from server', 'text-red-600');
        });

        // Lobby events
        this.socket.on(GAME_EVENTS.JOINED_GAME, (data) => {
            console.log('✅ Successfully joined game:', data);
            this.currentPlayerId = data.playerId;
            this.gameRoomState = data.gameState;
            
            // Check if this is the first player (host)
            this.isHost = data.playerIndex === 0;
            
            if (this.isHost) {
                document.getElementById('start-game-btn').classList.remove('hidden');
                document.getElementById('timer-settings').classList.remove('hidden');
            }
            
            this.updateConnectionStatus('Joined game successfully!', 'text-green-600');
        });
        
        this.socket.on(GAME_EVENTS.PLAYER_JOINED, (data) => {
            console.log('👤 Player joined:', data.player.name);
            this.updatePlayersList(data);
        });
        
        this.socket.on(GAME_EVENTS.PLAYER_LEFT, (data) => {
            console.log('👋 Player left:', data.playerName);
            this.updatePlayersList(data);
        });
        
        this.socket.on(GAME_EVENTS.GAME_STARTED, (data) => {
            console.log('🎮 Game started!', data);
            this.gameRoomState = data.gameState;
            // Add tileBagBreakdown to the game room state if it's separate
            if (data.tileBagBreakdown) {
                this.gameRoomState.tileBagBreakdown = data.tileBagBreakdown;
            }
            this.showGameArea();
            this.dispatchEvent('gameStarted', data);
        });
        
        this.socket.on(GAME_EVENTS.TURN_CHANGED, (data) => {
            console.log('🔄 Turn changed:', data);
            this.gameRoomState = data.gameState;
            // Add tileBagBreakdown to the game room state if it's separate
            if (data.tileBagBreakdown) {
                this.gameRoomState.tileBagBreakdown = data.tileBagBreakdown;
            }
            this.dispatchEvent('turnChanged', data);
        });

        this.socket.on(GAME_EVENTS.TIMER_UPDATE, (data) => {
            console.log('⏰ Timer update:', data);
            this.dispatchEvent('timerUpdate', data);
        });

        this.socket.on(GAME_EVENTS.TIMER_EXPIRED, (data) => {
            console.log('⏱️ Timer expired:', data);
            this.dispatchEvent('timerExpired', data);
        });
        
        this.socket.on(GAME_EVENTS.GAME_FULL, (message) => {
            console.log('🚫 Game full:', message);
            this.updateConnectionStatus(message, 'text-red-600');
        });
    }

    // Event dispatching for other modules
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    // Network actions
    joinGame(playerName) {
        if (this.socket) {
            this.socket.emit(GAME_EVENTS.JOIN_GAME, playerName);
        }
    }

    startGame() {
        if (this.socket && this.isHost) {
            // Get timer setting from select element
            const timerSelect = document.getElementById('turn-timer-select');
            const turnTimer = parseInt(timerSelect.value) || 0;
            
            this.socket.emit(GAME_EVENTS.START_GAME, { turnTimer });
        }
    }

    playWord(wordData) {
        if (this.socket) {
            this.socket.emit(GAME_EVENTS.WORD_PLAYED, wordData);
        }
    }

    passPlayer(playerId) {
        if (this.socket) {
            this.socket.emit(GAME_EVENTS.PLAYER_PASSED, { playerId });
        }
    }

    placeTile(tileData) {
        if (this.socket) {
            this.socket.emit(GAME_EVENTS.TILE_PLACED, tileData);
        }
    }

    exchangeTiles(exchangeData) {
        if (this.socket) {
            this.socket.emit(GAME_EVENTS.TILES_EXCHANGED, exchangeData);
        }
    }

    // UI Updates
    updateConnectionStatus(message, className) {
        const status = document.getElementById('connection-status');
        if (status) {
            status.textContent = message;
            status.className = `text-center text-sm mt-4 ${className}`;
        }
    }

    updatePlayersList(data) {
        const playersList = document.getElementById('players-list');
        
        if (data.totalPlayers === 0) {
            playersList.innerHTML = '<div class="text-gray-500 text-center italic">No players yet...</div>';
            return;
        }
        
        playersList.innerHTML = '';
        for (let i = 0; i < data.totalPlayers; i++) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'flex items-center justify-between p-2 bg-gray-100 rounded';
            playerDiv.innerHTML = `
                <span class="font-medium text-gray-900">Player ${i + 1}</span>
                <span class="text-sm text-gray-600">Connected</span>
            `;
            playersList.appendChild(playerDiv);
        }
    }

    showGameArea() {
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('game-area').classList.remove('hidden');
    }

    // Getters
    getCurrentPlayerId() {
        return this.currentPlayerId;
    }

    getGameRoomState() {
        return this.gameRoomState;
    }

    isPlayerHost() {
        return this.isHost;
    }

    getSocket() {
        return this.socket;
    }
}