import { prisma } from '@repo/database';
import { LoopSourceType } from '@prisma/client';

// Types for loop runtime
export interface LoopItem {
  key: string;
  label: string;
  attributes: Record<string, any>;
}

export interface LoopPlan {
  keys: string[];
  currentIndex: number;
  items: LoopItem[];
  isComplete: boolean;
}

export interface LoopContext {
  currentItem: LoopItem;
  currentIndex: number;
  totalItems: number;
  isLastIteration: boolean;
  isFirstIteration: boolean;
}

export interface SessionRenderState {
  loopBatteries?: Record<string, LoopPlan>;
  [key: string]: any;
}

/**
 * Loop Runtime Engine
 * Handles the generation and execution of loop plans for survey sessions
 */
export class LoopRuntimeEngine {
  private sessionId: string;
  private tenantId: string;
  private surveyId: string;

  constructor(sessionId: string, tenantId: string, surveyId: string) {
    this.sessionId = sessionId;
    this.tenantId = tenantId;
    this.surveyId = surveyId;
  }

  /**
   * Generate or retrieve loop plan for a specific battery
   */
  async getLoopPlan(batteryId: string, questionResponses: Record<string, any>): Promise<LoopPlan | null> {
    try {
      // Get current session render state
      const session = await prisma.surveySession.findFirst({
        where: { id: this.sessionId, tenantId: this.tenantId, surveyId: this.surveyId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const renderState: SessionRenderState = (session.renderState as any) || {};
      
      // Check if we already have a plan for this battery
      if (renderState.loopBatteries?.[batteryId]) {
        return renderState.loopBatteries[batteryId];
      }

      // Generate new plan
      const plan = await this.generateLoopPlan(batteryId, questionResponses);
      
      if (!plan) {
        return null;
      }

      // Save plan to session
      await this.saveLoopPlan(batteryId, plan);

      return plan;
    } catch (error) {
      console.error('Error getting loop plan:', error);
      return null;
    }
  }

  /**
   * Generate a new loop plan based on battery configuration
   */
  private async generateLoopPlan(batteryId: string, questionResponses: Record<string, any>): Promise<LoopPlan | null> {
    try {
      const battery = await prisma.loopBattery.findFirst({
        where: { 
          id: batteryId, 
          surveyId: this.surveyId, 
          tenantId: this.tenantId 
        },
        include: {
          sourceQuestion: {
            include: {
              options: true
            }
          },
          datasetItems: {
            where: { isActive: true },
            orderBy: { sortIndex: 'asc' }
          }
        }
      });

      if (!battery) {
        return null;
      }

      let items: LoopItem[] = [];

      if (battery.sourceType === LoopSourceType.ANSWER) {
        // Answer-driven loop: get items from user's responses
        items = await this.generateAnswerDrivenItems(battery, questionResponses);
      } else if (battery.sourceType === LoopSourceType.DATASET) {
        // Dataset-driven loop: get items from static dataset
        items = await this.generateDatasetDrivenItems(battery);
      }

      if (items.length === 0) {
        return null; // No items to loop over
      }

      // Apply randomization if enabled
      if (battery.randomize) {
        items = this.shuffleArray(items);
      }

      // Apply max items limit
      if (battery.maxItems && items.length > battery.maxItems) {
        items = items.slice(0, battery.maxItems);
      }

      const plan: LoopPlan = {
        keys: items.map(item => item.key),
        currentIndex: 0,
        items,
        isComplete: false
      };

      return plan;
    } catch (error) {
      console.error('Error generating loop plan:', error);
      return null;
    }
  }

  /**
   * Generate items from user's answers to source question
   */
  private async generateAnswerDrivenItems(battery: any, questionResponses: Record<string, any>): Promise<LoopItem[]> {
    if (!battery.sourceQuestion) {
      return [];
    }

    const sourceQuestionId = battery.sourceQuestion.id;
    const userAnswers = questionResponses[sourceQuestionId];

    if (!userAnswers || (Array.isArray(userAnswers) && userAnswers.length === 0)) {
      return []; // No answers, no loop items
    }

    const selectedValues = Array.isArray(userAnswers) ? userAnswers : [userAnswers];
    const items: LoopItem[] = [];

    for (const value of selectedValues) {
      // Find the option that matches this value
      const option = battery.sourceQuestion.options.find((opt: any) => opt.value === value);
      
      if (option) {
        items.push({
          key: value,
          label: option.labelTemplate,
          attributes: {
            value,
            label: option.labelTemplate
          }
        });
      }
    }

    return items;
  }

  /**
   * Generate items from static dataset
   */
  private async generateDatasetDrivenItems(battery: any): Promise<LoopItem[]> {
    return battery.datasetItems.map((item: any) => ({
      key: item.key,
      label: item.attributes?.label || item.key,
      attributes: item.attributes || {}
    }));
  }

  /**
   * Get current loop context for rendering
   */
  async getLoopContext(batteryId: string): Promise<LoopContext | null> {
    try {
      const plan = await this.getLoopPlan(batteryId, {});
      
      if (!plan || plan.items.length === 0) {
        return null;
      }

      const currentItem = plan.items[plan.currentIndex];
      if (!currentItem) {
        return null;
      }
      const totalItems = plan.items.length;

      return {
        currentItem,
        currentIndex: plan.currentIndex,
        totalItems,
        isLastIteration: plan.currentIndex === totalItems - 1,
        isFirstIteration: plan.currentIndex === 0
      };
    } catch (error) {
      console.error('Error getting loop context:', error);
      return null;
    }
  }

  /**
   * Advance to next loop iteration
   */
  async advanceLoop(batteryId: string): Promise<boolean> {
    try {
      const session = await prisma.surveySession.findFirst({
        where: { id: this.sessionId, tenantId: this.tenantId, surveyId: this.surveyId }
      });

      if (!session) {
        return false;
      }

      const renderState: SessionRenderState = (session.renderState as any) || {};
      const plan = renderState.loopBatteries?.[batteryId];

      if (!plan) {
        return false;
      }

      // Advance to next iteration
      plan.currentIndex++;
      plan.isComplete = plan.currentIndex >= plan.items.length;

      // Save updated plan
      await this.saveLoopPlan(batteryId, plan);

      return !plan.isComplete;
    } catch (error) {
      console.error('Error advancing loop:', error);
      return false;
    }
  }

  /**
   * Check if we're currently in a loop iteration
   */
  async isInLoop(batteryId: string): Promise<boolean> {
    try {
      const plan = await this.getLoopPlan(batteryId, {});
      return plan !== null && !plan.isComplete;
    } catch (error) {
      console.error('Error checking loop status:', error);
      return false;
    }
  }

  /**
   * Reset loop plan (useful when source question answers change)
   */
  async resetLoopPlan(batteryId: string, questionResponses: Record<string, any>): Promise<void> {
    try {
      // Clear existing plan
      await this.clearLoopPlan(batteryId);
      
      // Generate new plan
      await this.getLoopPlan(batteryId, questionResponses);
    } catch (error) {
      console.error('Error resetting loop plan:', error);
    }
  }

  /**
   * Save loop plan to session render state
   */
  private async saveLoopPlan(batteryId: string, plan: LoopPlan): Promise<void> {
    try {
      const session = await prisma.surveySession.findFirst({
        where: { id: this.sessionId, tenantId: this.tenantId, surveyId: this.surveyId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const renderState: SessionRenderState = (session.renderState as any) || {};
      
      if (!renderState.loopBatteries) {
        renderState.loopBatteries = {};
      }

      renderState.loopBatteries[batteryId] = plan;

      await prisma.surveySession.update({
        where: { id: this.sessionId },
        data: { renderState }
      });
    } catch (error) {
      console.error('Error saving loop plan:', error);
      throw error;
    }
  }

  /**
   * Clear loop plan from session
   */
  private async clearLoopPlan(batteryId: string): Promise<void> {
    try {
      const session = await prisma.surveySession.findFirst({
        where: { id: this.sessionId, tenantId: this.tenantId, surveyId: this.surveyId }
      });

      if (!session) {
        return;
      }

      const renderState: SessionRenderState = (session.renderState as any) || {};
      
      if (renderState.loopBatteries) {
        delete renderState.loopBatteries[batteryId];
      }

      await prisma.surveySession.update({
        where: { id: this.sessionId },
        data: { renderState }
      });
    } catch (error) {
      console.error('Error clearing loop plan:', error);
    }
  }

  /**
   * Utility: Shuffle array using Fisher-Yates algorithm
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
   * Resolve loop template variables
   */
  resolveLoopTemplate(template: string, context: LoopContext): string {
    if (!template || !context) {
      return template || '';
    }

    let resolved = template;

    // Replace loop variables
    resolved = resolved.replace(/\{\{loop\.key\}\}/g, context.currentItem.key);
    resolved = resolved.replace(/\{\{loop\.label\}\}/g, context.currentItem.label);
    resolved = resolved.replace(/\{\{loop\.index\}\}/g, String(context.currentIndex + 1));
    resolved = resolved.replace(/\{\{loop\.total\}\}/g, String(context.totalItems));

    // Replace custom attributes
    Object.entries(context.currentItem.attributes).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{loop\\.${key}\\}\\}`, 'g');
      resolved = resolved.replace(regex, String(value));
    });

    return resolved;
  }
}
