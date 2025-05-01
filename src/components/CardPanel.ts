import Phaser from 'phaser';
import { Card } from '../entities/Card';
import { CardData } from '../types/game';
import { CardLayout } from '../layout/CardLayout';

export class CardPanel {
  private panel!: Phaser.GameObjects.Container;
  private background!: Phaser.GameObjects.Rectangle;
  private cards: Card[] = [];
  private readonly COLS = 3;
  private readonly ROWS = 4;
  private readonly PANEL_CARD_SCALE_FACTOR = 0.85;
  private layout: CardLayout;
  private maskGraphics!: Phaser.GameObjects.Graphics;
  private contentContainer!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Rectangle;
  private isDragging = false;
  private lastY = 0;
  private scrollVelocity = 0;
  private readonly DECELERATION = 0.95;
  private readonly MIN_VELOCITY = 0.1;
  private lastTime = 0;
  private momentumTimer?: Phaser.Time.TimerEvent;
  private moveCallback?: (pointer: Phaser.Input.Pointer) => void;
  private upCallback?: () => void;

  constructor(
    private scene: Phaser.Scene,
    cardDataList: CardData[],
    private onClose: () => void
  ) {
    this.layout = new CardLayout(this.scene);
    this.createPanel();
    this.populateCards(cardDataList);
    this.setupScrolling();
    this.setupCloseButton(onClose);

    // Add resize handler
    this.scene.scale.on('resize', this.handleResize, this);
  }

  private handleResize(): void {
    const { width: gameWidth, height: gameHeight } = this.scene.scale;
    const panelDimensions = this.calculatePanelDimensions();

    // Update overlay
    this.overlay.setPosition(gameWidth / 2, gameHeight / 2);
    this.overlay.setSize(gameWidth, gameHeight);

    // Update panel position
    this.panel.setPosition(gameWidth / 2, gameHeight / 2);

    // Update mask
    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(
      gameWidth / 2 - panelDimensions.width / 2,
      gameHeight / 2 - panelDimensions.height / 2,
      panelDimensions.width,
      panelDimensions.height
    );

    // Update background
    this.background.setSize(panelDimensions.width, panelDimensions.height);

    // Update card positions
    this.updateCardPositions();

    // Update close button position and size
    const closeContainer = this.panel.getAt(2) as Phaser.GameObjects.Container;
    if (closeContainer) {
      const { width: cardWidth } = this.layout.getCardDimensions();
      const scaledCardWidth = cardWidth * this.PANEL_CARD_SCALE_FACTOR;
      const margin = scaledCardWidth * 0.2;
      const buttonRadius = scaledCardWidth * 0.15;

      closeContainer.setPosition(
        panelDimensions.width / 2 - margin,
        -panelDimensions.height / 2 + margin
      );

      // Update button and text size
      const closeButton = closeContainer.getAt(0) as Phaser.GameObjects.Arc;
      const closeText = closeContainer.getAt(1) as Phaser.GameObjects.Text;

      if (closeButton && closeText) {
        closeButton.setRadius(buttonRadius);
        closeText.setFontSize(buttonRadius * 1.2);
      }
    }
  }

  private calculatePanelDimensions(): { width: number; height: number } {
    const { width: cardWidth, height: cardHeight } = this.layout.getCardDimensions();
    const cardSpacing = this.layout.getStackOffset() * 10; // Use stack offset as base unit for spacing

    // Match the exact dimensions of the 3x4 grid
    const panelWidth = cardWidth * this.COLS + cardSpacing * (this.COLS - 1);
    const panelHeight = cardHeight * this.ROWS + cardSpacing * (this.ROWS - 1);

    return { width: panelWidth, height: panelHeight };
  }

  private getContentArea(): {
    x: number;
    y: number;
    width: number;
    height: number;
    cardSpacing: number;
  } {
    const { width: cardWidth, height: cardHeight } = this.layout.getCardDimensions();
    const scaledCardWidth = cardWidth * this.PANEL_CARD_SCALE_FACTOR;
    const scaledCardHeight = cardHeight * this.PANEL_CARD_SCALE_FACTOR;
    const cardSpacing = this.layout.getStackOffset() * 10;

    // Calculate the total size needed for the content
    const contentWidth = scaledCardWidth * this.COLS + cardSpacing * (this.COLS - 1);
    const contentHeight = scaledCardHeight * this.ROWS + cardSpacing * (this.ROWS - 1);

    // Calculate margins to match the game grid spacing
    const horizontalMargin = (this.background.width - contentWidth) / 2;
    const verticalMargin = horizontalMargin; // Use same margin for consistency

    // Position content with equal margins
    const x = -this.background.width / 2 + horizontalMargin;
    const y = -this.background.height / 2 + verticalMargin;

    return { x, y, width: contentWidth, height: contentHeight, cardSpacing };
  }

