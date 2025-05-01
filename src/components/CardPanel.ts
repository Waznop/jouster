import Phaser from 'phaser';
import { Card } from '../entities/Card';
import { CardData } from '../types/game';

export class CardPanel {
  private panel!: Phaser.GameObjects.Container;
  private background!: Phaser.GameObjects.Rectangle;
  private cards: Card[] = [];
  private readonly PANEL_PADDING = 20;
  private readonly COLS = 3;
  private readonly CARD_SPACING = 20;
  private readonly CARD_SCALE = 0.7;
  private maskGraphics!: Phaser.GameObjects.Graphics;
  private isDragging = false;
  private lastY = 0;
  private scrollVelocity = 0;
  private readonly DECELERATION = 0.95; // Deceleration factor (0-1)
  private readonly MIN_VELOCITY = 0.1; // Minimum velocity before stopping
  private lastTime = 0;
  private overlay!: Phaser.GameObjects.Rectangle;
  private contentContainer!: Phaser.GameObjects.Container;
  private momentumTimer?: Phaser.Time.TimerEvent;
  private moveCallback?: (pointer: Phaser.Input.Pointer) => void;
  private upCallback?: () => void;

  constructor(
    private scene: Phaser.Scene,
    cardDataList: CardData[],
    onClose: () => void
  ) {
    this.createPanel();
    this.populateCards(cardDataList);
    this.setupScrolling();
    this.setupCloseButton(onClose);

    // Add resize handler
    this.scene.scale.on('resize', this.handleResize, this);
  }

  private handleResize(): void {
    const { width: gameWidth, height: gameHeight } = this.scene.scale;
    const cardWidth = 140 * this.CARD_SCALE;
    const panelWidth =
      cardWidth * this.COLS + this.CARD_SPACING * (this.COLS - 1) + this.PANEL_PADDING * 2;
    const panelHeight = gameHeight * 0.8;

    // Update overlay
    this.overlay.setPosition(gameWidth / 2, gameHeight / 2);
    this.overlay.setSize(gameWidth, gameHeight);

    // Update panel position
    this.panel.setPosition(gameWidth / 2, gameHeight / 2);

    // Update mask
    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(
      gameWidth / 2 - panelWidth / 2,
      gameHeight / 2 - panelHeight / 2,
      panelWidth,
      panelHeight
    );

    // Update background
    this.background.setSize(panelWidth, panelHeight);
  }

  private createPanel(): void {
    const { width: gameWidth, height: gameHeight } = this.scene.scale;

    // Calculate panel dimensions based on card size and spacing
    const cardWidth = 140 * this.CARD_SCALE;
    const panelWidth =
      cardWidth * this.COLS + this.CARD_SPACING * (this.COLS - 1) + this.PANEL_PADDING * 2;
    const panelHeight = gameHeight * 0.5;

    // Force a layout update to ensure we have correct dimensions
    this.scene.scale.refresh();

    const x = gameWidth / 2;
    const y = gameHeight / 2;

    // Create semi-transparent background overlay
    this.overlay = this.scene.add.rectangle(x, y, gameWidth, gameHeight, 0x000000, 0.5);
    this.overlay.setDepth(998);

    // Create panel background
    this.background = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x333333);
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
    this.maskGraphics.fillRect(x - panelWidth / 2, y - panelHeight / 2, panelWidth, panelHeight);

    const mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics);
    this.contentContainer.setMask(mask);
  }

  private setupCloseButton(onClose: () => void): void {
    const { width: panelWidth, height: panelHeight } = this.background;
    const closeButton = this.scene.add.circle(
      panelWidth / 2 - this.PANEL_PADDING,
      -panelHeight / 2 + this.PANEL_PADDING,
      15,
      0xff0000
    );

    const closeText = this.scene.add
      .text(closeButton.x, closeButton.y, 'X', { color: '#ffffff', fontSize: '24px' })
      .setOrigin(0.5);

    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => {
      this.destroy();
      onClose();
    });

    this.panel.add([closeButton, closeText]);
  }

  private populateCards(cardDataList: CardData[]): void {
    const { width: panelWidth, height: panelHeight } = this.background;
    const cardWidth = 140 * this.CARD_SCALE;
    const cardHeight = 190 * this.CARD_SCALE;
    const spacing = this.CARD_SPACING;

    const startX = -panelWidth / 2 + cardWidth / 2 + this.PANEL_PADDING;
    let currentX = startX;
    let currentY = -panelHeight / 2 + cardHeight / 2 + this.PANEL_PADDING;

    cardDataList.forEach((cardData, index) => {
      const card = new Card(this.scene, currentX, currentY, cardData, index, this.CARD_SCALE);
      // Make cards non-interactive in the panel
      card.removeInteractive();

      this.cards.push(card);
      this.contentContainer.add(card);

      // Move to next position
      if ((index + 1) % this.COLS === 0) {
        currentX = startX;
        currentY += cardHeight + spacing;
      } else {
        currentX += cardWidth + spacing;
      }
    });
  }

  private setupScrolling(): void {
    const { height: panelHeight } = this.background;
    const contentHeight = this.getContentHeight();

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
            -(contentHeight - panelHeight),
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
        -(contentHeight - panelHeight),
        0
      );

      this.contentContainer.y = newY;
      this.scrollVelocity *= this.DECELERATION;

      if (
        Math.abs(this.scrollVelocity) < this.MIN_VELOCITY ||
        (newY === 0 && this.scrollVelocity > 0) ||
        (newY === -(contentHeight - panelHeight) && this.scrollVelocity < 0)
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
    const cardHeight = 190 * this.CARD_SCALE;
    return rows * cardHeight + (rows - 1) * this.CARD_SPACING + 2 * this.PANEL_PADDING;
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
    this.cards.forEach((card) => card.destroy());
  }
}
