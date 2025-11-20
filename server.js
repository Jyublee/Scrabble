const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Game state
let gameState = {
    players: [],
    currentPlayer: 0,
    board: Array(15).fill().map(() => Array(15).fill(null)),
    tileBag: [],
    gameStarted: false,
    gameEnded: false,
    consecutivePasses: 0,
    isFirstWordOfGame: true,
    turnTimer: 0, // Timer duration in seconds (0 = no timer)
    currentTurnStartTime: null,
    timerInterval: null
};

// Tile bag initialization
function createTileBag() {
    const tileBag = {
        'A': { points: 1, count: 9 }, 'B': { points: 3, count: 2 }, 'C': { points: 3, count: 2 },
        'D': { points: 2, count: 4 }, 'E': { points: 1, count: 12 }, 'F': { points: 4, count: 2 },
        'G': { points: 2, count: 3 }, 'H': { points: 4, count: 2 }, 'I': { points: 1, count: 9 },
        'J': { points: 8, count: 1 }, 'K': { points: 5, count: 1 }, 'L': { points: 1, count: 4 },
        'M': { points: 3, count: 2 }, 'N': { points: 1, count: 6 }, 'O': { points: 1, count: 8 },
        'P': { points: 3, count: 2 }, 'Q': { points: 10, count: 1 }, 'R': { points: 1, count: 6 },
        'S': { points: 1, count: 4 }, 'T': { points: 1, count: 6 }, 'U': { points: 1, count: 4 },
        'V': { points: 4, count: 2 }, 'W': { points: 4, count: 2 }, 'X': { points: 8, count: 1 },
        'Y': { points: 4, count: 2 }, 'Z': { points: 10, count: 1 }, 'BLANK': { points: 0, count: 2 }
    };
    
    const fullTileBag = [];
    for (const [letter, data] of Object.entries(tileBag)) {
        for (let i = 0; i < data.count; i++) {
            fullTileBag.push({ letter, points: data.points });
        }
    }
    
    // Shuffle the bag
    for (let i = fullTileBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fullTileBag[i], fullTileBag[j]] = [fullTileBag[j], fullTileBag[i]];
    }
    
    return fullTileBag;
}

function drawTilesForPlayer(count = 7) {
    const drawnTiles = [];
    for (let i = 0; i < count && gameState.tileBag.length > 0; i++) {
        drawnTiles.push(gameState.tileBag.pop());
    }
    return drawnTiles;
}

function getCleanGameState() {
    // Return game state without any potentially circular references
    return {
        players: gameState.players.map(player => ({
            id: player.id,
            name: player.name,
            score: player.score,
            rack: player.rack
        })),
        currentPlayer: gameState.currentPlayer,
        board: gameState.board,
        gameStarted: gameState.gameStarted,
        gameEnded: gameState.gameEnded,
        consecutivePasses: gameState.consecutivePasses,
        isFirstWordOfGame: gameState.isFirstWordOfGame,
        turnTimer: gameState.turnTimer
    };
}

function getTileBagBreakdown() {
    const breakdown = {};
    
    // Initialize all letters with count 0
    const allLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'BLANK'];
    allLetters.forEach(letter => {
        breakdown[letter] = 0;
    });
    
    // Count remaining tiles in bag
    gameState.tileBag.forEach(tile => {
        breakdown[tile.letter] = (breakdown[tile.letter] || 0) + 1;
    });
    
    return breakdown;
}

function startTurnTimer() {
    if (gameState.turnTimer <= 0) return;
    
    console.log(`⏰ Starting ${gameState.turnTimer}s timer for player ${gameState.currentPlayer}`);
    gameState.currentTurnStartTime = Date.now();
    
    // Clear any existing timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    // Start new timer with 1-second updates
    gameState.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameState.currentTurnStartTime) / 1000);
        const remaining = Math.max(0, gameState.turnTimer - elapsed);
        
        // Broadcast timer update (without the interval object to avoid circular reference)
        io.emit('timer-update', {
            timeRemaining: remaining,
            maxTime: gameState.turnTimer,
            currentPlayer: gameState.currentPlayer
        });
        
        // Check if time is up
        if (remaining <= 0) {
            handleTimerExpired();
        }
    }, 1000);
}

function stopTurnTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    gameState.currentTurnStartTime = null;
}

