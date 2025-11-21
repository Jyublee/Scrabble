// Player Management
import { RACK_SIZE, TILE_BAG } from './constants.js';

export class NetworkPlayer {
    constructor(id, name, socketId, isLocal = false) {
        this.id = id;
        this.name = name;
        this.socketId = socketId;
        this.isLocal = isLocal;
        this.score = 0;
        this.rack = [];
        this.isActive = false;
        this.consecutivePasses = 0;
    }

    addToScore(points) {
        if (typeof points !== 'number' || points < 0) {
            console.error('Invalid points to add:', points);
            return;
        }
        
        this.score += points;
        this.updateScoreDisplay();
        console.log(`${this.name} scored ${points} points. Total: ${this.score}`);
    }

    subtractFromScore(points) {
        if (typeof points !== 'number' || points < 0) {
            console.error('Invalid points to subtract:', points);
            return;
        }
        
        this.score = Math.max(0, this.score - points);
        this.updateScoreDisplay();
        console.log(`${this.name} lost ${points} points. Total: ${this.score}`);
    }

    addTileToRack(tile) {
        // Allow adding tiles even if rack is full (for recalling tiles from board)
        this.rack.push(tile);
        this.updateRackDisplay();
    }

    removeTileFromRack(letterOrTile, tileProperties = null) {
        console.log('🎯 Attempting to remove tile from rack:', letterOrTile);
        console.log('📦 Current rack before removal:', JSON.stringify(this.rack));
        
        // If passed a full tile object with properties, try to match precisely
        if (typeof letterOrTile === 'object' && letterOrTile !== null) {
            const tileToRemove = letterOrTile;
            const index = this.rack.findIndex(tile => {
                const tileLetter = typeof tile === 'string' ? tile : tile.letter;
                const tileIsBlank = typeof tile === 'object' ? (tile.isBlank || false) : false;
                const tileDesignated = typeof tile === 'object' ? tile.designatedLetter : null;
                
                // Match letter
                if (tileLetter !== tileToRemove.letter) return false;
                
                // If blank tile, also match designated letter
                if (tileToRemove.isBlank && tileIsBlank) {
                    return tileDesignated === tileToRemove.designatedLetter;
                }
                
                // For non-blank tiles, letter match is enough if not blank
                return !tileToRemove.isBlank && !tileIsBlank;
            });
            
            if (index !== -1) {
                const removed = this.rack.splice(index, 1)[0];
                console.log('✅ Removed tile at index', index, ':', removed);
                console.log('📦 Rack after removal:', JSON.stringify(this.rack));
                this.updateRackDisplay();
                return true;
            } else {
                console.warn('⚠️ Could not find exact tile match in rack');
            }
        }
        
        // Fallback to simple letter matching (for backward compatibility)
        const letterToFind = typeof letterOrTile === 'string' ? letterOrTile : letterOrTile.letter;
        const index = this.rack.findIndex(tile => {
            const tileLetter = typeof tile === 'string' ? tile : tile.letter;
            return tileLetter === letterToFind;
        });
        
        if (index !== -1) {
            const removed = this.rack.splice(index, 1)[0];
            console.log('✅ Removed tile at index', index, '(fallback):', removed);
            console.log('📦 Rack after removal:', JSON.stringify(this.rack));
            this.updateRackDisplay();
            return true;
        }
        
        console.error('❌ Failed to remove tile from rack - not found');
        console.log('📦 Final rack state:', JSON.stringify(this.rack));
        return false;
    }

    fillRackFromBag(tileBag) {
        // Fill rack up to 7 tiles
        while (this.rack.length < RACK_SIZE && tileBag.length > 0) {
            const randomIndex = Math.floor(Math.random() * tileBag.length);
            const tile = tileBag.splice(randomIndex, 1)[0];
            this.rack.push(tile);
        }
        
        console.log(`${this.name} drew tiles:`, this.rack.slice(-1));
        this.updateRackDisplay();
    }

    updateScoreDisplay() {
        const scoreElement = document.getElementById(`${this.id}-score`);
        console.log(`Updating score display for ${this.name} (${this.id}): ${this.score} points`);
        console.log(`Looking for element: ${this.id}-score`, scoreElement);
        
        if (scoreElement) {
            const nameSpan = scoreElement.querySelector('span:first-child');
            const scoreSpan = scoreElement.querySelector('span:last-child');
            if (nameSpan) nameSpan.textContent = this.name + (this.isLocal ? ' (You)' : '');
            if (scoreSpan) scoreSpan.textContent = this.score;
            
            console.log(`Updated display: Name="${nameSpan?.textContent}", Score="${scoreSpan?.textContent}"`);
        } else {
            console.error(`Score element not found: ${this.id}-score`);
        }
    }

