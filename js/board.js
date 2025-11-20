// Board Management
import { BOARD_LAYOUT, BOARD_SIZE, SQUARE_TYPES, MULTIPLIERS } from './constants.js';

export class BoardManager {
    constructor() {
        this.gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
        this.placedTiles = [];
    }

    createBoard() {
        const boardElement = document.getElementById('scrabble-board');
        if (!boardElement) return;

        boardElement.innerHTML = '';

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const square = document.createElement('div');
                square.className = `board-square sq-${BOARD_LAYOUT[row][col] || 'normal'}`;
                square.dataset.r = row;
                square.dataset.c = col;
                
                // Add special square text
                const squareType = BOARD_LAYOUT[row][col];
                if (squareType && squareType !== SQUARE_TYPES.START) {
                    square.textContent = this.getSquareText(squareType);
                }

                // Add drop handlers
                this.setupSquareDropHandlers(square);
                
                boardElement.appendChild(square);
            }
        }
        
        console.log('✅ Board created successfully');
    }

    getSquareText(squareType) {
        switch(squareType) {
            case SQUARE_TYPES.TRIPLE_WORD: return 'TW';
            case SQUARE_TYPES.DOUBLE_WORD: return 'DW';
            case SQUARE_TYPES.TRIPLE_LETTER: return 'TL';
            case SQUARE_TYPES.DOUBLE_LETTER: return 'DL';
            default: return '';
        }
    }

    getSquareType(row, col) {
        return BOARD_LAYOUT[row][col];
    }

    setupSquareDropHandlers(square) {
        square.addEventListener('dragover', this.handleDragOver.bind(this));
        square.addEventListener('drop', this.handleDrop.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e) {
        e.preventDefault();
        
        // Check if board interactions are disabled
        if (e.target.style.pointerEvents === 'none') {
            console.warn('Board interactions are disabled');
            return;
        }
        
        const tileData = e.dataTransfer.getData('text/plain');
        if (!tileData) return;
        
        const tile = JSON.parse(tileData);
        const row = parseInt(e.target.dataset.r);
        const col = parseInt(e.target.dataset.c);
        
        // Check if the target square is already occupied
        if (this.gameBoard[row][col] !== null || e.target.querySelector('.tile')) {
            console.warn(`Cannot place tile: square [${row}, ${col}] is already occupied`);
            // Visual feedback for user
            e.target.style.backgroundColor = '#ef4444';
            setTimeout(() => {
                e.target.style.backgroundColor = '';
            }, 200);
            return;
        }
        
        // If tile is being moved from another board position, clear the old position first
        if (tile.fromBoard && tile.isCurrentTurn) {
            const sourceSquare = document.querySelector(`[data-r="${tile.row}"][data-c="${tile.col}"]`);
            if (sourceSquare) {
                const sourceTileElement = sourceSquare.querySelector('.tile');
                if (sourceTileElement) {
                    sourceTileElement.remove();
                    // Clear the board state at old position
                    this.gameBoard[tile.row][tile.col] = null;
                    // Remove from placed tiles array
                    const tileIndex = this.placedTiles.findIndex(t => 
                        t.row === parseInt(tile.row) && t.col === parseInt(tile.col)
                    );
                    if (tileIndex !== -1) {
                        this.placedTiles.splice(tileIndex, 1);
                    }
                    // Restore the multiplier label on the source square
                    const squareType = BOARD_LAYOUT[tile.row][tile.col];
                    if (squareType && squareType !== SQUARE_TYPES.START) {
                        sourceSquare.textContent = this.getSquareText(squareType);
                    }
                }
            }
        }
        
        this.placeTile(tile, row, col, e.target);
    }

    placeTile(tile, row, col, targetSquare) {
        // Check if square is already occupied (including visual check for tile elements)
        if (this.gameBoard[row][col] !== null || targetSquare.querySelector('.tile')) {
            console.warn(`Square [${row}, ${col}] is already occupied`);
            return false;
        }

        // Clear target square content (using innerHTML to properly clear child elements)
        targetSquare.innerHTML = '';
        
        // For blank tiles, determine the display letter and actual letter
        const displayLetter = tile.isBlank && tile.designatedLetter ? tile.designatedLetter : tile.letter;
        const actualLetter = tile.isBlank ? 'BLANK' : tile.letter;
        
        // Create tile element for the board (draggable for current turn)
        const tileElement = this.createBoardTileElement(displayLetter, tile.points, true, tile.isBlank, tile.designatedLetter);
        targetSquare.appendChild(tileElement);
        
        // Update game board state
        this.gameBoard[row][col] = {
            letter: actualLetter,
            displayLetter: displayLetter,
            points: tile.points,
            isBlank: tile.isBlank || false,
            designatedLetter: tile.designatedLetter
        };
        
        // Track placed tile
        this.placedTiles.push({
            row,
            col,
            letter: actualLetter,
            displayLetter: displayLetter,
            points: tile.points,
            isBlank: tile.isBlank || false,
            designatedLetter: tile.designatedLetter
        });
        
        console.log(`✅ Placed ${displayLetter} (${actualLetter}) at [${row}, ${col}]`);
        
        // Dispatch event for other modules
        this.dispatchTilePlacedEvent(tile, row, col);
        
        return true;
    }

    createBoardTileElement(letter, points, isCurrentTurn = true, isBlank = false, designatedLetter = null) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.textContent = letter === 'BLANK' ? '' : letter;
        tile.dataset.letter = isBlank ? 'BLANK' : letter;
        tile.dataset.points = points;
        
        // Handle blank tile designation
        if (isBlank) {
            tile.dataset.isBlank = 'true';
            if (designatedLetter) {
                tile.dataset.designatedLetter = designatedLetter;
                tile.textContent = designatedLetter;
                tile.classList.add('blank-tile-designated');
            }
        }
        
        // Make tiles placed in current turn draggable for repositioning
        if (isCurrentTurn) {
            tile.draggable = true;
            tile.classList.add('current-turn-tile');
            tile.style.cursor = 'grab';
            
            // Add drag event listeners for board tiles
            tile.addEventListener('dragstart', (e) => {
                // Check if tile interactions are disabled
                if (tile.classList.contains('disabled-tile')) {
                    e.preventDefault();
                    return false;
                }
                
                // Find the board square containing this tile
                const boardSquare = tile.closest('.board-square');
                const row = boardSquare?.dataset.r;
                const col = boardSquare?.dataset.c;
                
                const tileData = {
                    letter: tile.dataset.letter,
                    points: points,
                    isBlank: isBlank,
                    designatedLetter: designatedLetter,
                    fromBoard: true,
                    row: row,
                    col: col,
                    isCurrentTurn: true
                };
                
                e.dataTransfer.setData('text/plain', JSON.stringify(tileData));
                tile.classList.add('dragging');
                console.log(`Dragging board tile ${letter} from [${row}, ${col}]`);
            });
            
            tile.addEventListener('dragend', (e) => {
                tile.classList.remove('dragging');
            });
        }
        
        // Add points display (blank tiles always show 0)
        if (letter !== 'BLANK') {
            const pointsSpan = document.createElement('span');
            pointsSpan.className = 'points';
            pointsSpan.textContent = isBlank ? '0' : points;
            tile.appendChild(pointsSpan);
        }
        
        return tile;
    }

    dispatchTilePlacedEvent(tile, row, col) {
        const event = new CustomEvent('tilePlaced', {
            detail: { tile, row, col }
        });
        document.dispatchEvent(event);
    }

    syncBoardState(boardData) {
        console.log('🔄 Syncing board state from server', boardData);
        
        if (!boardData || !Array.isArray(boardData)) return;

        // Clear current board
        this.clearBoard();
        
        // Update board state
        this.gameBoard = boardData.map(row => [...row]);
        
        // Update visual board
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const square = document.querySelector(`[data-r="${row}"][data-c="${col}"]`);
                const tileData = boardData[row][col];
                
                if (square && tileData) {
                    // Clear square
                    square.innerHTML = '';
                    
                    // Add tile (permanent - from server)
                    const tileElement = this.createBoardTileElement(
                        tileData.letter,
                        tileData.points,
                        false  // Not current turn - make permanent
                    );
                    tileElement.classList.add('permanent-tile');
                    square.appendChild(tileElement);
                } else if (square && !tileData) {
                    // Empty square - restore original content
                    square.innerHTML = '';
                    const squareType = BOARD_LAYOUT[row][col];
                    if (squareType && squareType !== SQUARE_TYPES.START) {
                        square.textContent = this.getSquareText(squareType);
                    }
                }
            }
        }
        
        console.log('✅ Board state synchronized');
    }

    clearBoard() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const square = document.querySelector(`[data-r="${row}"][data-c="${col}"]`);
                if (square) {
                    square.innerHTML = '';
                    const squareType = BOARD_LAYOUT[row][col];
                    if (squareType && squareType !== SQUARE_TYPES.START) {
                        square.textContent = this.getSquareText(squareType);
                    }
                }
            }
        }
        this.gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    }

    recallTiles() {
        // Remove placed tiles and return them to rack
        const recalledTiles = [...this.placedTiles];
        
        this.placedTiles.forEach(tile => {
            const square = document.querySelector(`[data-r="${tile.row}"][data-c="${tile.col}"]`);
            if (square) {
                square.innerHTML = '';
                const squareType = BOARD_LAYOUT[tile.row][tile.col];
                if (squareType && squareType !== SQUARE_TYPES.START) {
                    square.textContent = this.getSquareText(squareType);
                }
            }
            
            // Clear from game board
            this.gameBoard[tile.row][tile.col] = null;
        });
        
        // Clear placed tiles array
        this.placedTiles = [];
        
        console.log(`✅ Recalled ${recalledTiles.length} tiles`);
        return recalledTiles;
    }

    getPlacedTiles() {
        return [...this.placedTiles];
    }

    clearPlacedTiles() {
        this.placedTiles = [];
    }

    removePlacedTile(row, col) {
        const tileIndex = this.placedTiles.findIndex(t => 
            t.row === row && t.col === col
        );
        if (tileIndex !== -1) {
            this.placedTiles.splice(tileIndex, 1);
            console.log(`🗑️ Removed tile from placedTiles array at [${row}, ${col}]`);
            return true;
        }
        return false;
    }

    makeCurrentTurnTilesPermanent() {
        // Find all tiles placed in current turn and make them permanent
        const currentTurnTiles = document.querySelectorAll('.current-turn-tile');
        currentTurnTiles.forEach(tile => {
            tile.draggable = false;
            tile.style.cursor = 'default';
            tile.classList.remove('current-turn-tile');
            tile.classList.add('permanent-tile');
            
            // Remove drag event listeners by cloning the element
            const newTile = tile.cloneNode(true);
            tile.parentNode.replaceChild(newTile, tile);
        });
        
        console.log(`Made ${currentTurnTiles.length} tiles permanent`);
    }

    getGameBoard() {
        return this.gameBoard;
    }

    isSquareEmpty(row, col) {
        return this.gameBoard[row][col] === null;
    }

    getTileAt(row, col) {
        return this.gameBoard[row][col];
    }

    getSquareMultiplier(row, col) {
        const squareType = BOARD_LAYOUT[row][col] || SQUARE_TYPES.NORMAL;
        return MULTIPLIERS[squareType] || MULTIPLIERS[SQUARE_TYPES.NORMAL];
    }
}