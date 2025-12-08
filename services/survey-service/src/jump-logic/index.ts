import { PrismaClient } from '@prisma/client';
import { ExpressionEvaluator } from '../expressions';

export interface JumpLogicContext {
  surveyId: string;
  answers: Record<string, any>;
  currentQuestionId?: string;
  currentPageId?: string;
}

export interface JumpResult {
  shouldJump: boolean;
  destination?: {
    type: 'question' | 'page';
    id: string;
  };
  priority: number;
}

export class JumpLogicEvaluator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Evaluate question jumps for a specific question
   */
  async evaluateQuestionJumps(context: JumpLogicContext): Promise<JumpResult | null> {
    if (!context.currentQuestionId) {
      return null;
    }

    // Get all question jumps for this question, ordered by priority
    const questionJumps = await this.prisma.questionJump.findMany({
      where: {
        fromQuestionId: context.currentQuestionId,
        surveyId: context.surveyId
      },
      include: {
        condition: true, // Include the expression
        toQuestion: true,
        toPage: true
      },
      orderBy: {
        priority: 'asc' // Lower priority number = higher precedence
      }
    });

    // Evaluate each jump condition in priority order
    for (const jump of questionJumps) {
      const shouldJump = await this.evaluateJumpCondition(jump.condition?.dsl, context.answers);
      
      if (shouldJump) {
        const destination = jump.toQuestionId 
          ? { type: 'question' as const, id: jump.toQuestionId }
          : jump.toPageId 
          ? { type: 'page' as const, id: jump.toPageId }
          : null;

        if (destination) {
          return {
            shouldJump: true,
            destination,
            priority: jump.priority
          };
        }
      }
    }

    return null;
  }

  /**
   * Evaluate page jumps for a specific page
   */
  async evaluatePageJumps(context: JumpLogicContext): Promise<JumpResult | null> {
    if (!context.currentPageId) {
      return null;
    }

    // Get all page jumps for this page, ordered by priority
    const pageJumps = await this.prisma.pageJump.findMany({
      where: {
        fromPageId: context.currentPageId,
        surveyId: context.surveyId
      },
      include: {
        condition: true, // Include the expression
        toPage: true
      },
      orderBy: {
        priority: 'asc'
      }
    });

    // Evaluate each jump condition in priority order
    for (const jump of pageJumps) {
      const shouldJump = await this.evaluateJumpCondition(jump.condition?.dsl, context.answers);
      
      if (shouldJump) {
        return {
          shouldJump: true,
          destination: {
            type: 'page',
            id: jump.toPageId
          },
          priority: jump.priority
        };
      }
    }

    return null;
  }

  /**
   * Get the next question/page based on jump logic
   */
  async getNextDestination(context: JumpLogicContext): Promise<JumpResult | null> {
    // First check question-level jumps (higher precedence)
    if (context.currentQuestionId) {
      const questionJump = await this.evaluateQuestionJumps(context);
      if (questionJump?.shouldJump) {
        return questionJump;
      }
    }

    // Then check page-level jumps
    if (context.currentPageId) {
      const pageJump = await this.evaluatePageJumps(context);
      if (pageJump?.shouldJump) {
        return pageJump;
      }
    }

    return null;
  }

  /**
   * Test a specific jump condition
   */
  async testJumpCondition(jumpId: string, jumpType: 'question' | 'page', testAnswers: Record<string, any>): Promise<{
    result: boolean;
    error?: string;
  }> {
    try {
      let condition: string | null = null;

      if (jumpType === 'question') {
        const jump = await this.prisma.questionJump.findUnique({
          where: { id: jumpId },
          include: { condition: true }
        });
        condition = jump?.condition?.dsl || null;
      } else {
        const jump = await this.prisma.pageJump.findUnique({
          where: { id: jumpId },
          include: { condition: true }
        });
        condition = jump?.condition?.dsl || null;
      }

      if (!condition) {
        return { result: true }; // No condition means always jump
      }

      const result = await this.evaluateJumpCondition(condition, testAnswers);
      return { result };
    } catch (error) {
      return {
        result: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Evaluate a jump condition expression
   */
  private async evaluateJumpCondition(dsl: string | null | undefined, answers: Record<string, any>): Promise<boolean> {
    if (!dsl) {
      return true; // No condition means always jump
    }

    try {
      // Create expression evaluator with context
      const expressionEvaluator = new ExpressionEvaluator({
        answers,
        questions: [] // Questions not needed for basic evaluation
      });
      return expressionEvaluator.evaluate(dsl);
    } catch (error) {
      console.error('Jump condition evaluation error:', error);
      return false; // Error in evaluation means don't jump
    }
  }

  /**
   * Get all jumps for a survey (for management/debugging)
   */
  async getSurveyJumps(surveyId: string) {
    const [questionJumps, pageJumps] = await Promise.all([
      this.prisma.questionJump.findMany({
        where: { surveyId },
        include: {
          fromQuestion: {
            select: { id: true, variableName: true, titleTemplate: true }
          },
          toQuestion: {
            select: { id: true, variableName: true, titleTemplate: true }
          },
          toPage: {
            select: { id: true, titleTemplate: true, index: true }
          },
          condition: {
            select: { id: true, dsl: true, description: true }
          }
        },
        orderBy: [
          { fromQuestionId: 'asc' },
          { priority: 'asc' }
        ]
      }),
      this.prisma.pageJump.findMany({
        where: { surveyId },
        include: {
          fromPage: {
            select: { id: true, titleTemplate: true, index: true }
          },
          toPage: {
            select: { id: true, titleTemplate: true, index: true }
          },
          condition: {
            select: { id: true, dsl: true, description: true }
          }
        },
        orderBy: [
          { fromPageId: 'asc' },
          { priority: 'asc' }
        ]
      })
    ]);

    return {
      questionJumps,
      pageJumps
    };
  }
}