    updateRackDisplay() {
        if (!this.isLocal) return;
        
        const rackElement = document.getElementById('player-rack');
        if (!rackElement) return;
        
        rackElement.innerHTML = '';
        this.rack.forEach((tile, index) => {
            // Handle both string format (legacy) and object format (from server)
            const letter = typeof tile === 'string' ? tile : tile.letter;
            const points = typeof tile === 'string' ? (TILE_BAG[tile]?.points || 0) : tile.points;
            const isBlank = typeof tile === 'object' ? tile.isBlank : false;
            const designatedLetter = typeof tile === 'object' ? tile.designatedLetter : null;
            
            const tileElement = this.createTileElement(letter, points, isBlank, designatedLetter);
            tileElement.dataset.rackIndex = index;
            rackElement.appendChild(tileElement);
        });
    }

    createTileElement(letter, points, isBlank = false, designatedLetter = null) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.draggable = true;
        
        // Handle blank tiles with designated letters
        if (isBlank && designatedLetter) {
            tile.textContent = designatedLetter;
            tile.dataset.isBlank = 'true';
            tile.dataset.designatedLetter = designatedLetter;
            tile.classList.add('blank-tile-designated');
        } else if (letter === 'BLANK') {
            // Unassigned blank tile - make it non-draggable initially
            tile.textContent = '';
            tile.draggable = false;
            tile.style.cursor = 'pointer';
            tile.classList.add('blank-unassigned');
        } else {
            tile.textContent = letter;
        }
        
        tile.dataset.letter = letter;
        tile.dataset.points = points;
        
        // Add drag event listeners
        tile.addEventListener('dragstart', (e) => {
            // Check if tile interactions are disabled
            if (e.target.classList.contains('disabled-tile')) {
                e.preventDefault();
                console.log('🚫 Cannot move tiles - Not your turn!');
                return false;
            }
            
            // Check if this is an unassigned blank tile
            if (letter === 'BLANK' && !e.target.dataset.designatedLetter) {
                e.preventDefault();
                console.log('🚫 Blank tile must be assigned a letter before moving!');
                alert('Please click the blank tile to choose a letter first!');
                return false;
            }
            
            const tileIsBlank = letter === 'BLANK' || e.target.dataset.isBlank === 'true';
            const tileDesignatedLetter = e.target.dataset.designatedLetter;
            
            const tileData = {
                letter: letter,
                points: points,
                isBlank: tileIsBlank,
                designatedLetter: tileDesignatedLetter,
                rackIndex: e.target.dataset.rackIndex,
                fromBoard: false
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(tileData));
            e.target.classList.add('dragging');
        });
        
        tile.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
        
        // Handle blank tiles - dispatch event for UI manager to show letter picker
        if (letter === 'BLANK') {
            tile.addEventListener('click', () => {
                // Dispatch event to show letter picker
                const event = new CustomEvent('showBlankTilePicker', { 
                    detail: { tileElement: tile } 
                });
                document.dispatchEvent(event);
            });
            
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

    setActive(active) {
        this.isActive = active;
        
        // Update visual indicators
        const scoreElement = document.getElementById(`${this.id}-score`);
        if (scoreElement) {
            if (active) {
                scoreElement.classList.remove('bg-gray-100');
                scoreElement.classList.add('bg-green-200', 'border-green-500');
                console.log(`${this.name} is now active (turn started)`);
            } else {
                scoreElement.classList.remove('bg-green-200', 'border-green-500');
                scoreElement.classList.add('bg-gray-100');
                console.log(`${this.name} is now inactive (turn ended)`);
            }
        }
        
        // Update current player display
        const currentPlayerElement = document.getElementById('current-player');
        if (currentPlayerElement && active) {
            currentPlayerElement.textContent = this.name;
        }
    }

    resetConsecutivePasses() {
        this.consecutivePasses = 0;
    }

    incrementConsecutivePasses() {
        this.consecutivePasses++;
    }

    getRackValue() {
        return this.rack.reduce((total, tile) => {
            // Handle both string format and object format
            if (typeof tile === 'string') {
                return total + (TILE_BAG[tile]?.points || 0);
            } else {
                return total + (tile.points || 0);
            }
        }, 0);
    }
}