# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Racing Tutor is a typing practice game for children aged 5-10 that combines racing elements with keyboard skill development. The game features automatic car movement with typing-based interaction for collecting stars and avoiding obstacles.

## Game Mechanics

### Core Gameplay
- **Duration**: 2-minute timed sessions
- **Movement**: Car drives automatically, player controls lane changes
- **Star Collection**: Press number keys (0-9) to collect numbered stars
- **Obstacle Avoidance**: Use A/S/D keys to dodge between three lanes
- **Scoring**: +1 star for collections, -1 star for collisions

### Key Features
- Automatic difficulty scaling based on time progression
- Visual feedback with celebrations and animations
- Optional sound effects with toggle control
- Performance-based end-game messages

## Technical Architecture

### File Structure
- `index.html` - Main game interface and UI elements
- `style.css` - Styling, animations, and responsive design
- `game.js` - Core game logic and mechanics
- `sounds.js` - Simple Web Audio API sound system
- `game_instructions.md` - Player instructions and gameplay guide

### Key Classes
- `RacingTutorGame` - Main game controller managing state, timing, and interactions
- `SoundManager` - Handles audio feedback and user preferences

### Game Systems
- **Timer System**: Precise 2-minute countdown with real-time display
- **Collision Detection**: Lane-based collision system with dodge mechanics
- **Star Collection**: Number matching system with visual feedback
- **Spawn Management**: Dynamic item generation with increasing difficulty

## Running the Game

Simply open `index.html` in any modern web browser - no build process or server required.

## License

Apache License 2.0