/**
 * Preview Logic Engine
 * 
 * Handles all survey logic evaluation in the preview:
 * - Conditional Logic (show/hide questions based on answers)
 * - Jump Logic (skip to specific pages/questions)
 * - Display Logic (modify question appearance)
 * - Option Visibility Logic (show/hide specific options)
 * - Randomization (shuffle questions/options)
 */

import { PageWithQuestions } from '@/lib/api/pages-api';
import { QuestionWithDetails } from '@/lib/api/questions-api';

// Types for expressions and logic
export interface ExpressionData {
  id: string;
  dsl: string;
  description?: string;
}

export interface JumpDestination {
  type: 'page' | 'question' | 'end';
  id?: string;
  pageIndex?: number;
}

export interface JumpRule {
  id: string;
  fromQuestionId: string;
  toPageId?: string;
  toQuestionId?: string;
  condition?: ExpressionData;
  priority: number;
}

export interface LogicEvaluationContext {
  questionResponses: Record<string, any>;
  embeddedData?: Record<string, any>;
  allQuestions: QuestionWithDetails[];
  allPages: PageWithQuestions[];
  currentPageIndex: number;
}

export class PreviewLogicEngine {
  private context: LogicEvaluationContext;
  private randomizationCache: Map<string, any[]> = new Map();

  constructor(context: LogicEvaluationContext) {
    this.context = context;
  }

  updateContext(context: Partial<LogicEvaluationContext>) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Evaluates a DSL expression against current responses
   */
  evaluateExpression(dsl: string): boolean {
    console.log(`[PREVIEW_DSL] evaluateExpression: '${dsl}'`);
    
    if (!dsl) {
      console.log(`[PREVIEW_DSL] Empty DSL, returning true`);
      return true;
    }

    try {
      // Simple expression parser for common survey logic patterns
      const result = this.parseAndEvaluateExpression(dsl);
      console.log(`[PREVIEW_DSL] evaluateExpression result: ${result}`);
      return result;
    } catch (error) {
      console.warn('[PREVIEW_DSL] Expression evaluation failed:', dsl, error);
      return true; // Fail-safe: show by default
    }
  }

