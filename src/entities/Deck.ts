import { CardData, Suit, CardValue } from '../types/game';

export class Deck {
  private cards: CardData[] = [];

  constructor() {
    this.createDeck();
    this.shuffle();
  }

  private createDeck(): void {
    const suits: Suit[] = ['hearts', 'diamonds']; // ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    for (const suit of suits) {
      for (const value of values) {
        this.cards.push({ suit, value });
      }
    }
  }

  public shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  public drawCard(): CardData | undefined {
    return this.cards.pop();
  }

  public get remainingCards(): number {
    return this.cards.length;
  }

  public getRemainingCards(): CardData[] {
    return [...this.cards].reverse();
  }
}
