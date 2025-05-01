# Game Design Document: "Cascade"

## Overview

**Cascade** is a mobile-first, browser-based solitaire game based on "Accordion" rules. Players aim to condense the deck into as few stacks as possible by stacking cards onto each other according to matching suits or ranks, with an added spatial constraint. Designed with smooth pixel art aesthetics reminiscent of "Sword & Sworcery," it delivers a cozy yet strategic experience.

## Core Gameplay

### Format

- **Platform**: Mobile Browser (Portrait) — responsive to different screen sizes
- **Mode**: Solitaire (single player)
- **Session Length**: 2–10 minutes per game
- **Target Audience**: Casual players and puzzle lovers

### Rules

- Cards are arranged as **stacks**.
- Only the **first 12 stacks** are visible and interactable at any given time.
- Cards can be **moved** onto another card that is either:
  - **1 stack before** it, or
  - **3 stacks before** it.
- A card can only move if:

  - It shares the **same value** (rank), **or**
  - It shares the **same suit**

- After a card is moved, the gap collapses (stacks shift left to fill the gap).
- New cards from the deck slide into the visible area when earlier cards are cleared.
- The goal is to **minimize the number of final stacks**.

### Victory Conditions

- Game ends when no more valid moves are available.
- Score based on fewest stacks remaining.

## Layout and UI

### Grid Layout

- 4 rows of 3 cards each (3 columns)
- Cards fill most of the screen for mobile portrait
- Cards and stacks dynamically resize based on browser window size

### Interaction

- Tap a card to select it
- Highlight valid moves (cards 1 or 3 before that match suit or value)
- Tap destination card to move
- **Drag and Drop** option for card movement
- Smooth collapsing animation after move
- Option to "undo" last move (limited uses)

### Visuals

- **Art Style**: Smooth, detailed **pixel art**
  - Soft shading
  - Ambient glow effects
  - Slight card wobble animation on hover/selection
- **Card Design**:
  - Minimalistic but readable ranks and suits
  - Each suit has a distinct color palette
- **Background**:
  - Soft, moody pixel art backgrounds (subtle parallax scrolling optional)

## Sound

- Gentle ambient background music
- Light click/tap sound for card actions
- Soft swoosh for moving cards
- Low-key chime for successful stack moves

## Progression and Replayability

- Fast replay button
- Track best scores (fewest stacks)
- Daily shuffle challenges (optional future feature)

## Tech Stack Recommendation

- **Frontend**: Phaser (HTML5 game framework for smooth interactions and easy drag/drop)
- **Hosting**: Vercel or Netlify

## Future Expansion Ideas

- Pixel-art card backs/unlockables
- Cosmetic background themes
- Challenge modes: limited moves, speedruns

---

## Mockup Layout

```
[   C1   ][   C2   ][   C3   ]

[   C4   ][   C5   ][   C6   ]

[   C7   ][   C8   ][   C9   ]

[  C10   ][  C11   ][  C12   ]
```

- Each "C" stands for a Card/Stack.
- Top-to-bottom, left-to-right order.
- After moving/clearing, stacks shift left to fill empty spots.
- If fewer than 12 cards remain, grid collapses to fewer rows dynamically.

Example of interaction:

- Drag C6 onto C3 if they match suit or rank and are 3 apart.
- Collapse happens: C7, C8, C9 shift left.
- New card from deck slides into C12 if available.

---

## Example Animation Flow

**Move Phase:**

- Player drags C6 onto C3.
- C6 smoothly floats and snaps onto C3.
- C6 stack merges into C3 (brief highlight effect).

**Collapse Phase:**

- C7, C8, C9, C10, C11, and C12 shift left to fill the empty C6 slot.
- Shift animation: cards slide left with slight easing.
- Slight bounce on cards settling into new positions.

**Refill Phase:**

- If fewer than 12 stacks are visible, new card(s) animate sliding into the rightmost position(s).
- New card appears with a fade-in + slide-in animation from offscreen.

**Timing:**

- Move animation: ~200ms
- Collapse animation: ~300ms
- Refill animation: ~300ms
