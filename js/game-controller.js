// Main Game Controller - Orchestrates all modules
import { NetworkPlayer } from './player.js';
import { NetworkManager } from './network.js';
import { BoardManager } from './board.js';
import { GameLogic } from './game-logic.js';
import { UIManager } from './ui.js';
import { GAME_EVENTS, TILE_BAG } from './constants.js';

export class GameController {
    constructor() {
        // Initialize modules
        this.boardManager = new BoardManager();
        this.networkManager = new NetworkManager();
        this.gameLogic = new GameLogic(this.boardManager);
        this.uiManager = new UIManager(this.boardManager, this.networkManager);
        
        // Game state
        this.players = [];
        this.myPlayerIndex = -1;
        this.currentPlayerIndex = 0;
        this.gameStarted = false;
        this.gameEnded = false;
        
        // Tile bag for local operations
        this.fullTileBag = [];
    }

    initialize() {
        console.log("🎮 Loading Multiplayer Scrabble Game...");
        
        // Initialize all modules
        this.networkManager.initialize();
        this.uiManager.initialize();
        
        // Setup network event listeners
        this.setupNetworkEvents();
        
        // Setup game event listeners
        this.setupGameEvents();
        
        console.log("✅ Game Controller initialized");
    }

    setupNetworkEvents() {
        const socket = this.networkManager.getSocket();
        
        // Game state events
        socket.on(GAME_EVENTS.GAME_STATE_UPDATE, (gameState) => {
            this.updateGameState(gameState);
        });
        
        socket.on(GAME_EVENTS.TILE_PLACED, (data) => {
            this.syncTilePlacement(data);
        });
        
        socket.on(GAME_EVENTS.WORD_PLAYED, (data) => {
            this.syncWordPlay(data);
        });
        
        socket.on(GAME_EVENTS.BOARD_UPDATED, (data) => {
            this.boardManager.syncBoardState(data);
        });
        
        socket.on(GAME_EVENTS.TURN_CHANGED, (data) => {
            this.handleTurnChanged(data);
        });
        
        socket.on(GAME_EVENTS.RACK_UPDATED, (data) => {
            this.handleRackUpdated(data);
        });
        
        socket.on(GAME_EVENTS.TILES_EXCHANGED, (data) => {
            this.handleTileExchangeNotification(data);
        });
        
        socket.on(GAME_EVENTS.GAME_STARTED, (data) => {
            this.startNetworkGame(data.gameState);
        });

        // Custom events from network manager
        document.addEventListener('turnChanged', (event) => {
            const data = event.detail;
            this.updateGameState(data.gameState, data.tileBagBreakdown);
        });

        document.addEventListener('timerUpdate', (event) => {
            // Timer updates are handled by UI manager
        });

        document.addEventListener('timerExpired', (event) => {
            this.handleTimerExpired(event.detail);
        });
    }

    setupGameEvents() {
        // UI events
        document.addEventListener('playWord', () => {
            this.handlePlayWord();
        });
        
        document.addEventListener('passPlayer', () => {
            this.handlePass();
        });
        
        document.addEventListener('swapTiles', () => {
            this.handleExchangeTiles();
        });
        
        document.addEventListener('tilesRecalled', (event) => {
            this.handleTilesRecalled(event.detail.tiles);
        });
        
        document.addEventListener('singleTileRecalled', (event) => {
            this.handleSingleTileRecalled(event.detail);
        });
        
        document.addEventListener('exchangeTiles', (event) => {
            this.performExchange(event.detail.indices);
        });
        
        // Board events
        document.addEventListener('tilePlaced', (event) => {
            this.handleTilePlaced(event.detail);
        });
    }

