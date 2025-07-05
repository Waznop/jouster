import Phaser from 'phaser';
import { Card } from '../entities/Card';
import { Deck } from '../entities/Deck';
import { getOrCreateSeed } from '../utils/seed';
import { CardLayout } from '../layout/CardLayout';
import { CardData } from '../types/game';
import { CardPanel } from '../components/CardPanel';

const MAX_VISIBLE_DECK_CARDS = 5;

export default class GameScene extends Phaser.Scene {
  private stacks: Card[][] = [];
  private selectedCard: Card | null = null;
  private validMoves: Card[] = [];
  private deck!: Deck;
  private layout!: CardLayout;
  private background!: Phaser.GameObjects.Image;
  private deckSprites: Phaser.GameObjects.Sprite[] = [];
  private longPressTimer: Phaser.Time.TimerEvent | null = null;
  private activePanel: CardPanel | null = null;
  private isGameOver = false;
  private endPanel: Phaser.GameObjects.Container | null = null;
  private seed!: string;
  private startTime: number = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.background = this.add.image(0, 0, 'background');
    this.scaleBackground();
    this.initializeGame();
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(): void {
    this.scaleBackground();
    this.updateDeckPosition();

    const newScale = this.layout.calculateCardScale();

    this.stacks.forEach((stack, stackIndex) => {
      stack.forEach((card, cardIndex) => {
        const position = this.layout.getCardPosition(stackIndex, cardIndex);
        card.setScale(newScale);
        this.tweens.add({
          targets: card,
          x: position.x,
          y: position.y,
          duration: 300,
          ease: 'Power2',
        });
      });
    });

    // Reposition end game panel on resize
    if (this.endPanel) {
      this.updateEndPanelPosition();
    }
  }

  private scaleBackground(): void {
    const { width, height } = this.scale;
    const scaleX = width / this.background.width;
    const scaleY = height / this.background.height;
    const scale = Math.max(scaleX, scaleY);
    this.background.setScale(scale);
    this.background.setPosition(width / 2, height / 2);
  }

  private initializeGame(): void {
    // Reset game-over state on (re)start
    this.isGameOver = false;
    // Record start time for elapsed-time calculation
    this.startTime = this.time.now;
    if (this.endPanel) {
      this.endPanel.destroy(true);
      this.endPanel = null;
    }

    this.layout = new CardLayout(this);

    // Obtain a deterministic seed from the URL (or generate a new one)
    this.seed = getOrCreateSeed();
    this.deck = new Deck(this.seed);
    this.stacks = [];
    this.initializeDeck();
    this.dealInitialCards();
    this.setupInputHandlers();
  }

  private dealInitialCards(): void {
    for (let i = 0; i < 12; i++) {
      const cardData = this.deck.drawCard();
      if (cardData) {
        const position = this.layout.getCardPosition(i, 0);
        this.createStack(cardData, position.x, position.y, i);
      }
    }
  }

  private createStack(cardData: CardData, x: number, y: number, stackIndex: number): void {
    const card = new Card(this, x, y, cardData, stackIndex, this.layout.calculateCardScale());
    this.add.existing(card);
    this.stacks[stackIndex] = [card];
    card.setDepth(1); // Ensure new cards appear above others
  }

  private setupInputHandlers(): void {
    this.input.on(
      'gameobjectdown',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (this.isGameOver) return;
        if (this.activePanel) return; // Ignore input when panel is open

        // Only handle card selection for actual Card instances
        if (gameObject instanceof Card) {
          // Start long press timer
          const timer = this.time.delayedCall(500, () => {
            this.handleLongPress(gameObject as Card);
          });
          this.longPressTimer = timer;

          if (this.selectedCard === null) {
            this.selectCard(gameObject);
          } else {
            this.tryMoveCard(gameObject);
          }
        }
      }
    );

