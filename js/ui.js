// UI Manager - Handle user interface interactions
import { TILE_BAG, RACK_SIZE } from './constants.js';

export class UIManager {
    constructor(boardManager, networkManager) {
        this.boardManager = boardManager;
        this.networkManager = networkManager;
        this.draggedTile = null;
        this.selectedTilesForExchange = [];
        this.timerInterval = null;
        this.currentTimer = 0;
        this.maxTimer = 0;
    }

    initialize() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupButtons();
    }

    setupEventListeners() {
        // Lobby events
        document.getElementById('join-game-btn').addEventListener('click', () => {
            const playerName = document.getElementById('player-name').value.trim();
            if (!playerName) {
                alert('Please enter your name');
                return;
            }
            this.networkManager.joinGame(playerName);
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.networkManager.startGame();
        });

        // Game events
        document.addEventListener('gameStarted', (event) => {
            this.handleGameStarted(event.detail);
        });

        document.addEventListener('timerUpdate', (event) => {
            this.handleTimerUpdate(event.detail);
        });

        document.addEventListener('timerExpired', (event) => {
            this.handleTimerExpired(event.detail);
        });

        // Enter key in player name input
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('join-game-btn').click();
            }
        });
    }

    setupDragAndDrop() {
        // Setup rack drop zone
        const rack = document.getElementById('player-rack');
        if (rack) {
            rack.addEventListener('dragover', (e) => e.preventDefault());
            rack.addEventListener('drop', this.handleRackDrop.bind(this));
        }
    }

    setupButtons() {
        document.getElementById('btn-submit').addEventListener('click', () => {
            this.dispatchEvent('playWord');
        });

        document.getElementById('btn-pass').addEventListener('click', () => {
            this.dispatchEvent('passPlayer');
        });

        document.getElementById('btn-swap').addEventListener('click', () => {
            this.dispatchEvent('swapTiles');
        });

        document.getElementById('btn-recall').addEventListener('click', () => {
            this.recallTiles();
        });
    }

    handleGameStarted(gameData) {
        this.boardManager.createBoard();
        this.updateGameUI(gameData.gameState, gameData.tileBagBreakdown);
    }

    handleRackDrop(e) {
        e.preventDefault();
        
        const tileData = e.dataTransfer.getData('text/plain');
        if (!tileData) return;
        
        const tile = JSON.parse(tileData);
        
        // If tile is from board, recall it to rack
        if (tile.fromBoard && tile.isCurrentTurn) {
            this.recallSingleTileToRack(tile);
        }
    }

    recallSingleTileToRack(tileData) {
        console.log('🔄 Recalling single tile to rack:', tileData);
        
        // Dispatch event to game controller to handle the recall properly
        this.dispatchEvent('singleTileRecalled', { 
            row: parseInt(tileData.row),
            col: parseInt(tileData.col),
            letter: tileData.letter,
            points: parseInt(tileData.points),
            isBlank: tileData.isBlank || false,
            designatedLetter: tileData.designatedLetter
        });
    }

    recallTiles() {
        const recalledTiles = this.boardManager.recallTiles();
        if (recalledTiles.length > 0) {
            this.dispatchEvent('tilesRecalled', { tiles: recalledTiles });
            this.log(`Recalled ${recalledTiles.length} tiles to rack`);
        }
    }

    // Tile creation with drag handlers
    createTileElement(letter, points) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.draggable = true;
        tile.textContent = letter === 'BLANK' ? '' : letter;
        tile.dataset.letter = letter;
        tile.dataset.points = points;
        
        // Add drag event listeners
        tile.addEventListener('dragstart', this.handleDragStart.bind(this));
        tile.addEventListener('dragend', this.handleDragEnd.bind(this));
        
        // Handle blank tiles
        if (letter === 'BLANK') {
            tile.addEventListener('click', () => this.handleBlankTile(tile));
            // Add points display for blank tiles showing 0
            const pointsSpan = document.createElement('span');
            pointsSpan.className = 'points';
            pointsSpan.textContent = '0';
            tile.appendChild(pointsSpan);
        }
        
        if (letter !== 'BLANK') {
            const pointsSpan = document.createElement('span');
            pointsSpan.className = 'points';
            pointsSpan.textContent = points;
            tile.appendChild(pointsSpan);
        }
        
        return tile;
    }

    handleDragStart(e) {
        this.draggedTile = e.target;
        
        const isBlank = e.target.dataset.letter === 'BLANK' || e.target.dataset.isBlank === 'true';
        const designatedLetter = e.target.dataset.designatedLetter;
        
        const tileData = {
            letter: e.target.dataset.letter,
            points: parseInt(e.target.dataset.points),
            isBlank: isBlank,
            designatedLetter: designatedLetter,
            rackIndex: e.target.dataset.rackIndex,
            fromBoard: e.target.closest('.board-square') !== null,
            row: e.target.closest('.board-square')?.dataset.r,
            col: e.target.closest('.board-square')?.dataset.c
        };
        
        e.dataTransfer.setData('text/plain', JSON.stringify(tileData));
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedTile = null;
    }

    handleBlankTile(tileElement) {
        const letter = prompt('What letter should this blank tile represent? (A-Z)');
        if (letter && /^[A-Z]$/i.test(letter)) {
            const upperLetter = letter.toUpperCase();
            tileElement.textContent = upperLetter;
            // Keep original letter as BLANK but store designated letter
            tileElement.dataset.designatedLetter = upperLetter;
            tileElement.dataset.isBlank = 'true';
            tileElement.classList.add('blank-tile-designated');
            
            // Ensure blank tiles always show 0 points
            let pointsSpan = tileElement.querySelector('.points');
            if (!pointsSpan) {
                pointsSpan = document.createElement('span');
                pointsSpan.className = 'points';
                tileElement.appendChild(pointsSpan);
            }
            pointsSpan.textContent = '0';
        }
    }

    // Game state updates
    updateGameUI(gameState, tileBagBreakdown = null) {
        console.log('🎮 Updating game UI with state:', gameState);
        this.updateCurrentPlayer(gameState.players?.[gameState.currentPlayer]?.name || 'Unknown');
        this.updateButtonStates(gameState);
        // Use the separate tileBagBreakdown parameter if provided, otherwise look for it in gameState
        const breakdown = tileBagBreakdown || gameState.tileBagBreakdown || {};
        this.updateLetterBagDisplay(breakdown);
    }

    updateCurrentPlayer(playerName) {
        const currentPlayerElement = document.getElementById('current-player');
        if (currentPlayerElement) {
            currentPlayerElement.textContent = playerName;
        }
    }

    handleTimerUpdate(data) {
        // Only update timer if we have the current player info
        if (data.currentPlayer !== undefined) {
            // Check if it's my turn by comparing current player index with my player index
            const gameRoomState = this.networkManager.getGameRoomState();
            const myPlayerId = this.networkManager.getCurrentPlayerId();
            const myPlayerIndex = gameRoomState.players.findIndex(p => p.id === myPlayerId);
            
            // Always update timer data
            this.currentTimer = data.timeRemaining;
            this.maxTimer = data.maxTime;
            
            // Determine whose turn it is
            const currentPlayerName = gameRoomState.players[data.currentPlayer]?.name || 'Unknown Player';
            const isMyTurn = data.currentPlayer === myPlayerIndex;
            
            // Update timer display with context
            this.updateTimerDisplay(isMyTurn, currentPlayerName);
        }
    }

    handleTimerExpired(data) {
        console.log('⏱️ Timer expired for player:', data.playerName);
        this.currentTimer = 0;
        
        // Check if it was my turn or someone else's
        const gameRoomState = this.networkManager.getGameRoomState();
        const myPlayerId = this.networkManager.getCurrentPlayerId();
        const myPlayerIndex = gameRoomState.players.findIndex(p => p.id === myPlayerId);
        const wasMyTurn = data.currentPlayer === myPlayerIndex;
        
        this.updateTimerDisplay(wasMyTurn, data.playerName);
        
        // Show notification
        if (wasMyTurn) {
            this.log(`⏰ Time's up! Your turn was skipped.`);
        } else {
            this.log(`⏰ Time's up! ${data.playerName}'s turn was skipped.`);
        }
    }

    updateTimerDisplay(isMyTurn = true, currentPlayerName = '') {
        const timerElement = document.getElementById('timer-countdown');
        const progressElement = document.getElementById('timer-progress');
        const timerDisplayElement = document.getElementById('turn-timer-display');
        const timerLabelElement = document.getElementById('timer-label');
        const timerPlayerInfoElement = document.getElementById('timer-player-info');
        
        if (this.maxTimer === 0) {
            // No timer set
            timerDisplayElement.style.display = 'none';
            return;
        }
        
        timerDisplayElement.style.display = 'block';
        
        if (timerElement && this.currentTimer >= 0) {
            const minutes = Math.floor(this.currentTimer / 60);
            const seconds = this.currentTimer % 60;
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Update labels and info based on whose turn it is
            if (isMyTurn) {
                timerLabelElement.textContent = 'Your Time Remaining';
                timerPlayerInfoElement.textContent = 'It\'s your turn!';
                timerPlayerInfoElement.className = 'text-xs text-blue-400 mt-1 font-medium';
            } else {
                timerLabelElement.textContent = 'Current Player\'s Time';
                timerPlayerInfoElement.textContent = `${currentPlayerName} is thinking...`;
                timerPlayerInfoElement.className = 'text-xs text-gray-400 mt-1';
            }
            
            // Change color based on remaining time and whose turn it is
            if (this.currentTimer <= 30) {
                timerElement.className = 'text-2xl font-bold text-red-500';
                progressElement.className = 'bg-red-500 h-2 rounded-full transition-all duration-1000';
            } else if (this.currentTimer <= 60) {
                timerElement.className = 'text-2xl font-bold text-orange-400';
                progressElement.className = 'bg-orange-400 h-2 rounded-full transition-all duration-1000';
            } else {
                if (isMyTurn) {
                    timerElement.className = 'text-2xl font-bold text-yellow-400';
                    progressElement.className = 'bg-yellow-400 h-2 rounded-full transition-all duration-1000';
                } else {
                    timerElement.className = 'text-2xl font-bold text-blue-400';
                    progressElement.className = 'bg-blue-400 h-2 rounded-full transition-all duration-1000';
                }
            }
            
            // Update progress bar
            if (progressElement && this.maxTimer > 0) {
                const percentage = (this.currentTimer / this.maxTimer) * 100;
                progressElement.style.width = `${Math.max(0, percentage)}%`;
            }
        }
    }

    hideTimerDisplay() {
        const timerDisplayElement = document.getElementById('turn-timer-display');
        
        // Hide timer completely when no timer is set
        if (timerDisplayElement) {
            timerDisplayElement.style.display = 'none';
        }
    }

    updateLetterBagDisplay(breakdown) {
        console.log('📊 Updating letter bag display with breakdown:', breakdown);
        const bagTotalElement = document.getElementById('bag-total-count');
        const letterBreakdownElement = document.getElementById('letter-breakdown');
        
        if (!breakdown || Object.keys(breakdown).length === 0) {
            console.log('⚠️ No breakdown data available');
            return;
        }
        
        // Update total count
        const totalCount = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
        console.log('📈 Total tiles in bag:', totalCount);
        if (bagTotalElement) {
            bagTotalElement.textContent = totalCount;
        }
        
        // Update letter breakdown
        if (letterBreakdownElement) {
            letterBreakdownElement.innerHTML = '';
            
            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'BLANK'];
            
            letters.forEach(letter => {
                const count = breakdown[letter] || 0;
                const letterElement = document.createElement('div');
                letterElement.className = `flex justify-between items-center p-2 rounded ${count > 0 ? 'bg-blue-800 text-blue-100' : 'bg-gray-700 text-gray-400'}`;
                
                const displayLetter = letter === 'BLANK' ? '★' : letter;
                letterElement.innerHTML = `
                    <span class="font-medium">${displayLetter}</span>
                    <span class="font-bold">${count}</span>
                `;
                
                letterBreakdownElement.appendChild(letterElement);
            });
        }
    }

    updateButtonStates(gameState) {
        const submitBtn = document.getElementById('btn-submit');
        const passBtn = document.getElementById('btn-pass');
        const swapBtn = document.getElementById('btn-swap');
        const recallBtn = document.getElementById('btn-recall');
        
        const gameStarted = gameState.gameStarted;
        const gameEnded = gameState.gameEnded;
        const isMyTurn = this.isMyTurn(gameState);
        
        if (!gameStarted || gameEnded) {
            [submitBtn, passBtn, swapBtn, recallBtn].forEach(btn => {
                if (btn) btn.disabled = true;
            });
            this.disableTileInteractions();
            return;
        }

        // Calculate total tiles remaining from breakdown
        let tilesRemaining = 0;
        if (gameState.tileBagBreakdown) {
            tilesRemaining = Object.values(gameState.tileBagBreakdown).reduce((sum, count) => sum + count, 0);
        }
        
        if (submitBtn) submitBtn.disabled = !isMyTurn;
        if (passBtn) passBtn.disabled = !isMyTurn;
        if (recallBtn) recallBtn.disabled = !isMyTurn;
        if (swapBtn) swapBtn.disabled = !isMyTurn || tilesRemaining < 7;
        
        // Update button text to indicate whose turn it is
        if (!isMyTurn && gameStarted) {
            if (submitBtn) submitBtn.textContent = "Not Your Turn";
        } else {
            if (submitBtn) submitBtn.textContent = "Play Word";
        }
        
        // Enable/disable tile interactions based on turn
        if (isMyTurn && gameStarted) {
            this.enableTileInteractions();
        } else {
            this.disableTileInteractions();
        }
    }

    isMyTurn(gameState) {
        const currentPlayerId = this.networkManager.getCurrentPlayerId();
        const currentPlayer = gameState.players?.[gameState.currentPlayer];
        return currentPlayer?.id === currentPlayerId;
    }

    // Logging
    log(message) {
        console.log(`🎯 ${message}`);
        this.addToGameLog(message);
    }

    addToGameLog(message) {
        const gameLog = document.getElementById('game-log');
        if (!gameLog) return;
        
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
    }

    // Exchange interface
    showExchangeInterface(availableTiles) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Exchange Tiles</h2>
                <p class="text-gray-700 mb-4">Select tiles to exchange:</p>
                <div id="exchange-tiles" class="flex flex-wrap gap-2 mb-4 justify-center">
                    <!-- Tiles will be added here -->
                </div>
                <div class="flex gap-2 justify-end">
                    <button id="cancel-exchange" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
                    <button id="confirm-exchange" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Exchange</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add tiles to interface
        const tilesContainer = overlay.querySelector('#exchange-tiles');
        availableTiles.forEach((tile, index) => {
            const tileElement = this.createExchangeTileElement(tile, index);
            tilesContainer.appendChild(tileElement);
        });
        
        // Setup event listeners
        overlay.querySelector('#cancel-exchange').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        overlay.querySelector('#confirm-exchange').addEventListener('click', () => {
            const selectedIndices = Array.from(overlay.querySelectorAll('.exchange-tile.selected'))
                .map(tile => parseInt(tile.dataset.index));
            
            if (selectedIndices.length > 0) {
                this.dispatchEvent('exchangeTiles', { indices: selectedIndices });
            }
            
            document.body.removeChild(overlay);
        });
    }

    createExchangeTileElement(tile, index) {
        const tileElement = this.createTileElement(tile.letter || tile, TILE_BAG[tile.letter || tile]?.points || 0);
        tileElement.className += ' exchange-tile cursor-pointer';
        tileElement.dataset.index = index;
        
        tileElement.addEventListener('click', () => {
            tileElement.classList.toggle('selected');
            if (tileElement.classList.contains('selected')) {
                tileElement.style.backgroundColor = '#93c5fd';
            } else {
                tileElement.style.backgroundColor = '';
            }
        });
        
        return tileElement;
    }

    // Event dispatching
    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    // Tile interaction management
    enableTileInteractions() {
        // Enable rack tile dragging
        const rackTiles = document.querySelectorAll('#player-rack .tile');
        rackTiles.forEach(tile => {
            tile.draggable = true;
            tile.style.opacity = '1';
            tile.style.cursor = 'grab';
            tile.classList.remove('disabled-tile');
        });

        // Enable current turn board tiles
        const currentTurnTiles = document.querySelectorAll('.current-turn-tile');
        currentTurnTiles.forEach(tile => {
            tile.draggable = true;
            tile.style.opacity = '1';
            tile.style.cursor = 'grab';
            tile.classList.remove('disabled-tile');
        });

        // Enable board drop zones
        const boardSquares = document.querySelectorAll('.board-square');
        boardSquares.forEach(square => {
            square.style.pointerEvents = 'auto';
        });

        // Enable rack drop zone
        const rack = document.getElementById('player-rack');
        if (rack) {
            rack.style.pointerEvents = 'auto';
        }

        console.log('✅ Tile interactions enabled - Your turn!');
    }

    disableTileInteractions() {
        // Disable rack tile dragging
        const rackTiles = document.querySelectorAll('#player-rack .tile');
        rackTiles.forEach(tile => {
            tile.draggable = false;
            tile.style.opacity = '0.6';
            tile.style.cursor = 'not-allowed';
            tile.classList.add('disabled-tile');
        });

        // Disable current turn board tiles
        const currentTurnTiles = document.querySelectorAll('.current-turn-tile');
        currentTurnTiles.forEach(tile => {
            tile.draggable = false;
            tile.style.opacity = '0.6';
            tile.style.cursor = 'not-allowed';
            tile.classList.add('disabled-tile');
        });

        // Disable board drop zones
        const boardSquares = document.querySelectorAll('.board-square');
        boardSquares.forEach(square => {
            square.style.pointerEvents = 'none';
        });

        // Keep rack drop zone enabled for recalling tiles placed during turn
        // but disable new tile placement
        const rack = document.getElementById('player-rack');
        if (rack) {
            rack.style.pointerEvents = 'auto'; // Allow dropping recalled tiles
        }

        console.log('🚫 Tile interactions disabled - Not your turn');
    }

    // Display methods
    showGameArea() {
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('game-area').classList.remove('hidden');
    }

    showLobby() {
        document.getElementById('lobby-screen').classList.remove('hidden');
        document.getElementById('game-area').classList.add('hidden');
    }
}