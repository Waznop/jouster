import Phaser from 'phaser';
import { Card } from '../entities/Card';
import { Deck } from '../entities/Deck';
import { CardLayout } from '../layout/CardLayout';
import { CardData } from '../types/game';
import { CardPanel } from '../components/CardPanel';

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
    this.background = this.add.image(0, 0, 'background').setOrigin(0);
    this.scaleBackground();
    this.initializeGame();
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(): void {
    this.scaleBackground();
    const newScale = this.layout.calculateCardScale();

    // Update deck position and scale
    const deckPos = this.layout.getDeckPosition();
    this.updateDeckVisuals();

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
    this.background.setDisplaySize(width, height);
  }

  private repositionCards(): void {
    this.stacks.forEach((stack, stackIndex) => {
      stack.forEach((card, cardIndex) => {
        const position = this.layout.getCardPosition(stackIndex, cardIndex);
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

  private initializeGame(): void {
    this.layout = new CardLayout(this);
    this.deck = new Deck();
    this.stacks = [];

    // Initialize deck visuals
    this.updateDeckVisuals();

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
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
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

    // Update positions of cards in target stack
    this.updateStackPositions(targetStackIndex);

    // Remove empty source stack and shift remaining stacks
    this.stacks.splice(sourceStackIndex, 1);
    this.shiftStacks();

    // Deal new card if needed
    if (this.deck.remainingCards > 0) {
      this.dealNewCard();
    }
  }

  private updateStackPositions(stackIndex: number): void {
    const stack = this.stacks[stackIndex];
    stack.forEach((card, index) => {
      const position = this.layout.getCardPosition(stackIndex, index);
      card.index = stackIndex;
      this.tweens.add({
        targets: card,
        x: position.x,
        y: position.y,
        duration: 300,
        ease: 'Power2',
      });
      card.setDepth(index); // Ensure proper stacking order
    });
  }

  private shiftStacks(): void {
    this.stacks.forEach((stack, stackIndex) => {
      stack.forEach((card, cardIndex) => {
        card.index = stackIndex;
        const position = this.layout.getCardPosition(stackIndex, cardIndex);
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

  private dealNewCard(): void {
    const cardData = this.deck.drawCard();
    if (cardData) {
      const newStackIndex = this.stacks.length;
      const deckPos = this.layout.getDeckPosition();
      const stackOffset = this.layout.getStackOffset();

      // Calculate the position of the top card in the deck
      const topDeckY = deckPos.y - Math.min(4, this.deck.remainingCards) * stackOffset;

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
      // Set depth higher than deck sprites (which go from 0 to 4)
      card.setDepth(10);

      // Update deck visuals after drawing
      this.updateDeckVisuals();

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
    }

    // Update deck sprite visibility
    this.updateDeckVisuals();
  }

  private clearSelection(): void {
    if (this.selectedCard) {
      this.selectedCard.clearTint();
      this.selectedCard = null;
    }
    this.validMoves.forEach((card) => card.clearTint());
    this.validMoves = [];
  }

  private updateDeckVisuals(): void {
    // Clear existing deck sprites
    this.deckSprites.forEach((sprite) => sprite.destroy());
    this.deckSprites = [];

    const deckPos = this.layout.getDeckPosition();
    const scale = this.layout.calculateCardScale();
    const stackOffset = this.layout.getStackOffset();

    // Create visual representation of deck height
    // Show up to 5 cards to represent the deck
    const numVisibleCards = Math.min(5, this.deck.remainingCards);

    for (let i = 0; i < numVisibleCards; i++) {
      const sprite = this.add
        .sprite(deckPos.x, deckPos.y - stackOffset * i, 'card-back')
        .setScale(scale)
        .setDepth(i);

      // Only make the top sprite interactive for long press
      if (i === numVisibleCards - 1) {
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
      }

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
      // Get remaining cards from the deck
      const cardDataList: CardData[] = [];
      let nextCard = this.deck.peekNextCard();
      while (nextCard) {
        cardDataList.push(nextCard);
        nextCard = this.deck.peekNextCard(cardDataList.length);
      }

      this.activePanel = new CardPanel(this, cardDataList, () => {
        this.activePanel = null;
      });
    }
  }
}
