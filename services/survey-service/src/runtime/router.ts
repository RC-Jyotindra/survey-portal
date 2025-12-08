/**
 * Router Engine
 * 
 * Handles the "Route" step of the runtime engine:
 * - Check QuestionJump → evaluate by priority (first true wins)
 * - Else check PageJump
 * - Else → next visible page
 * - Loop manager: if end page and more items → jump back to start
 */

import { PrismaClient } from '@prisma/client';
import { evaluateExpression } from './dsl';

export interface RoutingContext {
  sessionId: string;
  tenantId: string;
  surveyId: string;
  currentPageId: string;
  currentQuestionId?: string;
  answers: Map<string, any>;
  loopContext?: Map<string, any>;
  questionIdMap?: Map<string, string>;
}

export interface RoutingResult {
  nextPageId?: string;
  nextQuestionId?: string;
  isComplete: boolean;
  isLooping: boolean;
  isTerminated: boolean;
  terminationReason?: string;
  loopIteration?: number;
  loopItem?: any;
}

export interface LoopState {
  batteryId: string;
  currentIteration: number;
  totalItems: number;
  currentItem?: any;
  startPageId: string;
  endPageId: string;
}

/**
 * Determine the next page/question to navigate to
 */
export async function routeNext(
  prisma: PrismaClient,
  context: RoutingContext
): Promise<RoutingResult> {
  const { sessionId, tenantId, surveyId, currentPageId, currentQuestionId, answers, loopContext, questionIdMap } = context;

  // First, check if we're in a loop and need to continue
  const loopResult = await checkLoopContinuation(prisma, context);
  if (loopResult.isLooping) {
    return loopResult;
  }

  // Check question-level jumps first (if we have a current question)
  if (currentQuestionId) {
    // First check for termination conditions
    const terminationResult = await checkQuestionTermination(
      prisma,
      currentQuestionId,
      answers,
      loopContext,
      questionIdMap
    );
    
    if (terminationResult.isTerminated) {
      return {
        isComplete: false,
        isLooping: false,
        isTerminated: true,
        terminationReason: terminationResult.terminationReason
      };
    }

    const questionJumpResult = await checkQuestionJumps(
      prisma,
      currentQuestionId,
      answers,
      loopContext,
      questionIdMap
    );
    
    if (questionJumpResult.nextPageId || questionJumpResult.nextQuestionId) {
      return {
        ...questionJumpResult,
        isComplete: false,
        isLooping: false,
        isTerminated: false
      };
    }
  }

  // Check page-level jumps
  const pageJumpResult = await checkPageJumps(
    prisma,
    currentPageId,
    answers,
    loopContext,
    questionIdMap
  );
  
  if (pageJumpResult.nextPageId) {
    return {
      ...pageJumpResult,
      isComplete: false,
      isLooping: false,
      isTerminated: false
    };
  }

  // Default: go to next visible page
  const nextPageResult = await getNextVisiblePage(prisma, context);
  
  return {
    ...nextPageResult,
    isComplete: nextPageResult.isComplete,
    isLooping: false,
    isTerminated: false
  };
}

/**
 * Check if we should continue a loop iteration
 */
async function checkLoopContinuation(
  prisma: PrismaClient,
  context: RoutingContext
): Promise<RoutingResult> {
  const { sessionId, surveyId, currentPageId } = context;

  // Get current loop state from session
  const session = await prisma.surveySession.findUnique({
    where: { id: sessionId },
    select: { renderState: true }
  });

  if (!session?.renderState || typeof session.renderState !== 'object' || !session.renderState) {
    return { isComplete: false, isLooping: false, isTerminated: false };
  }

  const renderState = session.renderState as any;
  if (!renderState.loopState) {
    return { isComplete: false, isLooping: false, isTerminated: false };
  }

  const loopState: LoopState = renderState.loopState;
  
  // Check if we're at the end page of a loop
  if (currentPageId === loopState.endPageId) {
    // Check if there are more items to iterate
    if (loopState.currentIteration < loopState.totalItems - 1) {
      // Continue to next iteration
      const nextIteration = loopState.currentIteration + 1;
      
      // Get next item (this would need to be implemented based on loop source)
      const nextItem = await getNextLoopItem(prisma, loopState.batteryId, nextIteration);
      
      // Update loop state
      const updatedLoopState = {
        ...loopState,
        currentIteration: nextIteration,
        currentItem: nextItem
      };

      await prisma.surveySession.update({
        where: { id: sessionId },
        data: {
          renderState: {
            ...(session.renderState && typeof session.renderState === 'object' ? session.renderState as any : {}),
            loopState: updatedLoopState
          }
        }
      });

      return {
        nextPageId: loopState.startPageId,
        isComplete: false,
        isLooping: true,
        isTerminated: false,
        loopIteration: nextIteration,
        loopItem: nextItem
      };
    } else {
      // Loop is complete, clear loop state
      await prisma.surveySession.update({
        where: { id: sessionId },
        data: {
          renderState: {
            ...(session.renderState && typeof session.renderState === 'object' ? session.renderState as any : {}),
            loopState: null
          }
        }
      });
    }
  }

  return { isComplete: false, isLooping: false, isTerminated: false };
}

