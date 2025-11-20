// Game Logic - Validation, Scoring, Word Finding
import { BOARD_SIZE, CENTER_POSITION, BINGO_BONUS } from './constants.js';
import { dictionaryLoader } from './dictionary-loader.js';

export class GameLogic {
    constructor(boardManager) {
        this.boardManager = boardManager;
    }

    // Word validation using local dictionary
    async validateWord(word) {
        if (!word || word.length < 2) return false;

        // Ensure dictionary is loaded
        if (!dictionaryLoader.isLoaded) {
            await dictionaryLoader.loadDictionary();
        }

        // Check if word exists in dictionary
        const isValid = dictionaryLoader.isValidWord(word);
        
        if (isValid) {
            console.log(`✅ "${word}" is a valid word`);
        } else {
            console.log(`❌ "${word}" is NOT a valid word`);
        }
        
        return isValid;
    }

    // Find all words formed by the current placement
    findWordsFormedByPlacement() {
        const placedTiles = this.boardManager.getPlacedTiles();
        const gameBoard = this.boardManager.getGameBoard();
        
        if (placedTiles.length === 0) return [];
        
        const foundWords = new Set();
        const result = [];
        
        // Check each placed tile for word formation
        placedTiles.forEach(placedTile => {
            // Check horizontal word
            const horizontalWord = this.findWordContaining(placedTile.row, placedTile.col, 'horizontal');
            if (horizontalWord && horizontalWord.length >= 2) {
                const wordKey = `${horizontalWord.word}-${horizontalWord.startRow}-${horizontalWord.startCol}-h`;
                if (!foundWords.has(wordKey)) {
                    foundWords.add(wordKey);
                    result.push(horizontalWord);
                }
            }
            
            // Check vertical word
            const verticalWord = this.findWordContaining(placedTile.row, placedTile.col, 'vertical');
            if (verticalWord && verticalWord.length >= 2) {
                const wordKey = `${verticalWord.word}-${verticalWord.startRow}-${verticalWord.startCol}-v`;
                if (!foundWords.has(wordKey)) {
                    foundWords.add(wordKey);
                    result.push(verticalWord);
                }
            }
        });
        
        console.log(`Found ${result.length} words: ${result.map(w => w.word).join(', ')}`);
        
        return result;
    }

    // Find word containing a specific position
    findWordContaining(row, col, direction) {
        const gameBoard = this.boardManager.getGameBoard();
        
        if (gameBoard[row][col] === null) return null;
        
        let startPos, endPos, word = '';
        
        if (direction === 'horizontal') {
            // Find start of word
            startPos = col;
            while (startPos > 0 && gameBoard[row][startPos - 1] !== null) {
                startPos--;
            }
            
            // Find end of word
            endPos = col;
            while (endPos < BOARD_SIZE - 1 && gameBoard[row][endPos + 1] !== null) {
                endPos++;
            }
            
            // Build word
            for (let c = startPos; c <= endPos; c++) {
                const tile = gameBoard[row][c];
                const letter = tile.isBlank && tile.designatedLetter ? tile.designatedLetter : 
                              (tile.displayLetter || tile.letter);
                word += letter;
            }
            
            return word.length >= 2 ? {
                word: word,
                startRow: row,
                startCol: startPos,
                endRow: row,
                endCol: endPos,
                direction: 'horizontal',
                length: word.length
            } : null;
            
        } else { // vertical
            // Find start of word
            startPos = row;
            while (startPos > 0 && gameBoard[startPos - 1][col] !== null) {
                startPos--;
            }
            
            // Find end of word
            endPos = row;
            while (endPos < BOARD_SIZE - 1 && gameBoard[endPos + 1][col] !== null) {
                endPos++;
            }
            
            // Build word
            for (let r = startPos; r <= endPos; r++) {
                const tile = gameBoard[r][col];
                const letter = tile.isBlank && tile.designatedLetter ? tile.designatedLetter : 
                              (tile.displayLetter || tile.letter);
                word += letter;
            }
            
            return word.length >= 2 ? {
                word: word,
                startRow: startPos,
                startCol: col,
                endRow: endPos,
                endCol: col,
                direction: 'vertical',
                length: word.length
            } : null;
        }
    }

