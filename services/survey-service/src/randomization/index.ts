import { PrismaClient } from '@prisma/client';

export interface RandomizationContext {
  surveyId: string;
  sessionId?: string;
  pageId?: string;
  questionId?: string;
}

export interface RandomizedOrder {
  type: 'page' | 'question' | 'option';
  originalOrder: string[];
  randomizedOrder: string[];
  orderMode: string;
  sessionId?: string;
}

export class RandomizationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get randomized question order for a page
   */
  async getRandomizedQuestionOrder(context: RandomizationContext): Promise<string[]> {
    if (!context.pageId) {
      throw new Error('Page ID is required for question randomization');
    }

    // Get page with questions
    const page = await this.prisma.surveyPage.findFirst({
      where: {
        id: context.pageId,
        surveyId: context.surveyId
      },
      include: {
        questions: {
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!page) {
      throw new Error('Page not found');
    }

    const questionIds = page.questions.map(q => q.id);

    // Check if we have a cached randomized order for this session
    if (context.sessionId) {
      const cachedOrder = await this.getCachedOrder(context.sessionId, 'question', context.pageId);
      if (cachedOrder) {
        return cachedOrder;
      }
    }

    // Apply randomization based on page's questionOrderMode
    let randomizedOrder: string[];

    switch (page.questionOrderMode) {
      case 'RANDOM':
        randomizedOrder = this.shuffleArray([...questionIds]);
        break;
      case 'GROUP_RANDOM':
        randomizedOrder = this.shuffleGroups(questionIds, page.questions);
        break;
      case 'WEIGHTED':
        randomizedOrder = this.weightedShuffle(questionIds, page.questions);
        break;
      case 'SEQUENTIAL':
      default:
        randomizedOrder = questionIds;
        break;
    }

    // Cache the randomized order for this session
    if (context.sessionId) {
      await this.cacheOrder(context.sessionId, 'question', context.pageId, randomizedOrder, page.questionOrderMode);
    }

    return randomizedOrder;
  }

  /**
   * Get randomized option order for a question
   */
  async getRandomizedOptionOrder(context: RandomizationContext): Promise<string[]> {
    if (!context.questionId) {
      throw new Error('Question ID is required for option randomization');
    }

    // Get question with options
    const question = await this.prisma.question.findFirst({
      where: {
        id: context.questionId,
        surveyId: context.surveyId
      },
      include: {
        options: {
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const optionIds = question.options.map(o => o.id);

    // Check if we have a cached randomized order for this session
    if (context.sessionId) {
      const cachedOrder = await this.getCachedOrder(context.sessionId, 'option', context.questionId);
      if (cachedOrder) {
        return cachedOrder;
      }
    }

    // Apply randomization based on question's optionOrderMode
    let randomizedOrder: string[];

    switch (question.optionOrderMode) {
      case 'RANDOM':
        randomizedOrder = this.shuffleArray([...optionIds]);
        break;
      case 'GROUP_RANDOM':
        randomizedOrder = this.shuffleOptionGroups(optionIds, question.options);
        break;
      case 'WEIGHTED':
        randomizedOrder = this.weightedOptionShuffle(optionIds, question.options);
        break;
      case 'SEQUENTIAL':
      default:
        randomizedOrder = optionIds;
        break;
    }

    // Cache the randomized order for this session
    if (context.sessionId) {
      await this.cacheOrder(context.sessionId, 'option', context.questionId, randomizedOrder, question.optionOrderMode);
    }

    return randomizedOrder;
  }

  /**
   * Simple array shuffle using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }

  /**
   * Shuffle groups while keeping group members together
   */
  private shuffleGroups(questionIds: string[], questions: any[]): string[] {
    // Group questions by groupKey (if they have one)
    const groups: { [key: string]: string[] } = {};
    const ungrouped: string[] = [];

    questions.forEach((question, index) => {
      const questionId = questionIds[index];
      if (!questionId) return;
      // For now, we'll implement a simple grouping by question type
      // In the future, we can add a groupKey field to questions
      const groupKey = question.type || 'ungrouped';
      
      if (groupKey === 'ungrouped') {
        ungrouped.push(questionId);
      } else {
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey]!.push(questionId);
      }
    });

    // Shuffle the groups
    const groupKeys = Object.keys(groups);
    const shuffledGroupKeys = this.shuffleArray(groupKeys);

    // Combine shuffled groups with ungrouped items
    const result: string[] = [];
    shuffledGroupKeys.forEach(groupKey => {
      const group = groups[groupKey];
      if (group) {
        result.push(...group);
      }
    });
    result.push(...ungrouped);

    return result;
  }

  /**
   * Shuffle option groups while keeping group members together
   */
  private shuffleOptionGroups(optionIds: string[], options: any[]): string[] {
    // Group options by groupKey
    const groups: { [key: string]: string[] } = {};
    const ungrouped: string[] = [];

    options.forEach((option, index) => {
      const optionId = optionIds[index];
      if (!optionId) return;
      const groupKey = option.groupKey || 'ungrouped';
      
      if (groupKey === 'ungrouped') {
        ungrouped.push(optionId);
      } else {
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey]!.push(optionId);
      }
    });

    // Shuffle the groups
    const groupKeys = Object.keys(groups);
    const shuffledGroupKeys = this.shuffleArray(groupKeys);

    // Combine shuffled groups with ungrouped items
    const result: string[] = [];
    shuffledGroupKeys.forEach(groupKey => {
      const group = groups[groupKey];
      if (group) {
        result.push(...group);
      }
    });
    result.push(...ungrouped);

    return result;
  }

  /**
   * Weighted shuffle for questions (placeholder - would need weight field on questions)
   */
  private weightedShuffle(questionIds: string[], questions: any[]): string[] {
    // For now, just do regular shuffle
    // In the future, implement weighted randomization based on question.weight
    return this.shuffleArray([...questionIds]);
  }

  /**
   * Weighted shuffle for options
   */
  private weightedOptionShuffle(optionIds: string[], options: any[]): string[] {
    const weightedOptions: { id: string; weight: number }[] = [];
    
    options.forEach((option, index) => {
      const optionId = optionIds[index];
      if (!optionId) return;
      const weight = option.weight || 1; // Default weight of 1
      weightedOptions.push({
        id: optionId,
        weight: weight
      });
    });

    // Sort by weight (higher weight = higher priority)
    weightedOptions.sort((a, b) => b.weight - a.weight);
    
    return weightedOptions.map(opt => opt.id);
  }

  /**
   * Cache randomized order in session
   */
  private async cacheOrder(
    sessionId: string, 
    type: 'question' | 'option', 
    entityId: string, 
    order: string[], 
    mode: string
  ): Promise<void> {
    try {
      const session = await this.prisma.surveySession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        return;
      }

      const renderState = session.renderState as any || {};
      const cacheKey = `${type}_${entityId}`;
      
      renderState[cacheKey] = {
        order,
        mode,
        timestamp: new Date().toISOString()
      };

      await this.prisma.surveySession.update({
        where: { id: sessionId },
        data: { renderState }
      });
    } catch (error) {
      console.error('Error caching randomized order:', error);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Get cached randomized order from session
   */
  private async getCachedOrder(
    sessionId: string, 
    type: 'question' | 'option', 
    entityId: string
  ): Promise<string[] | null> {
    try {
      const session = await this.prisma.surveySession.findUnique({
        where: { id: sessionId }
      });

      if (!session || !session.renderState) {
        return null;
      }

      const renderState = session.renderState as any;
      const cacheKey = `${type}_${entityId}`;
      const cached = renderState[cacheKey];

      if (cached && cached.order) {
        return cached.order;
      }

      return null;
    } catch (error) {
      console.error('Error getting cached randomized order:', error);
      return null;
    }
  }
}
