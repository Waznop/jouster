import { CardData, Suit, CardValue } from '../types/game';

export class Deck {
  private cards: CardData[] = [];

  constructor(seed?: string) {
    this.createDeck();
    this.shuffle(seed);
  }

  private createDeck(): void {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    for (const suit of suits) {
      for (const value of values) {
        this.cards.push({ suit, value });
      }
    }
  }

  /**
   * Shuffles the deck in a deterministic manner when a seed is provided.
   * If no seed is supplied, it falls back to Math.random (default behaviour).
   */
  public shuffle(seed?: string): void {
    const randomFn = seed ? Deck.createSeededRandom(seed) : Math.random;

    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Converts a string seed into a deterministic pseudo-random number generator.
   * Uses the mulberry32 algorithm for good speed/quality balance.
   */
  private static createSeededRandom(seedStr: string): () => number {
    // Simple string -> 32-bit hash
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) {
      h = (h << 5) - h + seedStr.charCodeAt(i);
      h |= 0; // Convert to 32-bit integer
    }

    let a = h >>> 0; // Ensure unsigned

    // Mulberry32 PRNG
    return function () {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
