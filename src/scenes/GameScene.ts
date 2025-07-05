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
    this.layout = new CardLayout(this);

    // Obtain a deterministic seed from the URL (or generate a new one)
    const seed = getOrCreateSeed();
    this.deck = new Deck(seed);
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
}
