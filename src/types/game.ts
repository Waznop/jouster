import Phaser from 'phaser';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardValue =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export interface CardData {
  suit: Suit;
  value: CardValue;
}

export interface Card extends Phaser.GameObjects.Sprite {
  cardData: CardData;
  index: number;
}
