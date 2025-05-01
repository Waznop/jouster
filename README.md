# Cascade

A mobile-first, browser-based solitaire game based on Accordion rules. Built with Phaser 3.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Open your browser and navigate to `http://localhost:5173`

## Game Rules

- Cards are arranged in a 4x3 grid
- You can move a card onto another card that is either 1 or 3 positions before it
- A card can only move if it shares the same suit or rank
- After a card is moved, the gap collapses and remaining cards shift left
- New cards from the deck slide into the visible area when earlier cards are cleared
- The goal is to minimize the number of final stacks

## Development

- `src/main.js` - Main game configuration
- `src/scenes/BootScene.js` - Asset loading scene
- `src/scenes/GameScene.js` - Main game logic

## Assets

Place your game assets in the `public/assets` directory:

- `cards.png` - Spritesheet of all playing cards
- `background.png` - Game background
- `card-back.png` - Card back design

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.
