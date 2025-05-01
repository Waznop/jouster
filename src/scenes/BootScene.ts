import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Load card assets
    this.load.spritesheet('cards', 'assets/cards.png', {
      frameWidth: 140,
      frameHeight: 190,
    });

    // Load background
    this.load.image('background', 'assets/background.png');

    // Load UI elements
    this.load.image('card-back', 'assets/card-back.png');
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
