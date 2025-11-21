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

        // Blank tile picker event
        document.addEventListener('showBlankTilePicker', (event) => {
            this.handleBlankTile(event.detail.tileElement);
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
        
        // Blank tiles should not be draggable until assigned
        if (letter === 'BLANK') {
            tile.draggable = false;
            tile.style.cursor = 'pointer';
            tile.classList.add('blank-unassigned');
            tile.textContent = '';
        } else {
            tile.draggable = true;
            tile.textContent = letter;
        }
        
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
        
        // Prevent dragging unassigned blank tiles
        if (e.target.dataset.letter === 'BLANK' && !designatedLetter) {
            e.preventDefault();
            alert('Please click the blank tile to choose a letter first!');
            return false;
        }
        
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
        // Show letter picker modal
        this.showLetterPickerModal((selectedLetter) => {
            if (selectedLetter) {
                tileElement.textContent = selectedLetter;
                tileElement.dataset.designatedLetter = selectedLetter;
                tileElement.dataset.isBlank = 'true';
                tileElement.classList.add('blank-tile-designated');
                
                // Make the tile draggable now that it has a letter
                tileElement.draggable = true;
                tileElement.style.cursor = 'grab';
                tileElement.classList.remove('blank-unassigned');
                
                // Ensure blank tiles always show 0 points
                let pointsSpan = tileElement.querySelector('.points');
                if (!pointsSpan) {
                    pointsSpan = document.createElement('span');
                    pointsSpan.className = 'points';
                    tileElement.appendChild(pointsSpan);
                }
                pointsSpan.textContent = '0';
                
                console.log(`✅ Blank tile assigned letter: ${selectedLetter}`);
            }
        });
    }

    showLetterPickerModal(callback) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 flex items-center justify-center z-50';
        overlay.style.background = 'rgba(0, 0, 0, 0.75)';
        overlay.innerHTML = `
            <div class="p-8 rounded-xl shadow-2xl max-w-md w-full mx-4" style="background: linear-gradient(145deg, #3d2817 0%, #2a1a0f 100%); border: 3px solid #8b6914;">
                <h2 class="text-2xl font-bold mb-4" style="color: #fbbf24; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Choose a Letter</h2>
                <p class="mb-4 font-medium" style="color: #fde68a;">Select which letter this blank tile should represent:</p>
                <div id="letter-picker-grid" class="grid grid-cols-7 gap-2 mb-6">
                    <!-- Letters will be added here -->
                </div>
                <div class="flex gap-2 justify-end">
                    <button id="cancel-letter-picker" class="px-5 py-3 font-bold rounded-lg transition duration-200" style="background: linear-gradient(to bottom, #6b7280 0%, #4b5563 100%); color: white; border: 2px solid #374151; box-shadow: 0 4px 6px rgba(0,0,0,0.3); text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add letter tiles A-Z
        const letterGrid = overlay.querySelector('#letter-picker-grid');
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        for (let letter of alphabet) {
            const letterTile = document.createElement('div');
            letterTile.className = 'tile cursor-pointer transition-all flex items-center justify-center text-2xl font-bold rounded-lg';
            letterTile.style.width = '45px';
            letterTile.style.height = '45px';
            letterTile.style.backgroundImage = "url('../assets/textures/Tile Background.png')";
            letterTile.style.backgroundSize = '100% 100%';
            letterTile.style.backgroundColor = 'transparent';
            letterTile.style.border = '2px solid #ca8a04';
            letterTile.style.color = '#451a03';
            letterTile.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            letterTile.textContent = letter;
            
            letterTile.addEventListener('mouseenter', () => {
                letterTile.style.transform = 'scale(1.1)';
                letterTile.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            });
            
            letterTile.addEventListener('mouseleave', () => {
                letterTile.style.transform = 'scale(1)';
                letterTile.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            });
            
            letterTile.addEventListener('click', () => {
                callback(letter);
                document.body.removeChild(overlay);
            });
            
            letterGrid.appendChild(letterTile);
        }
        
        // Cancel button
        overlay.querySelector('#cancel-letter-picker').addEventListener('click', () => {
            callback(null);
            document.body.removeChild(overlay);
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                callback(null);
                document.body.removeChild(overlay);
            }
        });
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
                letterElement.className = 'flex justify-between items-center p-2 rounded-lg';
                
                if (count > 0) {
                    letterElement.style.background = 'linear-gradient(to right, rgba(202, 138, 4, 0.3), rgba(139, 105, 20, 0.2))';
                    letterElement.style.border = '1px solid #8b6914';
                    letterElement.style.color = '#fde68a';
                } else {
                    letterElement.style.background = 'rgba(0, 0, 0, 0.2)';
                    letterElement.style.border = '1px solid rgba(139, 105, 20, 0.15)';
                    letterElement.style.color = '#78716c';
                }
                
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
            this.hideFreeSwapNotification();
            return;
        }

        // Calculate total tiles remaining from breakdown
        let tilesRemaining = 0;
        if (gameState.tileBagBreakdown) {
            tilesRemaining = Object.values(gameState.tileBagBreakdown).reduce((sum, count) => sum + count, 0);
        }
        
        // Check if local player has 3+ same letters (free swap eligible)
        const localPlayer = gameState.players?.find(p => p.socketId === this.networkManager?.socket?.id);
        const hasFreeSwap = this.checkHasThreeOrMoreSameLetter(localPlayer);
        const freeSwapAlreadyUsed = gameState.freeSwapUsedThisTurn || false;
        const freeSwapAvailable = hasFreeSwap && !freeSwapAlreadyUsed;
        
        if (submitBtn) submitBtn.disabled = !isMyTurn;
        if (passBtn) passBtn.disabled = !isMyTurn;
        if (recallBtn) recallBtn.disabled = !isMyTurn;
        
        // Enable swap if: player's turn AND (tiles remaining >= 7 OR free swap available and not yet used)
        if (swapBtn) {
            swapBtn.disabled = !isMyTurn || (tilesRemaining < 7 && !freeSwapAvailable);
            
            // Update swap button text based on free swap eligibility
            if (freeSwapAvailable && isMyTurn) {
                swapBtn.textContent = "Free Swap! 🎁";
                swapBtn.style.background = "linear-gradient(to bottom, #8b5cf6 0%, #7c3aed 100%)";
                swapBtn.style.borderColor = "#6d28d9";
            } else if (freeSwapAlreadyUsed && isMyTurn) {
                swapBtn.textContent = "Swap (Used)";
                swapBtn.style.background = "linear-gradient(to bottom, #6b7280 0%, #4b5563 100%)";
                swapBtn.style.borderColor = "#374151";
            } else {
                swapBtn.textContent = "Swap";
                swapBtn.style.background = "linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%)";
                swapBtn.style.borderColor = "#1d4ed8";
            }
        }
        
        // Show/hide free swap notification
        if (freeSwapAvailable && isMyTurn) {
            this.showFreeSwapNotification(localPlayer);
        } else {
            this.hideFreeSwapNotification();
        }
        
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

    showFreeSwapNotification(player) {
        // Check if notification already exists
        let notification = document.getElementById('free-swap-notification');
        
        if (!notification) {
            // Create notification element
            notification = document.createElement('div');
            notification.id = 'free-swap-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
                padding: 1rem 1.5rem;
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                border: 3px solid #6d28d9;
                border-radius: 0.75rem;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.3);
                color: white;
                font-weight: bold;
                font-size: 1rem;
                text-align: center;
                animation: slideDown 0.3s ease-out, pulse 2s infinite;
            `;
            
            // Get letters with 3+ count
            const repeatedLetters = this.getLettersWithThreeOrMore(player);
            const letterText = repeatedLetters.map(l => `${l.letter} (×${l.count})`).join(', ');
            
            notification.innerHTML = `
                <div style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                    🎁 <strong>FREE SWAP AVAILABLE!</strong> 🎁
                </div>
                <div style="font-size: 0.85rem; margin-top: 0.25rem; opacity: 0.95;">
                    You have 3+ of the same letter: ${letterText}
                </div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem; opacity: 0.85;">
                    Swap tiles without skipping your turn!
                </div>
            `;
            
            document.body.appendChild(notification);
        }
    }

    hideFreeSwapNotification() {
        const notification = document.getElementById('free-swap-notification');
        if (notification) {
            notification.remove();
        }
    }

    // Helper methods for free swap feature
    checkHasThreeOrMoreSameLetter(player) {
        if (!player || !player.rack) return false;
        
        const letterCounts = {};
        player.rack.forEach(tile => {
            const letter = typeof tile === 'string' ? tile : tile.letter;
            if (letter !== 'BLANK') {
                letterCounts[letter] = (letterCounts[letter] || 0) + 1;
            }
        });
        
        const maxCount = Math.max(...Object.values(letterCounts), 0);
        return maxCount >= 3;
    }

    getLettersWithThreeOrMore(player) {
        if (!player || !player.rack) return [];
        
        const letterCounts = {};
        player.rack.forEach(tile => {
            const letter = typeof tile === 'string' ? tile : tile.letter;
            if (letter !== 'BLANK') {
                letterCounts[letter] = (letterCounts[letter] || 0) + 1;
            }
        });
        
        return Object.entries(letterCounts)
            .filter(([_, count]) => count >= 3)
            .map(([letter, count]) => ({ letter, count }));
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
        overlay.className = 'fixed inset-0 flex items-center justify-center z-50';
        overlay.style.background = 'rgba(0, 0, 0, 0.75)';
        overlay.innerHTML = `
            <div class="p-8 rounded-xl shadow-2xl max-w-md w-full mx-4" style="background: linear-gradient(145deg, #3d2817 0%, #2a1a0f 100%); border: 3px solid #8b6914;">
                <h2 class="text-2xl font-bold mb-4" style="color: #fbbf24; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Exchange Tiles</h2>
                <p class="mb-4 font-medium" style="color: #fde68a;">Select tiles to exchange:</p>
                <div id="exchange-tiles" class="flex flex-wrap gap-2 mb-6 justify-center">
                    <!-- Tiles will be added here -->
                </div>
                <div class="flex gap-3 justify-end">
                    <button id="cancel-exchange" class="px-5 py-3 font-bold rounded-lg transition duration-200" style="background: linear-gradient(to bottom, #6b7280 0%, #4b5563 100%); color: white; border: 2px solid #374151; box-shadow: 0 4px 6px rgba(0,0,0,0.3); text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">Cancel</button>
                    <button id="confirm-exchange" class="px-5 py-3 font-bold rounded-lg transition duration-200" style="background: linear-gradient(to bottom, #059669 0%, #047857 100%); color: white; border: 2px solid #065f46; box-shadow: 0 4px 6px rgba(0,0,0,0.3); text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">Exchange</button>
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