    this.input.on('pointerup', () => {
      if (this.longPressTimer !== null) {
        this.time.removeEvent(this.longPressTimer);
        this.longPressTimer = null;
      }
    });
  }

  private selectCard(card: Card): void {
    this.selectedCard = card;
    card.setTint(0xffff00);
    this.showValidMoves();
  }

  private showValidMoves(): void {
    this.validMoves = [];
    if (!this.selectedCard) return;

    const selectedStackIndex = this.selectedCard.index;
    const validIndices = [selectedStackIndex - 1, selectedStackIndex - 3].filter(
      (index) => index >= 0
    );

    for (const index of validIndices) {
      const targetStack = this.stacks[index];
      if (targetStack && targetStack.length > 0) {
        const topCard = targetStack[targetStack.length - 1];
        if (Card.isValidMove(this.selectedCard, topCard)) {
          this.validMoves.push(topCard);
          topCard.setTint(0x00ff00);
        }
      }
    }
  }

  private tryMoveCard(targetCard: Card): void {
    if (this.selectedCard && this.validMoves.includes(targetCard)) {
      this.moveCardToStack(this.selectedCard, targetCard);
    }
    this.clearSelection();
  }

  private moveCardToStack(sourceCard: Card, targetCard: Card): void {
    const sourceStackIndex = sourceCard.index;
    const targetStackIndex = targetCard.index;

    // Get source and target stacks
    const sourceStack = this.stacks[sourceStackIndex];
    const targetStack = this.stacks[targetStackIndex];

    // Move the entire source stack to the target stack
    const movedCards = sourceStack.splice(0, sourceStack.length);
    targetStack.push(...movedCards);

    // Update the indices of all moved cards
    movedCards.forEach((card) => {
      card.index = targetStackIndex;
    });

    // Remove empty source stack and shift remaining stacks
    this.stacks.splice(sourceStackIndex, 1);
    this.shiftStacks();

    // Deal new card if needed
    if (this.deck.remainingCards > 0) {
      this.dealNewCard();
    }

    this.checkGameEnded();
  }

  private shiftStacks(): void {
    this.stacks.forEach((stack, stackIndex) => {
      this.updateStack(stack, stackIndex);
    });
  }

  private updateStack(stack: Card[], stackIndex: number): void {
    stack.forEach((card, index) => {
      const isVisible =
        stack.length <= MAX_VISIBLE_DECK_CARDS || index >= stack.length - MAX_VISIBLE_DECK_CARDS;
      card.setVisible(isVisible);
      card.index = stackIndex;

      if (isVisible) {
        const visibleIndex =
          stack.length <= MAX_VISIBLE_DECK_CARDS
            ? index
            : index - (stack.length - MAX_VISIBLE_DECK_CARDS);
        this.updateCardPosition(card, stackIndex, visibleIndex);
      }
    });
  }

  private updateCardPosition(card: Card, stackIndex: number, visibleIndex: number): void {
    const position = this.layout.getCardPosition(stackIndex, visibleIndex);
    this.tweens.add({
      targets: card,
      x: position.x,
      y: position.y,
      duration: 300,
      ease: 'Power2',
    });
    card.setDepth(visibleIndex);
  }

  private updateDeckPosition(): void {
    const deckPos = this.layout.getDeckPosition();
    const scale = this.layout.calculateCardScale();
    const stackOffset = this.layout.getStackOffset();

    // Update existing sprites
    this.deckSprites.forEach((sprite, i) => {
      sprite.setScale(scale);
      sprite.setPosition(deckPos.x, deckPos.y - stackOffset * i);
      this.tweens.add({
        targets: sprite,
        x: deckPos.x,
        y: deckPos.y - stackOffset * i,
        duration: 300,
        ease: 'Power2',
      });
    });
  }

  private dealNewCard(): void {
    const cardData = this.deck.drawCard();
    if (cardData) {
      const newStackIndex = this.stacks.length;
      const deckPos = this.layout.getDeckPosition();
      const stackOffset = this.layout.getStackOffset();

      // Calculate the position of the top card in the deck
      const topDeckY =
        deckPos.y -
        Math.min(MAX_VISIBLE_DECK_CARDS - 1, this.deck.remainingCards - 1) * stackOffset;

      // Create card at deck's top position, face down
      const card = new Card(
        this,
        deckPos.x,
        topDeckY,
        cardData,
        newStackIndex,
        this.layout.calculateCardScale()
      );
      this.add.existing(card);
      card.setCardBack();
      // Set depth higher than deck sprites (which go from 0 to MAX_VISIBLE_DECK_CARDS-1)
      card.setDepth(MAX_VISIBLE_DECK_CARDS);

      // Get final position
      const finalPos = this.layout.getCardPosition(newStackIndex, 0);

      // Flip and slide animation
      this.tweens.add({
        targets: card,
        x: finalPos.x,
        y: finalPos.y,
        duration: 500,
        ease: 'Power2',
        onStart: () => {
          // Flip animation
          this.tweens.add({
            targets: card,
            scaleX: 0,
            duration: 150,
            yoyo: true,
            onYoyo: () => {
              card.showFace();
            },
          });
        },
        onComplete: () => {
          // Reset depth to normal stack depth after animation
          card.setDepth(1);
        },
      });

      // Add to stacks array
      this.stacks[newStackIndex] = [card];

      // Update deck visuals if needed
      if (this.deck.remainingCards < this.deckSprites.length) {
        // Remove excess sprites
        const spritesToRemove = this.deckSprites.splice(this.deck.remainingCards);
        spritesToRemove.forEach((sprite) => sprite.destroy());
      }
    }
  }

  private clearSelection(): void {
    if (this.selectedCard) {
      this.selectedCard.clearTint();
      this.selectedCard = null;
    }
    this.validMoves.forEach((card) => card.clearTint());
    this.validMoves = [];

    this.checkGameEnded();
  }

  private initializeDeck(): void {
    // Clear any existing deck sprites first
    this.deckSprites.forEach((sprite) => sprite.destroy());
    this.deckSprites = [];

    const deckPos = this.layout.getDeckPosition();
    const scale = this.layout.calculateCardScale();
    const stackOffset = this.layout.getStackOffset();

    // Create visual representation of deck height
    const numVisibleCards = Math.min(MAX_VISIBLE_DECK_CARDS, this.deck.remainingCards);

    for (let i = 0; i < numVisibleCards; i++) {
      const sprite = this.add
        .sprite(deckPos.x, deckPos.y - stackOffset * i, 'card-back')
        .setScale(scale)
        .setDepth(i);

      // Make all sprites interactive for long press when there are fewer cards
      sprite.setInteractive();

      let deckTimer: Phaser.Time.TimerEvent | null = null;

      sprite.on('pointerdown', () => {
        if (this.activePanel) return;

        deckTimer = this.time.delayedCall(500, () => {
          if (deckTimer) {
            // Only show panel if timer wasn't cleared
            this.showDeckPanel();
            deckTimer = null;
          }
        });
      });

      sprite.on('pointerup', () => {
        if (deckTimer) {
          deckTimer.destroy();
          deckTimer = null;
        }
      });

      sprite.on('pointerout', () => {
        if (deckTimer) {
          deckTimer.destroy();
          deckTimer = null;
        }
      });

      this.deckSprites.push(sprite);
    }
  }

  private handleLongPress(card: Card): void {
    // Clear any selected card state
    this.clearSelection();

    // Find the stack that contains this card
    const stackIndex = card.index;
    const stack = this.stacks[stackIndex];

    if (stack) {
      this.showStackPanel(stack);
    }
  }

  private showStackPanel(stack: Card[]): void {
    // Reverse the stack order so top card appears first
    const cardDataList = [...stack].reverse().map((card) => card.cardData);
    this.activePanel = new CardPanel(this, cardDataList, () => {
      this.activePanel = null;
    });
  }

  private showDeckPanel(): void {
    if (this.deck.remainingCards > 0) {
      const cardDataList = this.deck.getRemainingCards();
      this.activePanel = new CardPanel(this, cardDataList, () => {
        this.activePanel = null;
      });
    }
  }

  /**
   * Checks whether the game has ended (no remaining cards in the deck and no valid moves).
   * If so, displays a centered ending message and prevents further interaction.
   */
  private checkGameEnded(): void {
    if (this.isGameOver) return;

    // Even if cards remain in the deck, the game ends when no valid moves are available.
    for (let i = 0; i < this.stacks.length; i++) {
      const sourceStack = this.stacks[i];
      if (!sourceStack || sourceStack.length === 0) continue;

      const sourceCard = sourceStack[sourceStack.length - 1]; // Top card of source stack

      const potentialTargets = [i - 1, i - 3].filter((idx) => idx >= 0);
      for (const idx of potentialTargets) {
        const targetStack = this.stacks[idx];
        if (!targetStack || targetStack.length === 0) continue;

        const targetCard = targetStack[targetStack.length - 1];
        if (Card.isValidMove(sourceCard, targetCard)) {
          // A valid move exists, game not ended
          return;
        }
      }
    }

    // No moves available – game over
    this.isGameOver = true;
    const totalCards = 52; // Standard deck size
    const pilesLeft = this.stacks.length;

    // Find the smallest pile size remaining
    let minPile = Number.MAX_SAFE_INTEGER;
    this.stacks.forEach((stack) => {
      if (stack.length < minPile) {
        minPile = stack.length;
      }
    });

    if (minPile === Number.MAX_SAFE_INTEGER) {
      minPile = 0;
    }

    // Compute score according to new formula
    let score = 0;
    if (pilesLeft >= 1 && pilesLeft <= totalCards) {
      const rawScore = totalCards - pilesLeft + minPile / totalCards;
      score = (100 * rawScore) / totalCards;
    }
    this.showEndPanel(score);
  }

  /**
   * Creates an overlay panel with end text and a restart button.
   */
  private showEndPanel(score: number): void {
    if (this.endPanel) return;

    const { width, height } = this.scale;

    // Calculate elapsed time since game start and format as mm:ss
    const elapsedMs = this.time.now - this.startTime;
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Semi-transparent full-screen overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

    // Panel background
    const panelWidth = Math.min(width * 0.8, 400);
    const panelHeight = Math.min(height * 0.5, 320);
    const panelBg = this.add
      .rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x222222, 0.9)
      .setStrokeStyle(4, 0xffffff);

    // End text
    const yStart = height / 2 - panelHeight / 3;

    const endText = this.add
      .text(width / 2, yStart, 'The End', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Seed text
    const seedText = this.add
      .text(width / 2, yStart + 60, `Seed: ${this.seed}`, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#dddddd',
      })
      .setOrigin(0.5);

    // Score text
    const scoreRounded = Math.round(score * 10) / 10; // one decimal
    const scoreText = this.add
      .text(width / 2, yStart + 100, `Score: ${scoreRounded}%`, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#dddddd',
      })
      .setOrigin(0.5);

    // Time text
    const timeText = this.add
      .text(width / 2, yStart + 140, `Time: ${timeFormatted}`, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#dddddd',
      })
      .setOrigin(0.5);

    // Restart button background
    const btnWidth = 160;
    const btnHeight = 50;
    const btnY = height / 2 + panelHeight / 3;

    // Restart Button
    const restartBtnBg = this.add
      .rectangle(width / 2 - btnWidth / 2 - 10, btnY, btnWidth, btnHeight, 0xffffff)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.restart();
      });

    const restartBtnText = this.add
      .text(restartBtnBg.x, restartBtnBg.y, 'Restart', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#000000',
      })
      .setOrigin(0.5);

    // New Button
    const newBtnBg = this.add
      .rectangle(width / 2 + btnWidth / 2 + 10, btnY, btnWidth, btnHeight, 0xffffff)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const newSeed = this.generateRandomSeed();

        // Build new URL in the form /jouster/?seed={newSeed}
        const params = new URLSearchParams(window.location.search);
        params.set('seed', newSeed);
        const newUrl = `${window.location.pathname}?${params.toString()}`;

        window.location.href = newUrl;
      });

    const newBtnText = this.add
      .text(newBtnBg.x, newBtnBg.y, 'New', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#000000',
      })
      .setOrigin(0.5);

    // Combine into a container for easy repositioning
    this.endPanel = this.add.container(0, 0, [
      overlay,
      panelBg,
      endText,
      seedText,
      scoreText,
      timeText,
      restartBtnBg,
      restartBtnText,
      newBtnBg,
      newBtnText,
    ]);
    this.endPanel.setDepth(1000);
  }

  /** Updates panel and overlay size/position on window resize */
  private updateEndPanelPosition(): void {
    if (!this.endPanel) return;

    const { width, height } = this.scale;
    const overlay = this.endPanel.list[0] as Phaser.GameObjects.Rectangle;
    overlay.setSize(width, height);

    const panelBg = this.endPanel.list[1] as Phaser.GameObjects.Rectangle;
    const endText = this.endPanel.list[2] as Phaser.GameObjects.Text;
    const seedText = this.endPanel.list[3] as Phaser.GameObjects.Text;
    const scoreText = this.endPanel.list[4] as Phaser.GameObjects.Text;
    const timeText = this.endPanel.list[5] as Phaser.GameObjects.Text;
    const restartBtnBg = this.endPanel.list[6] as Phaser.GameObjects.Rectangle;
    const restartBtnText = this.endPanel.list[7] as Phaser.GameObjects.Text;
    const newBtnBg = this.endPanel.list[8] as Phaser.GameObjects.Rectangle;
    const newBtnText = this.endPanel.list[9] as Phaser.GameObjects.Text;

    const panelWidth = Math.min(width * 0.8, 400);
    const panelHeight = Math.min(height * 0.5, 320);
    panelBg.setSize(panelWidth, panelHeight);
    panelBg.setPosition(width / 2, height / 2);

    const yStart = height / 2 - panelHeight / 3;
    endText.setPosition(width / 2, yStart);
    seedText.setPosition(width / 2, yStart + 60);
    scoreText.setPosition(width / 2, yStart + 100);
    timeText.setPosition(width / 2, yStart + 140);

    const btnWidth = 160;
    const btnY = height / 2 + panelHeight / 3;
    restartBtnBg.setPosition(width / 2 - btnWidth / 2 - 10, btnY);
    restartBtnText.setPosition(restartBtnBg.x, restartBtnBg.y);

    newBtnBg.setPosition(width / 2 + btnWidth / 2 + 10, btnY);
    newBtnText.setPosition(newBtnBg.x, newBtnBg.y);
  }

  private generateRandomSeed(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
