# Scrabble LAN - Multiplayer Implementation

A professional, modular multiplayer Scrabble game implementation with real-time networking.

## 🏗️ Project Structure

```
/Scrabble/
├── index.html              # Main HTML file
├── server.js               # Node.js/Express server with Socket.io
├── package.json            # Dependencies and scripts
├── main-new.js             # New modular entry point
├── main.js                 # Original monolithic file (backup)
├── css/
│   └── style.css          # All styles
├── js/
│   ├── constants.js       # Game constants and configuration
│   ├── player.js          # Player class and management
│   ├── network.js         # Socket.io networking layer
│   ├── board.js           # Board management and tile placement
│   ├── game-logic.js      # Game rules, validation, and scoring
│   ├── ui.js              # User interface management
│   └── game-controller.js # Main game orchestration
└── assets/
    ├── textures/          # Future: Custom board/tile textures
    └── sounds/            # Future: Sound effects
```

## 🎮 Architecture Overview

### Modular Design
The application follows a clean modular architecture with separated concerns:

#### **GameController** (game-controller.js)
- Main orchestrator that manages all other modules
- Handles game lifecycle and state management
- Coordinates between UI, networking, and game logic

#### **NetworkManager** (network.js)
- Manages Socket.io connection and real-time communication
- Handles lobby system and player management
- Abstracts networking layer from game logic

#### **BoardManager** (board.js)
- Manages the game board state and tile placement
- Handles drag & drop functionality
- Synchronizes board state across players

#### **GameLogic** (game-logic.js)
- Implements Scrabble rules and validation
- Word finding algorithms and scoring calculations
- Dictionary API integration for word validation

#### **UIManager** (ui.js)
- Handles all user interface interactions
- Manages drag & drop events and button states
- Controls visual feedback and game displays

#### **NetworkPlayer** (player.js)
- Represents individual players in the game
- Manages player racks, scores, and state
- Handles both local and remote player interactions

## 🚀 Features

### Multiplayer Networking
- Real-time multiplayer for 2-4 players
- Dedicated server architecture with Node.js/Express
- Socket.io for real-time communication
- Automatic game state synchronization

### Complete Scrabble Implementation
- Full 15x15 board with premium squares
- Complete tile bag with proper distribution
- Dictionary API word validation
- Comprehensive scoring including multipliers
- BINGO bonus (50 points for using all 7 tiles)

### Professional Game Features
- Tile exchange functionality
- Pass turn capability
- Tile recall from board to rack
- Turn-based gameplay with visual indicators
- Game log with move history

### User Experience
- Clean, responsive UI with Tailwind CSS
- Drag & drop tile placement
- Visual feedback for game states
- Lobby system with player management
- Real-time score updates

## 🛠️ Technical Implementation

### Server-Side (server.js)
- Express.js web server
- Socket.io real-time communication
- Authoritative game state management
- Player connection handling
- Tile bag management and distribution

### Client-Side Architecture
- ES6 modules for clean code organization
- Event-driven architecture with custom events
- Separation of concerns (UI, logic, networking)
- Reactive state management
- Error handling and offline mode support

### Networking Protocol
- Server maintains authoritative game state
- Client actions are validated server-side
- Real-time synchronization of:
  - Board state
  - Player scores
  - Turn progression
  - Tile placements

## 🎯 Game Rules Implemented

1. **First Word**: Must pass through center star (H8)
2. **Word Formation**: All tiles must form valid words
3. **Connectivity**: New words must connect to existing words
4. **Straight Lines**: Tiles must be placed in rows or columns
5. **No Gaps**: Continuous tile placement required
6. **Dictionary Validation**: Real-time word checking
7. **Scoring**: Premium squares, letter values, word multipliers
8. **Turn Management**: Sequential player turns with pass option

## 📁 Assets Organization

The `assets/` folder is prepared for future enhancements:

### `/assets/textures/`
- Future: Custom board backgrounds
- Future: Tile designs and animations
- Future: UI element customizations

### `/assets/sounds/`
- Future: Tile placement sounds
- Future: Word validation feedback
- Future: Background music and effects

## 🔧 Development

### Running the Game
```bash
npm start
```

## 🌐 Playing with Friends Online

### Using ngrok for Remote Play

To play with friends who aren't on your local network, we recommend using **ngrok** to create a secure tunnel to your local server:

#### 1. Install ngrok
```bash
# Download from https://ngrok.com or use package managers:
# macOS with Homebrew:
brew install ngrok

# Windows with Chocolatey:
choco install ngrok

# Or download directly from https://ngrok.com/download
```

#### 2. Start Your Scrabble Server
```bash
npm start
```
Your server will be running on `http://localhost:3000`

#### 3. Create Public Tunnel
In a new terminal window:
```bash
ngrok http 3000
```

#### 4. Share the Public URL
ngrok will provide a public URL like:
```
https://abc123.ngrok.io
```

**Share this URL with your friends** - they can open it in their browser to join your game!

#### 5. Game Setup
1. **Host**: You start the game and configure timer settings
2. **Friends**: They join using the ngrok URL
3. **Play**: Enjoy real-time multiplayer Scrabble!

#### Benefits of Using ngrok:
- ✅ **No Router Configuration**: No need to mess with port forwarding
- ✅ **Secure HTTPS**: All traffic is encrypted
- ✅ **Easy Sharing**: Just send one URL to friends
- ✅ **Works Anywhere**: Friends can join from any internet connection
- ✅ **Free Tier Available**: Basic usage is free

#### Pro Tips:
- Keep the ngrok terminal window open during play
- The free ngrok URL changes each restart - consider upgrading for persistent URLs
- Test the connection yourself first by opening the ngrok URL in an incognito window

### File Dependencies
- All JavaScript files use ES6 modules
- Clear import/export structure
- Minimal coupling between modules
- Easy to test and maintain

### Code Quality
- Consistent naming conventions
- Comprehensive error handling
- Detailed logging and debugging
- Professional code organization

## 🎨 Styling

### CSS Organization
- Single consolidated CSS file in `/css/`
- Tailwind CSS for rapid UI development
- Custom styles for game-specific elements
- Responsive design for all screen sizes

### Visual Design
- Clean, modern interface
- Intuitive drag & drop interactions
- Clear visual feedback
- Professional game board appearance

## 🚀 Future Enhancements

The modular architecture makes it easy to add:
- Custom board themes and tile designs
- Sound effects and music
- AI players with different difficulty levels
- Tournament and scoring systems
- Save/load game functionality
- Mobile touch interface optimization
- Spectator mode for watching games

## 📝 Code Maintenance

Each module is self-contained and can be:
- Unit tested independently
- Modified without affecting other modules
- Extended with new features easily
- Debugged in isolation

This professional structure ensures long-term maintainability and extensibility of the codebase.