import Phaser from 'phaser';
import { CardData, Suit, CardValue } from '../types/game';

export class Card extends Phaser.GameObjects.Sprite {
  public cardData: CardData;
  public index: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cardData: CardData,
    index: number,
    scale: number
  ) {
    super(scene, x, y, 'cards', Card.getCardFrame(cardData));
    this.cardData = cardData;
    this.index = index;
    this.setScale(scale);
    this.setInteractive();
  }

  public static getCardFrame(cardData: CardData): number {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    const suitIndex = suits.indexOf(cardData.suit);
    const valueIndex = values.indexOf(cardData.value);

    return suitIndex * 13 + valueIndex;
  }

  public setCardBack(): void {
    this.setTexture('card-back');
  }

  public showFace(): void {
    this.setTexture('cards');
    this.setFrame(Card.getCardFrame(this.cardData));
  }

  public static isValidMove(sourceCard: Card, targetCard: Card): boolean {
    return (
      sourceCard.cardData.suit === targetCard.cardData.suit ||
      sourceCard.cardData.value === targetCard.cardData.value
    );
  }
}