/**
 * Check if a question should terminate the survey
 */
export async function checkQuestionTermination(
  prisma: PrismaClient,
  questionId: string,
  answers: Map<string, any>,
  loopContext?: Map<string, any>,
  questionIdMap?: Map<string, string>
): Promise<{ isTerminated: boolean; terminationReason?: string }> {
  console.log(`[ROUTER] checkQuestionTermination: questionId='${questionId}'`);
  
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { terminateIf: true }
  });

  if (!question?.terminateIf) {
    console.log(`[ROUTER] No termination logic found for questionId: '${questionId}'`);
    return { isTerminated: false };
  }

  console.log(`[ROUTER] Evaluating termination DSL: '${question.terminateIf.dsl}'`);
  const shouldTerminate = await evaluateExpression(
    question.terminateIf.dsl,
    answers,
    loopContext,
    undefined,
    questionIdMap
  );

  if (shouldTerminate) {
    console.log(`[ROUTER] Termination condition met for questionId: '${questionId}', reason: '${question.terminateIf.description}'`);
    return {
      isTerminated: true,
      terminationReason: question.terminateIf.description || 'Survey terminated based on answer'
    };
  }

  console.log(`[ROUTER] Termination condition not met for questionId: '${questionId}'`);
  return { isTerminated: false };
}

/**
 * Check question-level jumps
 */
async function checkQuestionJumps(
  prisma: PrismaClient,
  questionId: string,
  answers: Map<string, any>,
  loopContext?: Map<string, any>,
  questionIdMap?: Map<string, string>
): Promise<{ nextPageId?: string; nextQuestionId?: string }> {
  console.log(`[ROUTER] checkQuestionJumps: questionId='${questionId}'`);
  
  const jumps = await prisma.questionJump.findMany({
    where: { fromQuestionId: questionId },
    include: { condition: true },
    orderBy: { priority: 'asc' }
  });

  console.log(`[ROUTER] Found ${jumps.length} jump rules for questionId: '${questionId}'`);

  for (const jump of jumps) {
    if (jump.condition) {
      console.log(`[ROUTER] Evaluating jump condition: '${jump.condition.dsl}' (priority: ${jump.priority})`);
      const shouldJump = await evaluateExpression(
        jump.condition.dsl,
        answers,
        loopContext,
        undefined,
        questionIdMap
      );
      
      if (shouldJump) {
        console.log(`[ROUTER] Jump condition met, jumping to pageId: '${jump.toPageId}', questionId: '${jump.toQuestionId}'`);
        return {
          nextPageId: jump.toPageId || undefined,
          nextQuestionId: jump.toQuestionId || undefined
        };
      } else {
        console.log(`[ROUTER] Jump condition not met, continuing to next rule`);
      }
    } else {
      // No condition means always jump
      console.log(`[ROUTER] No condition jump (always jump), jumping to pageId: '${jump.toPageId}', questionId: '${jump.toQuestionId}'`);
      return {
        nextPageId: jump.toPageId || undefined,
        nextQuestionId: jump.toQuestionId || undefined
      };
    }
  }

  console.log(`[ROUTER] No jump conditions met for questionId: '${questionId}'`);
  return {};
}

/**
 * Check page-level jumps
 */
async function checkPageJumps(
  prisma: PrismaClient,
  pageId: string,
  answers: Map<string, any>,
  loopContext?: Map<string, any>,
  questionIdMap?: Map<string, string>
): Promise<{ nextPageId?: string }> {
  const jumps = await prisma.pageJump.findMany({
    where: { fromPageId: pageId },
    include: { condition: true },
    orderBy: { priority: 'asc' }
  });

  for (const jump of jumps) {
    if (jump.condition) {
      const shouldJump = await evaluateExpression(
        jump.condition.dsl,
        answers,
        loopContext,
        undefined,
        questionIdMap
      );
      
      if (shouldJump) {
        return { nextPageId: jump.toPageId };
      }
    } else {
      // No condition means always jump
      return { nextPageId: jump.toPageId };
    }
  }

  return {};
}

