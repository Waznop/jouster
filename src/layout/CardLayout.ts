import Phaser from 'phaser';

export class CardLayout {
  private readonly BASE_CARD_WIDTH = 140;
  private readonly BASE_CARD_HEIGHT = 190;
  private readonly CARD_PADDING = 20;
  private readonly VERTICAL_PADDING = 20;
  private readonly STACK_OFFSET = 2;
  private readonly ROWS = 4;
  private readonly COLS = 3;
  private readonly DECK_PADDING = 20; // Extra padding between C12 and deck

  constructor(private scene: Phaser.Scene) {}

  public calculateCardScale(): number {
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    // Calculate scales based on both width and height constraints
    // Account for deck position in width calculation
    const totalWidth =
      this.BASE_CARD_WIDTH * (this.COLS + 1) +
      this.CARD_PADDING * (this.COLS - 1) +
      this.DECK_PADDING;

    const scaleByHeight =
      (gameHeight - 2 * this.VERTICAL_PADDING) /
      (this.BASE_CARD_HEIGHT * this.ROWS + this.CARD_PADDING * (this.ROWS - 1));

    const scaleByWidth = (gameWidth - 2 * this.VERTICAL_PADDING) / totalWidth;

    return Math.min(scaleByWidth, scaleByHeight);
  }

  public getDeckPosition(): { x: number; y: number } {
    const { width: cardWidth, height: cardHeight } = this.getCardDimensions();
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    // Calculate total grid width (excluding deck)
    const gridWidth = this.COLS * cardWidth + (this.COLS - 1) * this.CARD_PADDING;

    // Position deck to the right of C12 with extra padding
    const startX = (gameWidth - gridWidth) / 2;
    const deckX = startX + gridWidth + this.DECK_PADDING + cardWidth / 2;

    // Align with bottom row
    const totalGridHeight = this.ROWS * cardHeight + (this.ROWS - 1) * this.CARD_PADDING;
    const startY = (gameHeight - totalGridHeight) / 2;
    const deckY = startY + totalGridHeight - cardHeight / 2;

    return { x: deckX, y: deckY };
  }

  public getCardDimensions(): { width: number; height: number } {
    const scale = this.calculateCardScale();
    return {
      width: this.BASE_CARD_WIDTH * scale,
      height: this.BASE_CARD_HEIGHT * scale,
    };
  }

  public getStackOffset(): number {
    return this.STACK_OFFSET * this.calculateCardScale();
  }

  public getCardPosition(index: number, stackPosition: number = 0): { x: number; y: number } {
    const { width: cardWidth, height: cardHeight } = this.getCardDimensions();
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    // Calculate total grid width and height (based on bottom cards)
    const totalGridWidth = this.COLS * cardWidth + (this.COLS - 1) * this.CARD_PADDING;
    const totalGridHeight = this.ROWS * cardHeight + (this.ROWS - 1) * this.CARD_PADDING;

    // Calculate starting positions to center the grid
    const startX = (gameWidth - totalGridWidth) / 2 + cardWidth / 2;
    const startY = (gameHeight - totalGridHeight) / 2 + cardHeight / 2;

    const row = Math.floor(index / this.COLS);
    const col = index % this.COLS;

    // Calculate base position for the bottom card of the stack
    const baseX = startX + col * (cardWidth + this.CARD_PADDING);
    const baseY = startY + row * (cardHeight + this.CARD_PADDING);

    // Apply stack offset
    const stackOffsetY = -this.getStackOffset() * stackPosition;

    return {
      x: baseX,
      y: baseY + stackOffsetY,
    };
  }

  public get rows(): number {
    return this.ROWS;
  }

  public get cols(): number {
    return this.COLS;
  }
}