  /**
   * Parse and evaluate DSL expressions
   */
  private parseAndEvaluateExpression(dsl: string): boolean {
    const responses = this.context.questionResponses;
    const embeddedData = this.context.embeddedData || {};

    // Handle different expression patterns
    
    // Pattern: equals(answer('Q1'), 'value')
    const equalsMatch = dsl.match(/equals\(answer\('([^']+)'\),\s*'([^']*)'\)/);
    if (equalsMatch) {
      const [, questionVar, value] = equalsMatch;
      
      if (!questionVar || value === undefined) return false;
      // Find question by variable name and get its ID
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      
      if (question) {
        const actualResponse = responses[question.id];
        
        // Handle array responses (convert single-element arrays to strings)
        let responseValue = actualResponse;
        if (Array.isArray(actualResponse) && actualResponse.length === 1) {
          responseValue = actualResponse[0];
        }
        
        return responseValue === value;
      }
      // Fallback to direct match
      let fallbackResponse = responses[questionVar];
      if (Array.isArray(fallbackResponse) && fallbackResponse.length === 1) {
        fallbackResponse = fallbackResponse[0];
      }
      return fallbackResponse === value;
    }

    // Pattern: notEquals(answer('Q1'), 'value')
    const notEqualsMatch = dsl.match(/notEquals\(answer\('([^']+)'\),\s*'([^']*)'\)/);
    if (notEqualsMatch) {
      const [, questionVar, value] = notEqualsMatch;
      
      if (!questionVar || value === undefined) return false;
      // Find question by variable name and get its ID
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      
      if (question) {
        const actualResponse = responses[question.id];
        
        // Handle array responses (convert single-element arrays to strings)
        let responseValue = actualResponse;
        if (Array.isArray(actualResponse) && actualResponse.length === 1) {
          responseValue = actualResponse[0];
        }
        
        return responseValue !== value;
      }
      // Fallback to direct match
      let fallbackResponse = responses[questionVar];
      if (Array.isArray(fallbackResponse) && fallbackResponse.length === 1) {
        fallbackResponse = fallbackResponse[0];
      }
      return fallbackResponse !== value;
    }

    // Pattern: anySelected('Q1', ['value1', 'value2'])
    const anySelectedMatch = dsl.match(/anySelected\('([^']+)',\s*\[([^\]]*)\]/);
    if (anySelectedMatch) {
      const [, questionVar, valuesStr] = anySelectedMatch;
      console.log(`[PREVIEW_DSL] anySelected: questionVar='${questionVar}', valuesStr='${valuesStr}'`);
      
      if (!questionVar || !valuesStr) return false;
      const values = valuesStr.split(',').map(v => v.trim().replace(/['"]/g, ''));
      // Find question by variable name and get its ID
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      
      console.log(`[PREVIEW_DSL] anySelected response:`, response, 'values:', values);
      
      if (Array.isArray(response)) {
        const result = response.some(r => values.includes(r));
        console.log(`[PREVIEW_DSL] anySelected result: ${result}`);
        return result;
      }
      const result = values.includes(response);
      console.log(`[PREVIEW_DSL] anySelected result: ${result}`);
      return result;
    }

    // Pattern: allSelected('Q1', ['value1', 'value2'])
    const allSelectedMatch = dsl.match(/allSelected\('([^']+)',\s*\[([^\]]*)\]/);
    if (allSelectedMatch) {
      const [, questionVar, valuesStr] = allSelectedMatch;
      console.log(`[PREVIEW_DSL] allSelected: questionVar='${questionVar}', valuesStr='${valuesStr}'`);
      
      if (!questionVar || !valuesStr) return false;
      const values = valuesStr.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      
      console.log(`[PREVIEW_DSL] allSelected response:`, response, 'values:', values);
      
      if (Array.isArray(response)) {
        const result = values.every(v => response.includes(v));
        console.log(`[PREVIEW_DSL] allSelected result: ${result}`);
        return result;
      }
      console.log(`[PREVIEW_DSL] allSelected result: false (not array)`);
      return false;
    }

    // Pattern: noneSelected('Q1', ['value1', 'value2'])
    const noneSelectedMatch = dsl.match(/noneSelected\('([^']+)',\s*\[([^\]]*)\]/);
    if (noneSelectedMatch) {
      const [, questionVar, valuesStr] = noneSelectedMatch;
      console.log(`[PREVIEW_DSL] noneSelected: questionVar='${questionVar}', valuesStr='${valuesStr}'`);
      
      if (!questionVar || !valuesStr) return false;
      const values = valuesStr.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      
      console.log(`[PREVIEW_DSL] noneSelected response:`, response, 'values:', values);
      
      if (Array.isArray(response)) {
        const result = !values.some(v => response.includes(v));
        console.log(`[PREVIEW_DSL] noneSelected result: ${result}`);
        return result;
      }
      console.log(`[PREVIEW_DSL] noneSelected result: true (not array)`);
      return true; // If not an array, consider it as none selected
    }

    // Pattern: contains(answer('Q1'), 'substring')
    const containsMatch = dsl.match(/contains\(answer\('([^']+)'\),\s*'([^']*)'\)/);
    if (containsMatch) {
      const [, questionVar, substring] = containsMatch;
      if (!questionVar || substring === undefined) return false;
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      return typeof response === 'string' && response.includes(substring);
    }

    // Pattern: startsWith(answer('Q1'), 'prefix')
    const startsWithMatch = dsl.match(/startsWith\(answer\('([^']+)'\),\s*'([^']*)'\)/);
    if (startsWithMatch) {
      const [, questionVar, prefix] = startsWithMatch;
      if (!questionVar || prefix === undefined) return false;
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      return typeof response === 'string' && response.startsWith(prefix);
    }

    // Pattern: greaterThan(answer('Q1'), 5)
    const greaterThanMatch = dsl.match(/greaterThan\(answer\('([^']+)'\),\s*([0-9.-]+)\)/);
    if (greaterThanMatch) {
      const [, questionVar, value] = greaterThanMatch;
      if (!questionVar || !value) return false;
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      return Number(response) > Number(value);
    }

    // Pattern: lessThan(answer('Q1'), 5)
    const lessThanMatch = dsl.match(/lessThan\(answer\('([^']+)'\),\s*([0-9.-]+)\)/);
    if (lessThanMatch) {
      const [, questionVar, value] = lessThanMatch;
      if (!questionVar || !value) return false;
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      return Number(response) < Number(value);
    }

    // Pattern: isEmpty(answer('Q1'))
    const isEmptyMatch = dsl.match(/isEmpty\(answer\('([^']+)'\)\)/);
    if (isEmptyMatch) {
      const [, questionVar] = isEmptyMatch;
      if (!questionVar) return false;
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      return !response || response === '' || (Array.isArray(response) && response.length === 0);
    }

    // Pattern: notEmpty(answer('Q1'))
    const notEmptyMatch = dsl.match(/notEmpty\(answer\('([^']+)'\)\)/);
    if (notEmptyMatch) {
      const [, questionVar] = notEmptyMatch;
      if (!questionVar) return false;
      const question = this.context.allQuestions.find(q => q.variableName === questionVar);
      const response = question ? responses[question.id] : responses[questionVar];
      return response && response !== '' && (!Array.isArray(response) || response.length > 0);
    }

    // Handle logical operators
    if (dsl.includes(' && ')) {
      const parts = dsl.split(' && ');
      return parts.every(part => this.evaluateExpression(part.trim()));
    }

    if (dsl.includes(' || ')) {
      const parts = dsl.split(' || ');
      return parts.some(part => this.evaluateExpression(part.trim()));
    }

    // Handle negation
    if (dsl.startsWith('!(') && dsl.endsWith(')')) {
      const innerExpression = dsl.slice(2, -1);
      return !this.evaluateExpression(innerExpression);
    }

    // Default: assume true if we can't parse
    console.warn('Unrecognized expression pattern:', dsl);
    return true;
  }

  /**
   * Check if a question should be visible based on its visibleIfExpressionId
   */
  isQuestionVisible(question: QuestionWithDetails): boolean {
    if (!question.visibleIfExpressionId) {
      return true; // No condition means always visible
    }

    // In a real app, you'd fetch the expression data from the API
    // For preview, we'll use mock expression data based on common patterns
    const mockExpression = this.getMockExpression(question.visibleIfExpressionId);
    if (!mockExpression) {
      return true; // Default to visible if no expression found
    }

    return this.evaluateExpression(mockExpression.dsl);
  }

  /**
   * Check if a page should be visible based on its visibleIfExpressionId
   */
  isPageVisible(page: PageWithQuestions): boolean {
    if (!page.visibleIfExpressionId) {
      return true; // No condition means always visible
    }

    const mockExpression = this.getMockExpression(page.visibleIfExpressionId);
    if (!mockExpression) {
      return true; // Default to visible if no expression found
    }

    return this.evaluateExpression(mockExpression.dsl);
  }

  /**
   * Check if a question option should be visible based on its visibleIfExpressionId
   */
  isOptionVisible(option: any): boolean {
    if (!option.visibleIfExpressionId) {
      return true; // No condition means always visible
    }

    const mockExpression = this.getMockExpression(option.visibleIfExpressionId);
    if (!mockExpression) {
      return true; // Default to visible if no expression found
    }

    return this.evaluateExpression(mockExpression.dsl);
  }

  /**
   * Check if a question group should be visible based on its visibleIfExpressionId
   */
  isGroupVisible(group: any): boolean {
    if (!group.visibleIfExpressionId) {
      return true; // No condition means always visible
    }

    const mockExpression = this.getMockExpression(group.visibleIfExpressionId);
    if (!mockExpression) {
      return true; // Default to visible if no expression found
    }

    return this.evaluateExpression(mockExpression.dsl);
  }

  /**
   * Get filtered questions for a page (apply visibility logic)
   */
  getVisibleQuestionsForPage(pageId: string, allQuestions: QuestionWithDetails[]): QuestionWithDetails[] {
    const pageQuestions = allQuestions
      .filter(q => q.pageId === pageId)
      .sort((a, b) => a.index - b.index);

    return pageQuestions.filter(question => this.isQuestionVisible(question));
  }

  /**
   * Get filtered options for a question (apply visibility logic)
   */
  getVisibleOptionsForQuestion(question: QuestionWithDetails): any[] {
    if (!question.options) return [];
    
    return question.options.filter(option => this.isOptionVisible(option));
  }

  /**
   * Apply randomization to questions based on page settings
   */
  applyQuestionRandomization(questions: QuestionWithDetails[], page: PageWithQuestions): QuestionWithDetails[] {
    const mode = page.questionOrderMode || 'SEQUENTIAL';
    
    if (mode === 'SEQUENTIAL') {
      return questions;
    }

    const cacheKey = `questions-${page.id}-${mode}`;
    
    // Check if we have cached randomization for this page
    if (this.randomizationCache.has(cacheKey)) {
      const cachedOrder = this.randomizationCache.get(cacheKey)!;
      // Reorder questions based on cached order
      return cachedOrder.map(id => questions.find(q => q.id === id)).filter(Boolean) as QuestionWithDetails[];
    }

    let randomizedQuestions: QuestionWithDetails[];
    
    switch (mode) {
      case 'RANDOM':
        randomizedQuestions = this.shuffleArray([...questions]);
        break;
      
      case 'GROUP_RANDOM':
        // Group by some criteria and randomize within groups
        randomizedQuestions = this.shuffleArray([...questions]);
        break;
      
      case 'WEIGHTED':
        // Apply weighted randomization if questions have weights
        randomizedQuestions = questions;
        break;
      
      default:
        randomizedQuestions = questions;
    }

    // Cache the order
    this.randomizationCache.set(cacheKey, randomizedQuestions.map(q => q.id));
    
    return randomizedQuestions;
  }

  /**
   * Apply randomization to options based on question settings
   */
  applyOptionRandomization(options: any[], question: QuestionWithDetails): any[] {
    const mode = question.optionOrderMode || 'SEQUENTIAL';
    
    if (mode === 'SEQUENTIAL') {
      return options;
    }

    const cacheKey = `options-${question.id}-${mode}-${options.length}`;
    
    // Check if we have cached randomization for this question
    if (this.randomizationCache.has(cacheKey)) {
      const cachedOrder = this.randomizationCache.get(cacheKey)!;
      // Reorder options based on cached order, but handle missing options gracefully
      const reordered = cachedOrder
        .map(id => options.find(opt => opt.id === id))
        .filter(Boolean);
      
      // Add any new options that weren't in the cache
      const newOptions = options.filter(opt => !cachedOrder.includes(opt.id));
      return [...reordered, ...newOptions];
    }

    let randomizedOptions: any[];
    
    switch (mode) {
      case 'RANDOM':
        randomizedOptions = this.shuffleArray([...options]);
        break;
      
      case 'GROUP_RANDOM':
        // Group by groupKey and randomize within groups
        const groups: Record<string, any[]> = {};
        const ungrouped: any[] = [];
        
        options.forEach(option => {
          if (option && option.groupKey) {
            if (!groups[option.groupKey]) groups[option.groupKey] = [];
            groups[option.groupKey]!.push(option);
          } else if (option) {
            ungrouped.push(option);
          }
        });
        
        // Shuffle within each group and then combine
        const result: any[] = [];
        Object.keys(groups).forEach(groupKey => {
          const group = groups[groupKey];
          if (group) {
            result.push(...this.shuffleArray(group));
          }
        });
        result.push(...this.shuffleArray(ungrouped));
        
        randomizedOptions = result;
        break;
      
      case 'WEIGHTED':
        // Apply weighted randomization based on option weights
        randomizedOptions = this.weightedShuffle([...options]);
        break;
      
      default:
        randomizedOptions = options;
    }

    // Cache the order
    this.randomizationCache.set(cacheKey, randomizedOptions.map(opt => opt?.id).filter(Boolean));
    
    return randomizedOptions;
  }

  /**
   * Evaluate jump logic for a question response
   */
  evaluateJumpLogic(questionId: string): JumpDestination | null {
    const question = this.context.allQuestions.find(q => q.id === questionId);
    
    if (!question || !question.fromJumps || question.fromJumps.length === 0) {
      return null;
    }

    // Sort by priority (lower number = higher priority)
    const sortedJumps = [...question.fromJumps].sort((a, b) => a.priority - b.priority);

    for (const jump of sortedJumps) {
      if (jump.condition) {
        const conditionResult = this.evaluateExpression(jump.condition.dsl);
        
        if (conditionResult) {
          if (jump.toQuestionId) {
            return { type: 'question', id: jump.toQuestionId };
          } else if (jump.toPageId) {
            const pageIndex = this.context.allPages.findIndex(p => p.id === jump.toPageId);
            return { type: 'page', id: jump.toPageId, pageIndex };
          }
        }
      } else if (jump.conditionExpressionId) {
        // Fallback: use expression ID to get mock expression
        const mockExpression = this.getMockExpression(jump.conditionExpressionId);
        if (mockExpression) {
          const conditionResult = this.evaluateExpression(mockExpression.dsl);
          
          if (conditionResult) {
            if (jump.toQuestionId) {
              return { type: 'question', id: jump.toQuestionId };
            } else if (jump.toPageId) {
              const pageIndex = this.context.allPages.findIndex(p => p.id === jump.toPageId);
              return { type: 'page', id: jump.toPageId, pageIndex };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Get filtered and ordered pages (apply visibility and randomization)
   */
  getVisiblePages(): PageWithQuestions[] {
    return this.context.allPages
      .filter(page => this.isPageVisible(page))
      .sort((a, b) => a.index - b.index);
  }

  /**
   * Get ordered questions for a group based on the group's inner order mode
   */
  getOrderedQuestionsForGroup(questions: QuestionWithDetails[], orderMode: string): QuestionWithDetails[] {
    switch (orderMode) {
      case 'RANDOM':
        return this.shuffleArray(questions);
      case 'GROUP_RANDOM':
        // For group random, we could implement more complex logic
        // For now, just shuffle the questions within the group
        return this.shuffleArray(questions);
      case 'WEIGHTED':
        // For weighted, we could implement weight-based ordering
        // For now, just shuffle
        return this.shuffleArray(questions);
      case 'SEQUENTIAL':
      default:
        return questions.sort((a, b) => a.index - b.index);
    }
  }

  /**
   * Utility: Shuffle an array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }

  /**
   * Utility: Weighted shuffle based on option weights
   */
  private weightedShuffle<T extends { weight?: number }>(options: T[]): T[] {
    // For simplicity, just shuffle for now
    // In a real implementation, you'd use the weights to influence the order
    return this.shuffleArray(options);
  }

  /**
   * Get expression data for preview
   * In real surveys, expressions might not be included in the API response
   * so we provide fallback expressions for common patterns
   */
  private getMockExpression(expressionId: string): ExpressionData | null {
    // Check if we already have the expression data from API
    // If not, provide fallback expressions for common scenarios
    const mockExpressions: Record<string, ExpressionData> = {
      'show-if-yes': {
        id: 'show-if-yes',
        dsl: "equals(answer('Q1'), 'Yes')",
        description: 'Show if Q1 equals Yes'
      },
      'show-if-no': {
        id: 'show-if-no',
        dsl: "equals(answer('Q1'), 'No')",
        description: 'Show if Q1 equals No'
      },
      'show-if-maybe': {
        id: 'show-if-maybe',
        dsl: "equals(answer('Q1'), 'Maybe')",
        description: 'Show if Q1 equals Maybe'
      },
      'show-if-apple-selected': {
        id: 'show-if-apple-selected',
        dsl: "anySelected('Q3', ['Apple'])",
        description: 'Show if Apple is selected in Q3'
      },
      'show-if-age-over-18': {
        id: 'show-if-age-over-18',
        dsl: "greaterThan(answer('Q2'), 18)",
        description: 'Show if age is over 18'
      },
      'show-if-not-empty': {
        id: 'show-if-not-empty',
        dsl: "notEmpty(answer('Q1'))",
        description: 'Show if Q1 is not empty'
      },
      'show-if-interested-or-maybe': {
        id: 'show-if-interested-or-maybe',
        dsl: "anySelected('Q1', ['Yes', 'Maybe'])",
        description: 'Show if interested or maybe interested'
      },
      'jump-condition-1': {
        id: 'jump-condition-1',
        dsl: "equals(answer('Q1'), 'No')",
        description: 'Jump to page 3 if not interested in cars'
      },
      'show-if-interested-in-cars': {
        id: 'show-if-interested-in-cars',
        dsl: "anySelected('Q1', ['Yes', 'Maybe'])",
        description: 'Show if interested in cars or maybe interested'
      }
    };

    return mockExpressions[expressionId] || null;
  }
}