function handleTimerExpired() {
    console.log(`⏱️ Timer expired for player ${gameState.currentPlayer}`);
    
    stopTurnTimer();
    
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer) {
        // Notify all players that time expired
        io.emit('timer-expired', {
            playerName: currentPlayer.name,
            playerId: currentPlayer.id
        });
        
        // Force turn change (this will handle tile cleanup on client side)
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
        gameState.consecutivePasses++;
        
        io.emit('turn-changed', {
            gameState: getCleanGameState(),
            tileBagBreakdown: getTileBagBreakdown(),
            message: `${currentPlayer.name}'s time expired. Turn skipped.`
        });
        
        // Start timer for next player
        startTurnTimer();
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`New player connected: ${socket.id}`);

    // Handle player joining
    socket.on('join-game', (playerName) => {
        if (gameState.players.length < 4 && !gameState.gameStarted) {
            // Ensure player name is valid
            const validPlayerName = (playerName && typeof playerName === 'string' && playerName.trim()) 
                ? playerName.trim() 
                : `Player ${gameState.players.length + 1}`;
                
            const player = {
                id: socket.id,
                name: validPlayerName,
                score: 0,
                rack: []
            };
            gameState.players.push(player);
            
            socket.emit('joined-game', { 
                playerId: socket.id, 
                playerIndex: gameState.players.length - 1,
                gameState: getCleanGameState()
            });
            
            // Broadcast to all players
            io.emit('player-joined', {
                player: player,
                totalPlayers: gameState.players.length,
                players: gameState.players
            });
            
            console.log(`${player.name} joined the game. Total players: ${gameState.players.length}`);
        } else if (gameState.gameStarted) {
            socket.emit('game-full', 'Game already started. Cannot join.');
        } else {
            socket.emit('game-full', 'Game is full. Maximum 4 players allowed.');
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const playerName = gameState.players[playerIndex].name;
            
            if (!gameState.gameStarted) {
                // Remove player from lobby
                gameState.players.splice(playerIndex, 1);
                
                io.emit('player-left', {
                    playerName: playerName,
                    totalPlayers: gameState.players.length,
                    players: gameState.players
                });
            } else {
                // Handle mid-game disconnection
                io.emit('player-disconnected', {
                    playerName: playerName,
                    playerId: socket.id
                });
            }
            
            console.log(`${playerName} left the game. Total players: ${gameState.players.length}`);
        }
    });

    // Handle game start
    socket.on('start-game', (data) => {
        const timerSetting = data?.turnTimer || 0;
        
        if (gameState.players.length >= 2 && !gameState.gameStarted && gameState.players[0].id === socket.id) {
            gameState.gameStarted = true;
            gameState.currentPlayer = 0;
            gameState.turnTimer = timerSetting;
            gameState.tileBag = createTileBag();
            
            console.log(`🎮 Starting game with ${gameState.players.length} players, timer: ${gameState.turnTimer}s`);
            
            // Give each player their starting tiles
            gameState.players.forEach(player => {
                player.rack = drawTilesForPlayer(7);
            });
            
            // Send game started event to all players
            io.emit('game-started', {
                gameState: getCleanGameState(),
                tileBagBreakdown: getTileBagBreakdown(),
                message: `Game started! ${gameState.players[0].name}'s turn. ${gameState.turnTimer > 0 ? `Timer: ${Math.floor(gameState.turnTimer/60)}:${(gameState.turnTimer%60).toString().padStart(2,'0')}` : 'No time limit'}`
            });
            
            // Send individual rack updates to each player
            gameState.players.forEach(player => {
                io.to(player.id).emit('rack-updated', {
                    playerId: player.id,
                    newRack: player.rack
                });
            });
            
            console.log('Game started with', gameState.players.length, 'players');
            
            // Start timer for first player if enabled
            if (gameState.turnTimer > 0) {
                startTurnTimer();
            }
        }
    });

    // Handle turn changes
    socket.on('turn-change', (data) => {
        if (gameState.players[gameState.currentPlayer]?.id === socket.id) {
            gameState.currentPlayer = data.currentPlayer;
            
            io.emit('turn-changed', {
                currentPlayer: gameState.currentPlayer,
                playerName: gameState.players[gameState.currentPlayer].name,
                gameState: getCleanGameState(),
                tileBagBreakdown: getTileBagBreakdown()
            });
        }
    });

    // Handle word play
    socket.on('word-played', (data) => {
        if (gameState.players[gameState.currentPlayer]?.id === socket.id) {
            // Update player score
            const player = gameState.players.find(p => p.id === data.playerId);
            if (player) {
                player.score += data.totalScore;
                
                // Update board
                data.boardUpdates.forEach(update => {
                    gameState.board[update.row][update.col] = {
                        letter: update.letter,
                        points: update.points,
                        isBlank: update.isBlank || false,
                        designatedLetter: update.designatedLetter || null,
                        displayLetter: update.displayLetter || update.letter
                    };
                });
                
                // Remove played tiles from player's rack
                data.rackUpdates.forEach(tileUpdate => {
                    const rackIndex = player.rack.findIndex(tile => tile.letter === tileUpdate.letter);
                    if (rackIndex !== -1) {
                        player.rack.splice(rackIndex, 1);
                    }
                });
                
                // Draw new tiles
                const newTiles = drawTilesForPlayer(data.rackUpdates.length);
                player.rack.push(...newTiles);
                
                // Send updated rack to player
                socket.emit('rack-updated', {
                    playerId: player.id,
                    newRack: player.rack
                });
                
                // Reset consecutive passes
                gameState.consecutivePasses = 0;
                
                // Mark that the first word of the game has been played
                if (gameState.isFirstWordOfGame) {
                    gameState.isFirstWordOfGame = false;
                }
                
                // Broadcast word play to all players
                io.emit('word-played', {
                    playerName: player.name,
                    words: data.words,
                    totalScore: data.totalScore,
                    success: true,
                    gameState: getCleanGameState(),
                    tileBagBreakdown: getTileBagBreakdown()
                });
                
                // Move to next turn
                gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
                
                console.log(`Turn changed: Player ${gameState.currentPlayer} (${gameState.players[gameState.currentPlayer].name})`);
                
                // Stop current timer and start new one
                stopTurnTimer();
                
                io.emit('turn-changed', {
                    currentPlayer: gameState.currentPlayer,
                    playerName: gameState.players[gameState.currentPlayer].name,
                    gameState: getCleanGameState(),
                    tileBagBreakdown: getTileBagBreakdown()
                });
                
                // Start timer for next player
                if (gameState.turnTimer > 0) {
                    startTurnTimer();
                }
            }
        }
    });

    // Handle player pass
    socket.on('player-passed', (data) => {
        if (gameState.players[gameState.currentPlayer]?.id === socket.id) {
            gameState.consecutivePasses++;
            
            const player = gameState.players.find(p => p.id === data.playerId);
            if (player) {
                io.emit('player-passed', {
                    playerName: player.name,
                    consecutivePasses: gameState.consecutivePasses
                });
                
                // Move to next turn
                gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
                
                // Stop current timer and start new one
                stopTurnTimer();
                
                io.emit('turn-changed', {
                    currentPlayer: gameState.currentPlayer,
                    playerName: gameState.players[gameState.currentPlayer].name,
                    gameState: getCleanGameState(),
                    tileBagBreakdown: getTileBagBreakdown()
                });
                
                // Start timer for next player
                if (gameState.turnTimer > 0) {
                    startTurnTimer();
                }
            }
        }
    });

    // Handle tile exchanges
    socket.on('tiles-exchanged', (data) => {
        if (gameState.players[gameState.currentPlayer]?.id === socket.id) {
            const player = gameState.players.find(p => p.id === data.playerId);
            if (player && data.exchangedTiles && data.exchangedTiles.length > 0) {
                
                // Remove exchanged tiles from player's rack first
                if (data.selectedIndices) {
                    // Remove tiles by index (sort in descending order to avoid index issues)
                    data.selectedIndices.sort((a, b) => b - a);
                    data.selectedIndices.forEach(index => {
                        if (index < player.rack.length) {
                            player.rack.splice(index, 1);
                        }
                    });
                } else {
                    // Fallback: remove tiles by matching them
                    data.exchangedTiles.forEach(exchangeTile => {
                        const rackIndex = player.rack.findIndex(tile => 
                            (typeof tile === 'string' ? tile : tile.letter) === 
                            (typeof exchangeTile === 'string' ? exchangeTile : exchangeTile.letter)
                        );
                        if (rackIndex !== -1) {
                            player.rack.splice(rackIndex, 1);
                        }
                    });
                }
                
                // Add exchanged tiles back to the tile bag
                data.exchangedTiles.forEach(tile => {
                    gameState.tileBag.push(tile);
                });
                
                // Shuffle the tile bag
                for (let i = gameState.tileBag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [gameState.tileBag[i], gameState.tileBag[j]] = [gameState.tileBag[j], gameState.tileBag[i]];
                }
                
                // Draw new tiles for the player
                const newTiles = drawTilesForPlayer(data.exchangedTiles.length);
                player.rack.push(...newTiles);
                
                // Broadcast the exchange action
                io.emit('tiles-exchanged', {
                    playerName: player.name,
                    exchangedCount: data.exchangedTiles.length,
                    playerId: data.playerId
                });
                
                // Send updated rack to the exchanging player
                socket.emit('rack-updated', {
                    playerId: data.playerId,
                    newRack: player.rack
                });
                
                console.log(`${player.name} exchanged ${data.exchangedTiles.length} tiles`);
                
                // Pass the turn after exchange
                gameState.consecutivePasses = 0; // Reset consecutive passes since this is an active move
                gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
                
                // Stop current timer and start new one
                stopTurnTimer();
                
                io.emit('turn-changed', {
                    currentPlayer: gameState.currentPlayer,
                    playerName: gameState.players[gameState.currentPlayer].name,
                    gameState: getCleanGameState(),
                    tileBagBreakdown: getTileBagBreakdown()
                });
                
                // Start timer for next player
                if (gameState.turnTimer > 0) {
                    startTurnTimer();
                }
            }
        }
    });

    // Handle tile placement
    socket.on('place-tile', (data) => {
        // Broadcast tile placement to all players
        socket.broadcast.emit('tile-placed', data);
    });

    // Handle word submission
    socket.on('submit-word', (data) => {
        // TODO: Add word validation logic here
        io.emit('word-submitted', data);
    });
});

server.listen(PORT, () => {
    console.log(`Scrabble LAN server running on http://localhost:${PORT}`);
    console.log('Open this URL in multiple browsers to test multiplayer functionality');
});

// Clean up on server shutdown
process.on('SIGINT', () => {
    console.log('Server shutting down...');
    stopTurnTimer();
    process.exit(0);
});