    // Game Management
    startNetworkGame(gameState) {
        console.log("🚀 Starting network game", gameState);
        console.log("My Player ID:", this.networkManager.getCurrentPlayerId());
        
        // Initialize players from network state
        this.players = [];
        gameState.players.forEach((playerData, index) => {
            const isLocal = playerData.id === this.networkManager.getCurrentPlayerId();
            console.log(`Player ${index + 1}: ${playerData.name} (ID: ${playerData.id}, isLocal: ${isLocal})`);
            
            const player = new NetworkPlayer(
                `player-${index + 1}`,  // Use player index for UI mapping (player-1, player-2, etc.)
                playerData.name,
                playerData.id,  // Socket ID for network communication
                isLocal
            );
            player.score = playerData.score || 0;
            player.rack = playerData.rack || [];
            this.players.push(player);
            
            if (isLocal) {
                this.myPlayerIndex = index;
                console.log(`Set myPlayerIndex to: ${index}`);
            }
        });
        
        this.createTileBag();
        
        // Initialize all player displays
        this.players.forEach(player => {
            player.updateScoreDisplay();
        });
        
        // Update local player's rack display with server data
        const localPlayer = this.players[this.myPlayerIndex];
        if (localPlayer) {
            localPlayer.updateRackDisplay();
        }
        
        // Set initial active player
        this.currentPlayerIndex = gameState.currentPlayer;
        this.players[this.currentPlayerIndex].setActive(true);
        
        this.gameStarted = true;
        this.uiManager.log(`Network game started! ${this.players.length} players connected.`);
        this.updateGameStateDisplay();
    }