  private createPanel(): void {
    const { width: gameWidth, height: gameHeight } = this.scene.scale;
    const panelDimensions = this.calculatePanelDimensions();
    const x = gameWidth / 2;
    const y = gameHeight / 2;

    // Create semi-transparent background overlay
    this.overlay = this.scene.add.rectangle(x, y, gameWidth, gameHeight, 0x000000, 0.5);
    this.overlay.setDepth(998);
    this.overlay.setInteractive();

    // Create panel background
    this.background = this.scene.add.rectangle(
      0,
      0,
      panelDimensions.width,
      panelDimensions.height,
      0x333333
    );
    this.background.setStrokeStyle(2, 0xffffff);

    // Create container for panel content
    this.panel = this.scene.add.container(x, y);
    this.panel.setDepth(999);
    this.panel.add(this.background);

    // Create separate container for scrollable content
    this.contentContainer = this.scene.add.container(0, 0);
    this.panel.add(this.contentContainer);

    // Create mask for scrolling
    this.maskGraphics = this.scene.add.graphics();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(
      x - panelDimensions.width / 2,
      y - panelDimensions.height / 2,
      panelDimensions.width,
      panelDimensions.height
    );

    const mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics);
    this.contentContainer.setMask(mask);

    // Add click handler to close panel when clicking outside
    this.overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const panelBounds = new Phaser.Geom.Rectangle(
        x - panelDimensions.width / 2,
        y - panelDimensions.height / 2,
        panelDimensions.width,
        panelDimensions.height
      );

