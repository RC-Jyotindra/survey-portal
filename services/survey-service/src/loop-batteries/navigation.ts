import { prisma } from '@repo/database';
import { LoopRuntimeEngine, LoopContext } from './runtime-engine';

/**
 * Loop Navigation Engine
 * Handles page navigation within loop batteries
 */
export class LoopNavigationEngine {
  private runtimeEngine: LoopRuntimeEngine;
  private sessionId: string;
  private tenantId: string;
  private surveyId: string;

  constructor(sessionId: string, tenantId: string, surveyId: string) {
    this.sessionId = sessionId;
    this.tenantId = tenantId;
    this.surveyId = surveyId;
    this.runtimeEngine = new LoopRuntimeEngine(sessionId, tenantId, surveyId);
  }

  /**
   * Check if a page is part of a loop battery
   */
  async isPageInLoop(pageId: string): Promise<{ batteryId: string; isStartPage: boolean; isEndPage: boolean } | null> {
    try {
      const battery = await prisma.loopBattery.findFirst({
        where: {
          surveyId: this.surveyId,
          tenantId: this.tenantId,
          OR: [
            { startPageId: pageId },
            { endPageId: pageId }
          ]
        }
      });

      if (!battery) {
        return null;
      }

      return {
        batteryId: battery.id,
        isStartPage: battery.startPageId === pageId,
        isEndPage: battery.endPageId === pageId
      };
    } catch (error) {
      console.error('Error checking if page is in loop:', error);
      return null;
    }
  }

  /**
   * Get the loop battery that contains a page
   */
  async getLoopBatteryForPage(pageId: string): Promise<any | null> {
    try {
      const battery = await prisma.loopBattery.findFirst({
        where: {
          surveyId: this.surveyId,
          tenantId: this.tenantId,
          startPageId: { lte: pageId },
          endPageId: { gte: pageId }
        },
        include: {
          startPage: true,
          endPage: true,
          sourceQuestion: {
            include: {
              options: true
            }
          }
        }
      });

      return battery;
    } catch (error) {
      console.error('Error getting loop battery for page:', error);
      return null;
    }
  }

  /**
   * Handle entering a loop battery (start page)
   */
  async handleEnterLoop(batteryId: string, questionResponses: Record<string, any>): Promise<{
    shouldEnter: boolean;
    loopContext?: LoopContext;
    nextPageId?: string;
  }> {
    try {
      const plan = await this.runtimeEngine.getLoopPlan(batteryId, questionResponses);
      
      if (!plan || plan.items.length === 0) {
        // No items to loop over, skip the entire loop battery
        const battery = await prisma.loopBattery.findFirst({
          where: { id: batteryId }
        });
        
        return {
          shouldEnter: false,
          nextPageId: battery?.endPageId // Skip to after the loop
        };
      }

      const loopContext = await this.runtimeEngine.getLoopContext(batteryId);
      
      return {
        shouldEnter: true,
        loopContext: loopContext || undefined
      };
    } catch (error) {
      console.error('Error handling loop entry:', error);
      return { shouldEnter: false };
    }
  }

  /**
   * Handle leaving a loop battery (end page)
   */
  async handleExitLoop(batteryId: string): Promise<{
    shouldContinue: boolean;
    nextPageId?: string;
    loopContext?: LoopContext;
  }> {
    try {
      const hasMoreIterations = await this.runtimeEngine.advanceLoop(batteryId);
      
      if (hasMoreIterations) {
        // More iterations to go, return to start page
        const battery = await prisma.loopBattery.findFirst({
          where: { id: batteryId }
        });
        
        const loopContext = await this.runtimeEngine.getLoopContext(batteryId);
        
        return {
          shouldContinue: true,
          nextPageId: battery?.startPageId,
          loopContext: loopContext || undefined
        };
      } else {
        // Loop complete, continue to next page after the loop
        const battery = await prisma.loopBattery.findFirst({
          where: { id: batteryId },
          include: {
            endPage: {
              include: {
                survey: {
                  include: {
                    pages: {
                      orderBy: { index: 'asc' }
                    }
                  }
                }
              }
            }
          }
        });

        if (!battery) {
          return { shouldContinue: false };
        }

        // Find the next page after the loop
        const nextPage = battery.endPage.survey.pages.find(
          page => page.index > battery.endPage.index
        );

        return {
          shouldContinue: false,
          nextPageId: nextPage?.id
        };
      }
    } catch (error) {
      console.error('Error handling loop exit:', error);
      return { shouldContinue: false };
    }
  }