    createTileBag() {
        this.fullTileBag = [];
        for (const [letter, data] of Object.entries(TILE_BAG)) {
            for (let i = 0; i < data.count; i++) {
                this.fullTileBag.push(letter);
            }
        }
        
        // Shuffle the bag
        for (let i = this.fullTileBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.fullTileBag[i], this.fullTileBag[j]] = [this.fullTileBag[j], this.fullTileBag[i]];
        }
    }

    // Network event handlers
    updateGameState(gameState, tileBagBreakdown = null) {
        const gameRoomState = this.networkManager.getGameRoomState();
        Object.assign(gameRoomState, gameState);
        
        // Add tileBagBreakdown if provided separately
        if (tileBagBreakdown) {
            gameRoomState.tileBagBreakdown = tileBagBreakdown;
        }
        
        // Update local game state
        if (gameState.currentPlayer !== undefined) {
            // Clear active status for all players
            this.players.forEach(player => {
                if (player) player.setActive(false);
            });
            
            // Set active status for current player
            if (this.players[gameState.currentPlayer]) {
                this.players[gameState.currentPlayer].setActive(true);
            }
            
            this.currentPlayerIndex = gameState.currentPlayer;
        }
        
        // Update scores if provided
        if (gameState.players) {
            gameState.players.forEach((playerData, index) => {
                if (this.players[index]) {
                    this.players[index].score = playerData.score;
                    this.players[index].updateScoreDisplay();
                }
            });
        }
        
        this.updateGameStateDisplay();
    }

    syncWordPlay(data) {
        const { playerName, words, totalScore, success, gameState, tileBagBreakdown } = data;
        
        if (success) {
            this.uiManager.log(`${playerName} played: ${words.map(w => w.word).join(', ')} for ${totalScore} points`);
            
            // If this was my word, make placed tiles permanent
            const localPlayer = this.getLocalPlayer();
            if (localPlayer && localPlayer.name === playerName) {
                this.boardManager.makeCurrentTurnTilesPermanent();
                this.boardManager.clearPlacedTiles(); // Clear the placed tiles array since they're now permanent
            }
            
            // Update game room state from server
            if (gameState) {
                const gameRoomState = this.networkManager.getGameRoomState();
                Object.assign(gameRoomState, gameState);
            }
            
            // Update player scores from server data
            if (gameState && gameState.players) {
                gameState.players.forEach((serverPlayer, index) => {
                    if (this.players[index]) {
                        this.players[index].score = serverPlayer.score;
                        this.players[index].updateScoreDisplay();
                    }
                });
            }
            
            // Sync board state from server
            if (gameState && gameState.board) {
                this.boardManager.syncBoardState(gameState.board);
            }

            // Update letter bag display if breakdown is provided
            if (tileBagBreakdown) {
                this.uiManager.updateLetterBagDisplay(tileBagBreakdown);
            }
        } else {
            this.uiManager.log(`${playerName}'s word was rejected`);
        }
    }

    handleTurnChanged(data) {
        console.log(`🔄 Turn changed event received: Player ${data.currentPlayer} (${data.playerName})`);
        
        // Update game state from server
        if (data.gameState) {
            const gameRoomState = this.networkManager.getGameRoomState();
            Object.assign(gameRoomState, data.gameState);
        }
        
        // Deactivate all players first
        this.players.forEach((player, index) => {
            player.setActive(false);
            console.log(`Player ${index} (${player.name}) deactivated`);
        });
        
        this.currentPlayerIndex = data.currentPlayer;
        
        // Activate current player
        if (this.players[this.currentPlayerIndex]) {
            this.players[this.currentPlayerIndex].setActive(true);
            console.log(`Player ${this.currentPlayerIndex} (${this.players[this.currentPlayerIndex].name}) activated`);
        }
        
        this.updateCurrentPlayerDisplay();
        this.uiManager.updateButtonStates(this.networkManager.getGameRoomState());
        
        // Update letter bag display if breakdown is provided
        if (data.tileBagBreakdown) {
            this.uiManager.updateLetterBagDisplay(data.tileBagBreakdown);
        }
        
        // The timer display will be updated automatically when the next timer update comes
        // No need to hide it manually anymore
        
        this.uiManager.log(`It's now ${data.playerName}'s turn`);
    }

    handleRackUpdated(data) {
        if (data.playerId === this.networkManager.getCurrentPlayerId()) {
            const localPlayer = this.getLocalPlayer();
            if (localPlayer) {
                localPlayer.rack = data.newRack;
                localPlayer.updateRackDisplay();
            }
        }
    }

    syncTilePlacement(data) {
        const { row, col, letter, points } = data;
        
        this.boardManager.gameBoard[row][col] = {
            letter: letter,
            points: points,
            isBlank: data.isBlank || false
        };
        
        // Update visual board
        const square = document.querySelector(`[data-r="${row}"][data-c="${col}"]`);
        if (square) {
            square.innerHTML = '';
            const tileElement = this.boardManager.createBoardTileElement(letter, points);
            square.appendChild(tileElement);
        }
        
        this.uiManager.log(`${data.playerName} placed ${letter} at [${row}, ${col}]`);
    }

    handleTileExchangeNotification(data) {
        // Log the exchange for all players
        this.uiManager.log(`${data.playerName} exchanged ${data.exchangedCount} tiles`);
        
        // If this is the local player, they should have already received a rack update
        // This is just for notification purposes for other players
        console.log(`Player ${data.playerName} exchanged ${data.exchangedCount} tiles`);
    }

    // Game actions
    async handlePlayWord() {
        const gameRoomState = this.networkManager.getGameRoomState();
        
        // Validate placement
        const validation = this.gameLogic.validatePlacement(gameRoomState);
        if (!validation.valid) {
            alert(validation.message);
            return;
        }
        
        // Calculate score
        const scoreResult = await this.gameLogic.calculateTotalScore();
        
        if (!scoreResult.valid) {
            const invalidWord = scoreResult.invalidWord;
            if (invalidWord) {
                alert(`"${invalidWord.toUpperCase()}" is not a valid word!`);
            }
            return;
        }
        
        const { totalScore, words, bingo } = scoreResult;
        const placedTiles = this.boardManager.getPlacedTiles();
        
        if (bingo) {
            this.uiManager.log("🎉 BINGO! +50 bonus points!");
        }
        
        // Check if this was the first word of the game
        if (gameRoomState.isFirstWordOfGame) {
            this.uiManager.log("🌟 First word of the game played!");
        }
        
        this.uiManager.log(`🎯 VALID PLAY! Total Score: ${totalScore}`);
        words.forEach(word => {
            this.uiManager.log(`  "${word.word.toUpperCase()}" (${word.score} pts)`);
        });
        
        // Emit word play to server
        this.networkManager.playWord({
            playerId: this.networkManager.getCurrentPlayerId(),
            words: words,
            totalScore: totalScore,
            placedTiles: placedTiles,
            boardUpdates: placedTiles.map(tile => ({
                row: tile.row,
                col: tile.col,
                letter: tile.letter,
                points: tile.points,
                isBlank: tile.isBlank,
                designatedLetter: tile.designatedLetter,
                displayLetter: tile.displayLetter
            })),
            rackUpdates: placedTiles.map(tile => ({
                letter: tile.isBlank ? 'BLANK' : tile.letter
            })),
            fullBoardState: this.boardManager.getGameBoard()
        });
        
        // Clear placed tiles
        this.boardManager.clearPlacedTiles();
    }

    handlePass() {
        const playerId = this.networkManager.getCurrentPlayerId();
        this.networkManager.passPlayer(playerId);
        this.uiManager.log("You passed your turn");
    }

    handleExchangeTiles() {
        const localPlayer = this.getLocalPlayer();
        if (!localPlayer) return;
        
        // First, recall any tiles that are currently placed on the board
        const placedTiles = this.boardManager.getPlacedTiles();
        if (placedTiles.length > 0) {
            console.log(`🔄 Recalling ${placedTiles.length} tiles from board before swap`);
            
            // Recall all tiles from board back to rack
            const recalledTiles = this.boardManager.recallTiles();
            
            // Add recalled tiles back to player's rack
            recalledTiles.forEach(tile => {
                const tileForRack = {
                    letter: tile.letter,
                    points: tile.points,
                    isBlank: tile.isBlank || false,
                    designatedLetter: tile.designatedLetter
                };
                localPlayer.rack.push(tileForRack);
            });
            
            // Update the rack display
            localPlayer.updateRackDisplay();
            
            this.uiManager.log(`Recalled ${recalledTiles.length} tiles from board for swap`);
        }
        
        // Now show the exchange interface with all tiles in the rack
        this.uiManager.showExchangeInterface(localPlayer.rack);
    }

    performExchange(selectedIndices) {
        if (selectedIndices.length === 0) return;
        
        const localPlayer = this.getLocalPlayer();
        if (!localPlayer) return;
        
        // Get the tiles to exchange without removing them locally yet
        const exchangedTiles = [];
        selectedIndices.forEach(index => {
            if (index < localPlayer.rack.length) {
                const tile = localPlayer.rack[index];
                exchangedTiles.push(tile);
            }
        });

        // Send exchange to server (server will handle removing and adding tiles)
        this.networkManager.exchangeTiles({
            playerId: this.networkManager.getCurrentPlayerId(),
            exchangedTiles: exchangedTiles,
            selectedIndices: selectedIndices, // Send indices so server knows what to remove
            playerName: localPlayer.name
        });
        
        this.uiManager.log(`Exchanged ${exchangedTiles.length} tiles`);
    }

    handleSingleTileRecalled(tileData) {
        console.log('🔄 Handling single tile recall:', tileData);
        
        const localPlayer = this.getLocalPlayer();
        if (!localPlayer) return;
        
        const { row, col, letter, points, isBlank, designatedLetter } = tileData;
        
        // Remove tile from board visual
        const square = document.querySelector(`[data-r="${row}"][data-c="${col}"]`);
        if (square) {
            // Remove the tile element
            const tileElement = square.querySelector('.tile');
            if (tileElement) {
                tileElement.remove();
            }
            
            // Restore multiplier label using boardManager's method
            const squareType = this.boardManager.getSquareType(row, col);
            if (squareType && squareType !== 'st') {
                square.textContent = this.boardManager.getSquareText(squareType);
            }
        }
        
        // Remove from board state
        this.boardManager.gameBoard[row][col] = null;
        
        // Remove from placed tiles array (use the boardManager method to modify the actual array)
        this.boardManager.removePlacedTile(row, col);
        
        // Create proper tile object for the rack
        const tileForRack = {
            letter: letter,
            points: points,
            isBlank: isBlank,
            designatedLetter: designatedLetter
        };
        
        // Add tile back to rack at the end
        localPlayer.rack.push(tileForRack);
        localPlayer.updateRackDisplay();
        
        console.log(`✅ Tile ${letter} recalled from [${row}, ${col}] back to rack`);
    }

    handleTilesRecalled(tiles) {
        const localPlayer = this.getLocalPlayer();
        if (!localPlayer) return;
        
        // Add tiles back to rack
        tiles.forEach(tile => {
            const tileForRack = {
                letter: tile.letter,
                points: tile.points,
                isBlank: tile.isBlank || false,
                designatedLetter: tile.designatedLetter
            };
            localPlayer.rack.push(tileForRack);
        });
        
        localPlayer.updateRackDisplay();
    }

    handleTilePlaced(data) {
        // Remove tile from local player's rack
        const localPlayer = this.getLocalPlayer();
        if (localPlayer) {
            localPlayer.removeTileFromRack(data.tile.letter);
        }
    }

    handleTimerExpired(data) {
        console.log('⏱️ Timer expired, recalling tiles');
        // Recall any tiles that might be on the board
        this.uiManager.recallTiles();
    }

    // Utility methods
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getLocalPlayer() {
        return this.players[this.myPlayerIndex];
    }

    updateGameStateDisplay() {
        const gameRoomState = this.networkManager.getGameRoomState();
        this.uiManager.updateGameUI(gameRoomState, gameRoomState.tileBagBreakdown);
    }

    updateCurrentPlayerDisplay() {
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer) {
            this.uiManager.updateCurrentPlayer(currentPlayer.name);
        }
    }
}