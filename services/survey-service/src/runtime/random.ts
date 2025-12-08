/**
 * Deterministic Random Number Generator
 * 
 * Provides consistent randomization based on sessionId + context.
 * This ensures that the same session always gets the same random order
 * for questions, options, etc., preventing reshuffling on page refresh.
 */

/**
 * Simple Linear Congruential Generator (LCG)
 * Provides deterministic pseudo-random numbers
 */
class DeterministicRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // LCG formula: (a * seed + c) % m
    // Using constants that provide good distribution
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296; // Normalize to [0, 1)
  }
}

/**
 * Generate a deterministic random number generator for a specific context
 * 
 * @param sessionId - The survey session ID
 * @param pageId - The current page ID
 * @param groupId - Optional group ID (for question ordering within groups)
 * @param questionId - Optional question ID (for option ordering within questions)
 * @param context - Additional context string (e.g., 'groups', 'questions', 'options')
 * @returns A function that returns random numbers between 0 and 1
 */
export function getDeterministicRandom(
  sessionId: string,
  pageId: string,
  groupId?: string | null,
  questionId?: string,
  context?: string
): () => number {
  // Create a deterministic seed from the context
  const seedString = [sessionId, pageId, groupId, questionId, context]
    .filter(Boolean)
    .join('|');
  
  const seed = hashString(seedString);
  const generator = new DeterministicRandom(seed);
  
  return () => generator.next();
}

/**
 * Simple string hash function
 * Converts a string to a numeric seed
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Shuffle an array deterministically
 * 
 * @param array - The array to shuffle
 * @param randomFn - The deterministic random function
 * @returns A new shuffled array
 */
export function deterministicShuffle<T>(
  array: T[],
  randomFn: () => number
): T[] {
  const shuffled = [...array];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  
  return shuffled;
}

/**
 * Select a random subset of items deterministically
 * 
 * @param array - The array to sample from
 * @param count - Number of items to select
 * @param randomFn - The deterministic random function
 * @returns A new array with the selected items
 */
export function deterministicSample<T>(
  array: T[],
  count: number,
  randomFn: () => number
): T[] {
  if (count >= array.length) {
    return [...array];
  }
  
  const shuffled = deterministicShuffle(array, randomFn);
  return shuffled.slice(0, count);
}

/**
 * Weighted random selection
 * 
 * @param items - Array of items with weight property
 * @param randomFn - The deterministic random function
 * @returns Selected item
 */
export function weightedRandomSelect<T extends { weight?: number }>(
  items: T[],
  randomFn: () => number
): T {
  if (items.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  
  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  
  if (totalWeight === 0) {
    // If no weights, select randomly
    const selected = items[Math.floor(randomFn() * items.length)];
    if (!selected) {
      throw new Error('Cannot select from empty array');
    }
    return selected;
  }
  
  // Select based on weight
  let random = randomFn() * totalWeight;
  
  for (const item of items) {
    random -= (item.weight || 1);
    if (random <= 0) {
      return item;
    }
  }
  
  // Fallback to last item
  const lastItem = items[items.length - 1];
  if (!lastItem) {
    throw new Error('Cannot select from empty array');
  }
  return lastItem;
}

/**
 * Generate a random integer between min and max (inclusive)
 * 
 * @param min - Minimum value
 * @param max - Maximum value
 * @param randomFn - The deterministic random function
 * @returns Random integer
 */
export function randomInt(
  min: number,
  max: number,
  randomFn: () => number
): number {
  return Math.floor(randomFn() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 * 
 * @param min - Minimum value
 * @param max - Maximum value
 * @param randomFn - The deterministic random function
 * @returns Random float
 */
export function randomFloat(
  min: number,
  max: number,
  randomFn: () => number
): number {
  return min + randomFn() * (max - min);
}

/**
 * Test function to verify deterministic behavior
 */
export function testDeterministicRandom(): void {
  const sessionId = 'test-session-123';
  const pageId = 'test-page-456';
  
  // Generate two random functions with the same context
  const random1 = getDeterministicRandom(sessionId, pageId, 'test-group', 'test-question', 'options');
  const random2 = getDeterministicRandom(sessionId, pageId, 'test-group', 'test-question', 'options');
  
  // They should produce the same sequence
  const sequence1 = Array.from({ length: 10 }, () => random1());
  const sequence2 = Array.from({ length: 10 }, () => random2());
  
  console.log('Random sequence 1:', sequence1);
  console.log('Random sequence 2:', sequence2);
  console.log('Sequences match:', JSON.stringify(sequence1) === JSON.stringify(sequence2));
  
  // Test shuffle
  const array = [1, 2, 3, 4, 5];
  const random3 = getDeterministicRandom(sessionId, pageId, 'shuffle-test');
  const shuffled1 = deterministicShuffle(array, random3);
  const random4 = getDeterministicRandom(sessionId, pageId, 'shuffle-test');
  const shuffled2 = deterministicShuffle(array, random4);
  
  console.log('Original array:', array);
  console.log('Shuffled 1:', shuffled1);
  console.log('Shuffled 2:', shuffled2);
  console.log('Shuffles match:', JSON.stringify(shuffled1) === JSON.stringify(shuffled2));
}