  /**
   * Get the next page in the survey flow, considering loops
   */
  async getNextPage(currentPageId: string, questionResponses: Record<string, any>): Promise<{
    nextPageId?: string;
    loopContext?: LoopContext;
    isLoopIteration?: boolean;
  }> {
    try {
      // Check if current page is part of a loop
      const loopInfo = await this.isPageInLoop(currentPageId);
      
      if (loopInfo) {
        if (loopInfo.isEndPage) {
          // We're at the end of a loop, handle exit
          const exitResult = await this.handleExitLoop(loopInfo.batteryId);
          
          if (exitResult.shouldContinue) {
            return {
              nextPageId: exitResult.nextPageId,
              loopContext: exitResult.loopContext,
              isLoopIteration: true
            };
          } else {
            return {
              nextPageId: exitResult.nextPageId,
              isLoopIteration: false
            };
          }
        } else if (loopInfo.isStartPage) {
          // We're at the start of a loop, handle entry
          const entryResult = await this.handleEnterLoop(loopInfo.batteryId, questionResponses);
          
          if (entryResult.shouldEnter) {
            return {
              nextPageId: currentPageId, // Stay on current page but with loop context
              loopContext: entryResult.loopContext,
              isLoopIteration: true
            };
          } else {
            return {
              nextPageId: entryResult.nextPageId,
              isLoopIteration: false
            };
          }
        }
      }

      // Regular page navigation - get next page in sequence
      const currentPage = await prisma.surveyPage.findFirst({
        where: { id: currentPageId, surveyId: this.surveyId, tenantId: this.tenantId },
        include: {
          survey: {
            include: {
              pages: {
                orderBy: { index: 'asc' }
              }
            }
          }
        }
      });

      if (!currentPage) {
        return {};
      }

      const nextPage = currentPage.survey.pages.find(
        page => page.index === currentPage.index + 1
      );

      return {
        nextPageId: nextPage?.id
      };
    } catch (error) {
      console.error('Error getting next page:', error);
      return {};
    }
  }

  /**
   * Get the previous page in the survey flow, considering loops
   */
  async getPreviousPage(currentPageId: string): Promise<{
    previousPageId?: string;
    loopContext?: LoopContext;
    isLoopIteration?: boolean;
  }> {
    try {
      // Check if current page is part of a loop
      const loopInfo = await this.isPageInLoop(currentPageId);
      
      if (loopInfo) {
        if (loopInfo.isStartPage) {
          // We're at the start of a loop, go to previous page before the loop
          const battery = await prisma.loopBattery.findFirst({
            where: { id: loopInfo.batteryId },
            include: {
              startPage: {
                include: {
                  survey: {
                    include: {
                      pages: {
                        orderBy: { index: 'asc' }
                      }
                    }
                  }
                }
              }
            }
          });

          if (battery) {
            const previousPage = battery.startPage.survey.pages.find(
              page => page.index === battery.startPage.index - 1
            );

            return {
              previousPageId: previousPage?.id,
              isLoopIteration: false
            };
          }
        } else if (loopInfo.isEndPage) {
          // We're at the end of a loop, go to start page with current loop context
          const battery = await prisma.loopBattery.findFirst({
            where: { id: loopInfo.batteryId }
          });

          if (battery) {
            const loopContext = await this.runtimeEngine.getLoopContext(loopInfo.batteryId);
            
            return {
              previousPageId: battery.startPageId,
              loopContext: loopContext || undefined,
              isLoopIteration: true
            };
          }
        }
      }

      // Regular page navigation - get previous page in sequence
      const currentPage = await prisma.surveyPage.findFirst({
        where: { id: currentPageId, surveyId: this.surveyId, tenantId: this.tenantId },
        include: {
          survey: {
            include: {
              pages: {
                orderBy: { index: 'asc' }
              }
            }
          }
        }
      });

      if (!currentPage) {
        return {};
      }

      const previousPage = currentPage.survey.pages.find(
        page => page.index === currentPage.index - 1
      );

      return {
        previousPageId: previousPage?.id
      };
    } catch (error) {
      console.error('Error getting previous page:', error);
      return {};
    }
  }

  /**
   * Reset all loop plans when source question answers change
   */
  async resetAllLoops(questionResponses: Record<string, any>): Promise<void> {
    try {
      const batteries = await prisma.loopBattery.findMany({
        where: { surveyId: this.surveyId, tenantId: this.tenantId }
      });

      for (const battery of batteries) {
        await this.runtimeEngine.resetLoopPlan(battery.id, questionResponses);
      }
    } catch (error) {
      console.error('Error resetting all loops:', error);
    }
  }

  /**
   * Get loop progress information for display
   */
  async getLoopProgress(batteryId: string): Promise<{
    currentIteration: number;
    totalIterations: number;
    progress: number;
    currentItem: any;
  } | null> {
    try {
      const loopContext = await this.runtimeEngine.getLoopContext(batteryId);
      
      if (!loopContext) {
        return null;
      }

      return {
        currentIteration: loopContext.currentIndex + 1,
        totalIterations: loopContext.totalItems,
        progress: ((loopContext.currentIndex + 1) / loopContext.totalItems) * 100,
        currentItem: loopContext.currentItem
      };
    } catch (error) {
      console.error('Error getting loop progress:', error);
      return null;
    }
  }
}