/**
 * Get the next visible page in sequence
 */
async function getNextVisiblePage(
  prisma: PrismaClient,
  context: RoutingContext
): Promise<{ nextPageId?: string; isComplete: boolean }> {
  const { tenantId, surveyId, currentPageId, answers, loopContext, questionIdMap } = context;

  // Get current page index
  const currentPage = await prisma.surveyPage.findUnique({
    where: { id: currentPageId },
    select: { index: true }
  });

  if (!currentPage) {
    return { isComplete: true };
  }

  // Get all pages after current page, ordered by index
  const nextPages = await prisma.surveyPage.findMany({
    where: {
      surveyId,
      tenantId,
      index: { gt: currentPage.index }
    },
    include: { visibleIf: true },
    orderBy: { index: 'asc' }
  });

  // Find the first visible page
  for (const page of nextPages) {
    const isVisible = page.visibleIf
      ? await evaluateExpression(page.visibleIf.dsl, answers, loopContext, undefined, questionIdMap)
      : true;

    if (isVisible) {
      return { nextPageId: page.id, isComplete: false };
    }
  }

  // No more visible pages
  return { isComplete: true };
}

/**
 * Get the next item in a loop iteration
 */
async function getNextLoopItem(
  prisma: PrismaClient,
  batteryId: string,
  iteration: number
): Promise<any> {
  const battery = await prisma.loopBattery.findUnique({
    where: { id: batteryId },
    include: { datasetItems: { where: { isActive: true }, orderBy: { sortIndex: 'asc' } } }
  });

  if (!battery) {
    return null;
  }

  if (battery.sourceType === 'DATASET') {
    // Return dataset item
    return battery.datasetItems[iteration] || null;
  } else if (battery.sourceType === 'ANSWER') {
    // This would need to be implemented based on the source question
    // For now, return a placeholder
    return { iteration, sourceType: 'ANSWER' };
  }

  return null;
}

/**
 * Start a loop iteration
 */
export async function startLoop(
  prisma: PrismaClient,
  sessionId: string,
  batteryId: string,
  items: any[]
): Promise<void> {
  const battery = await prisma.loopBattery.findUnique({
    where: { id: batteryId }
  });

  if (!battery) {
    throw new Error(`Loop battery ${batteryId} not found`);
  }

  const loopState: LoopState = {
    batteryId,
    currentIteration: 0,
    totalItems: items.length,
    currentItem: items[0],
    startPageId: battery.startPageId,
    endPageId: battery.endPageId
  };

  // Update session with loop state
  const session = await prisma.surveySession.findUnique({
    where: { id: sessionId },
    select: { renderState: true }
  });

  await prisma.surveySession.update({
    where: { id: sessionId },
    data: {
      renderState: {
        ...(session?.renderState && typeof session.renderState === 'object' ? session.renderState as any : {}),
        loopState
      }
    }
  });
}

/**
 * Get current loop context variables
 */
export function getLoopContext(loopState: LoopState): Map<string, any> {
  const context = new Map<string, any>();
  
  if (loopState.currentItem) {
    // Add loop item attributes to context
    if (typeof loopState.currentItem === 'object') {
      for (const [key, value] of Object.entries(loopState.currentItem)) {
        context.set(`loop.${key}`, value);
      }
    }
    
    // Add iteration info
    context.set('loop.iteration', loopState.currentIteration + 1);
    context.set('loop.total', loopState.totalItems);
    context.set('loop.isFirst', loopState.currentIteration === 0);
    context.set('loop.isLast', loopState.currentIteration === loopState.totalItems - 1);
  }
  
  return context;
}

/**
 * Check if a page is part of an active loop
 */
export function isPageInLoop(pageId: string, loopState?: LoopState): boolean {
  if (!loopState) return false;
  return pageId === loopState.startPageId || pageId === loopState.endPageId;
}

/**
 * Get the first page of a survey
 */
export async function getFirstPage(
  prisma: PrismaClient,
  surveyId: string,
  tenantId: string,
  answers: Map<string, any>,
  loopContext?: Map<string, any>,
  questionIdMap?: Map<string, string>
): Promise<string | null> {
  const pages = await prisma.surveyPage.findMany({
    where: { surveyId, tenantId },
    include: { visibleIf: true },
    orderBy: { index: 'asc' }
  });

  for (const page of pages) {
    const isVisible = page.visibleIf
      ? await evaluateExpression(page.visibleIf.dsl, answers, loopContext, undefined, questionIdMap)
      : true;

    if (isVisible) {
      return page.id;
    }
  }

  return null;
}