      // Only close if click is outside the panel bounds
      if (!panelBounds.contains(pointer.x, pointer.y)) {
        this.destroy();
        this.onClose();
      }
    });
  }

  private setupCloseButton(onClose: () => void): void {
    const { width: cardWidth } = this.layout.getCardDimensions();
    const scaledCardWidth = cardWidth * this.PANEL_CARD_SCALE_FACTOR;
    const buttonRadius = scaledCardWidth * 0.15;
    const margin = scaledCardWidth * 0.2; // 20% of scaled card width as margin

    // Create a container for the close button that will maintain its position relative to the panel
    const closeContainer = this.scene.add.container(
      this.background.width / 2 - margin,
      -this.background.height / 2 + margin
    );

    const closeButton = this.scene.add.circle(0, 0, buttonRadius, 0xff0000);

    const closeText = this.scene.add
      .text(0, 0, 'X', {
        color: '#ffffff',
        fontSize: `${buttonRadius * 1.2}px`,
      })
      .setOrigin(0.5);

    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => {
      this.destroy();
      onClose();
    });

    closeContainer.add([closeButton, closeText]);
    this.panel.add(closeContainer);
  }

  private populateCards(cardDataList: CardData[]): void {
    const { x: startX, y: startY, cardSpacing } = this.getContentArea();
    const { width: cardWidth, height: cardHeight } = this.layout.getCardDimensions();
    const scaledCardWidth = cardWidth * this.PANEL_CARD_SCALE_FACTOR;
    const scaledCardHeight = cardHeight * this.PANEL_CARD_SCALE_FACTOR;

    cardDataList.forEach((cardData, index) => {
      const col = index % this.COLS;
      const row = Math.floor(index / this.COLS);
      const x = startX + col * (scaledCardWidth + cardSpacing) + scaledCardWidth / 2;
      const y = startY + row * (scaledCardHeight + cardSpacing) + scaledCardHeight / 2;

      const card = new Card(
        this.scene,
        x,
        y,
        cardData,
        index,
        this.layout.calculateCardScale() * this.PANEL_CARD_SCALE_FACTOR
      );
      // Make cards non-interactive in the panel
      card.removeInteractive();

      this.cards.push(card);
      this.contentContainer.add(card);
    });
  }

  private updateCardPositions(): void {
    const { x: startX, y: startY, cardSpacing } = this.getContentArea();
    const { width: cardWidth, height: cardHeight } = this.layout.getCardDimensions();
    const scaledCardWidth = cardWidth * this.PANEL_CARD_SCALE_FACTOR;
    const scaledCardHeight = cardHeight * this.PANEL_CARD_SCALE_FACTOR;

    this.cards.forEach((card, index) => {
      const col = index % this.COLS;
      const row = Math.floor(index / this.COLS);
      const x = startX + col * (scaledCardWidth + cardSpacing) + scaledCardWidth / 2;
      const y = startY + row * (scaledCardHeight + cardSpacing) + scaledCardHeight / 2;

      card.setScale(this.layout.calculateCardScale() * this.PANEL_CARD_SCALE_FACTOR);

      this.scene.tweens.add({
        targets: card,
        x: x,
        y: y,
        duration: 300,
        ease: 'Power2',
      });
    });
  }

  private setupScrolling(): void {
    const contentHeight = this.getContentHeight();
    const panelHeight = this.background.height;

    if (contentHeight > panelHeight) {
      this.panel.setInteractive(
        new Phaser.Geom.Rectangle(
          -this.background.width / 2,
          -this.background.height / 2,
          this.background.width,
          this.background.height
        ),
        Phaser.Geom.Rectangle.Contains
      );

      this.panel.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.isDragging = true;
        this.lastY = pointer.y;
        this.lastTime = pointer.time;
        this.scrollVelocity = 0;

        if (this.momentumTimer) {
          this.momentumTimer.destroy();
          this.momentumTimer = undefined;
        }
      });

      // Store callbacks so we can remove them later
      this.moveCallback = (pointer: Phaser.Input.Pointer) => {
        if (this.isDragging) {
          const deltaY = pointer.y - this.lastY;
          const deltaTime = pointer.time - this.lastTime;

          if (deltaTime > 0) {
            this.scrollVelocity = deltaY / deltaTime;
          }

          const newY = Phaser.Math.Clamp(
            this.contentContainer.y + deltaY,
            -(contentHeight - panelHeight + this.getContentArea().cardSpacing), // Add extra space for bottom margin
            0
          );

          this.contentContainer.y = newY;
          this.lastY = pointer.y;
          this.lastTime = pointer.time;
        }
      };

      this.upCallback = () => {
        if (this.isDragging) {
          this.isDragging = false;

          if (this.momentumTimer) {
            this.momentumTimer.destroy();
          }

          this.momentumTimer = this.scene.time.addEvent({
            delay: 16,
            callback: this.updateMomentumScroll,
            callbackScope: this,
            loop: true,
          });
        }
      };

      this.scene.input.on('pointermove', this.moveCallback);
      this.scene.input.on('pointerup', this.upCallback);
    }
  }

  private updateMomentumScroll(): void {
    if (!this.isDragging && Math.abs(this.scrollVelocity) > this.MIN_VELOCITY) {
      const deltaY = this.scrollVelocity * 16;
      const contentHeight = this.getContentHeight();
      const panelHeight = this.background.height;

      const newY = Phaser.Math.Clamp(
        this.contentContainer.y + deltaY,
        -(contentHeight - panelHeight + this.getContentArea().cardSpacing), // Add extra space for bottom margin
        0
      );

      this.contentContainer.y = newY;
      this.scrollVelocity *= this.DECELERATION;

      if (
        Math.abs(this.scrollVelocity) < this.MIN_VELOCITY ||
        (newY === 0 && this.scrollVelocity > 0) ||
        (newY === -(contentHeight - panelHeight + this.getContentArea().cardSpacing) &&
          this.scrollVelocity < 0)
      ) {
        this.scrollVelocity = 0;
        if (this.momentumTimer) {
          this.momentumTimer.destroy();
          this.momentumTimer = undefined;
        }
      }
    }
  }

  private getContentHeight(): number {
    if (this.cards.length === 0) return 0;

    const rows = Math.ceil(this.cards.length / this.COLS);
    const { height: cardHeight } = this.layout.getCardDimensions();
    const scaledCardHeight = cardHeight * this.PANEL_CARD_SCALE_FACTOR;
    const cardSpacing = this.layout.getStackOffset() * 10;
    return rows * scaledCardHeight + (rows + 1) * cardSpacing;
  }

  public destroy(): void {
    // Clean up all event listeners
    if (this.moveCallback) {
      this.scene.input.off('pointermove', this.moveCallback);
    }
    if (this.upCallback) {
      this.scene.input.off('pointerup', this.upCallback);
    }
    if (this.momentumTimer) {
      this.momentumTimer.destroy();
    }

    this.scene.scale.off('resize', this.handleResize, this);
    this.maskGraphics.destroy();
    this.panel.destroy();
    this.background.destroy();
    this.overlay.destroy();
    this.contentContainer.destroy();
    this.cards.forEach((card) => card.destroy());
  }
}