    // Validate tile placement according to Scrabble rules
    validatePlacement(gameRoomState) {
        const placedTiles = this.boardManager.getPlacedTiles();
        const gameBoard = this.boardManager.getGameBoard();
        
        if (placedTiles.length === 0) {
            return { valid: false, message: 'No tiles placed!' };
        }
        
        console.log(`Validating placement of ${placedTiles.length} tiles`);
        
        // Rule 1: First word of the entire game must cover center
        if (gameRoomState.gameStarted && gameRoomState.players && gameRoomState.players.length > 0) {
            const isGameFirstWord = gameRoomState.isFirstWordOfGame;
            console.log(`🐛 Debug - isFirstWordOfGame: ${isGameFirstWord}`, gameRoomState);
            
            if (isGameFirstWord) {
                const coverCenter = placedTiles.some(tile => 
                    tile.row === CENTER_POSITION.row && tile.col === CENTER_POSITION.col
                );
                if (!coverCenter) {
                    return { valid: false, message: 'First word must go through the center star!' };
                }
                
                // First word must be at least 2 letters
                if (placedTiles.length === 1) {
                    return { valid: false, message: 'First word must be at least 2 letters long!' };
                }
            }
        }
        
        // Rule 2: All placed tiles must be in same row OR same column
        if (placedTiles.length > 1) {
            const allSameRow = placedTiles.every(tile => tile.row === placedTiles[0].row);
            const allSameCol = placedTiles.every(tile => tile.col === placedTiles[0].col);
            
            if (!allSameRow && !allSameCol) {
                return { valid: false, message: 'All tiles must be in a straight line!' };
            }
            
            // Rule 3: Check for gaps in placement
            const sortedTiles = allSameRow ? 
                [...placedTiles].sort((a, b) => a.col - b.col) :
                [...placedTiles].sort((a, b) => a.row - b.row);
            
            for (let i = 0; i < sortedTiles.length - 1; i++) {
                const current = sortedTiles[i];
                const next = sortedTiles[i + 1];
                
                if (allSameRow) {
                    // Check for gaps between columns
                    for (let col = current.col + 1; col < next.col; col++) {
                        if (gameBoard[current.row][col] === null) {
                            return { valid: false, message: 'Tiles cannot have gaps between them!' };
                        }
                    }
                } else {
                    // Check for gaps between rows
                    for (let row = current.row + 1; row < next.row; row++) {
                        if (gameBoard[row][current.col] === null) {
                            return { valid: false, message: 'Tiles cannot have gaps between them!' };
                        }
                    }
                }
            }
        }
        
        // Rule 4: New tiles must connect to existing tiles (except first word)
        const isGameFirstWord = gameRoomState.isFirstWordOfGame;
        if (!isGameFirstWord) {
            const connectsToExisting = placedTiles.some(tile => {
                const { row, col } = tile;
                
                // Check adjacent squares for existing tiles
                const adjacent = [
                    [row - 1, col], [row + 1, col],
                    [row, col - 1], [row, col + 1]
                ];
                
                return adjacent.some(([r, c]) => {
                    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && 
                           gameBoard[r][c] !== null && 
                           !placedTiles.some(placed => placed.row === r && placed.col === c);
                });
            });
            
            if (!connectsToExisting) {
                return { valid: false, message: 'New tiles must connect to existing words!' };
            }
        }
        
        return { valid: true };
    }

    // Calculate score for a word
    calculateScore(wordData) {
        const gameBoard = this.boardManager.getGameBoard();
        const placedTiles = this.boardManager.getPlacedTiles();
        
        let wordScore = 0;
        let wordMultiplier = 1;
        
        // Calculate score for each letter in the word
        if (wordData.direction === 'horizontal') {
            for (let col = wordData.startCol; col <= wordData.endCol; col++) {
                const tile = gameBoard[wordData.startRow][col];
                if (!tile) continue;
                
                let letterScore = tile.points;
                
                // Apply letter multipliers only for newly placed tiles
                const isNewTile = placedTiles.some(placed => 
                    placed.row === wordData.startRow && placed.col === col
                );
                
                if (isNewTile) {
                    const multiplier = this.boardManager.getSquareMultiplier(wordData.startRow, col);
                    letterScore *= multiplier.letter;
                    wordMultiplier *= multiplier.word;
                }
                
                wordScore += letterScore;
            }
        } else { // vertical
            for (let row = wordData.startRow; row <= wordData.endRow; row++) {
                const tile = gameBoard[row][wordData.startCol];
                if (!tile) continue;
                
                let letterScore = tile.points;
                
                // Apply letter multipliers only for newly placed tiles
                const isNewTile = placedTiles.some(placed => 
                    placed.row === row && placed.col === wordData.startCol
                );
                
                if (isNewTile) {
                    const multiplier = this.boardManager.getSquareMultiplier(row, wordData.startCol);
                    letterScore *= multiplier.letter;
                    wordMultiplier *= multiplier.word;
                }
                
                wordScore += letterScore;
            }
        }
        
        // Apply word multiplier
        wordScore *= wordMultiplier;
        
        return wordScore;
    }

    // Calculate total score for all words formed
    async calculateTotalScore() {
        const words = this.findWordsFormedByPlacement();
        const placedTiles = this.boardManager.getPlacedTiles();
        
        if (words.length === 0) {
            return { valid: false, totalScore: 0, words: [] };
        }
        
        let totalScore = 0;
        const validatedWords = [];
        
        // Validate and score each word
        for (const wordData of words) {
            const isValid = await this.validateWord(wordData.word);
            if (!isValid) {
                return {
                    valid: false,
                    totalScore: 0,
                    words: [],
                    invalidWord: wordData.word
                };
            }
            
            const score = this.calculateScore(wordData);
            totalScore += score;
            
            validatedWords.push({
                ...wordData,
                score: score,
                definition: `Valid word: ${wordData.word.toUpperCase()}`
            });
        }
        
        // Bonus for using all 7 tiles (BINGO)
        if (placedTiles.length === 7) {
            totalScore += BINGO_BONUS;
        }
        
        return {
            valid: true,
            totalScore: totalScore,
            words: validatedWords,
            bingo: placedTiles.length === 7
        };
    }
}