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
        if (this.rack.length < RACK_SIZE) {
            this.rack.push(tile);
            this.updateRackDisplay();
        }
    }

    removeTileFromRack(letter) {
        const index = this.rack.findIndex(tile => {
            // Handle both string format and object format
            const tileLetter = typeof tile === 'string' ? tile : tile.letter;
            return tileLetter === letter;
        });
        if (index !== -1) {
            this.rack.splice(index, 1);
            this.updateRackDisplay();
        }
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
            
            const tileElement = this.createTileElement(letter, points);
            tileElement.dataset.rackIndex = index;
            rackElement.appendChild(tileElement);
        });
    }

    createTileElement(letter, points) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.draggable = true;
        tile.textContent = letter === 'BLANK' ? '' : letter;
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
            
            const isBlank = letter === 'BLANK' || e.target.dataset.isBlank === 'true';
            const designatedLetter = e.target.dataset.designatedLetter;
            
            const tileData = {
                letter: letter,
                points: points,
                isBlank: isBlank,
                designatedLetter: designatedLetter,
                rackIndex: e.target.dataset.rackIndex,
                fromBoard: false
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(tileData));
            e.target.classList.add('dragging');
        });
        
        tile.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
        
        // Handle blank tiles
        if (letter === 'BLANK') {
            tile.addEventListener('click', () => {
                const newLetter = prompt('What letter should this blank tile represent? (A-Z)');
                if (newLetter && /^[A-Z]$/i.test(newLetter)) {
                    const upperLetter = newLetter.toUpperCase();
                    tile.textContent = upperLetter;
                    // Keep original letter as BLANK but store designated letter
                    tile.dataset.designatedLetter = upperLetter;
                    tile.dataset.isBlank = 'true';
                    tile.classList.add('blank-tile-designated');
                    
                    // Ensure blank tiles always show 0 points
                    let pointsSpan = tile.querySelector('.points');
                    if (!pointsSpan) {
                        pointsSpan = document.createElement('span');
                        pointsSpan.className = 'points';
                        tile.appendChild(pointsSpan);
                    }
                    pointsSpan.textContent = '0';
                }
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