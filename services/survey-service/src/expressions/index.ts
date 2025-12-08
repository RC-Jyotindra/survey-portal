import { QuestionType } from '@prisma/client';

// Types for expression evaluation
export interface AnswerData {
  [questionId: string]: any;
}

export interface ExpressionContext {
  answers: AnswerData;
  questions: QuestionContext[];
}

export interface QuestionContext {
  id: string;
  variableName: string;
  type: QuestionType;
  options?: Array<{ value: string; label: string }>;
}

// DSL Parser and Evaluator
export class ExpressionEvaluator {
  private context: ExpressionContext;

  constructor(context: ExpressionContext) {
    this.context = context;
  }

  /**
   * Parse and evaluate a DSL expression
   */
  evaluate(dsl: string): boolean {
    try {
      // Clean and validate the DSL
      const cleanDsl = dsl.trim();
      if (!cleanDsl) return true;

      // Use simplified regex-based evaluation
      return this.evaluateSimple(cleanDsl);
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return false; // Default to false on error
    }
  }

  /**
   * Simple regex-based evaluation for basic expressions
   */
  private evaluateSimple(dsl: string): boolean {
    // Handle equals(answer('Q1'), 'Yes')
    const equalsMatch = dsl.match(/equals\(answer\('([^']+)'\),\s*'([^']+)'\)/);
    if (equalsMatch) {
      const [, questionName, expectedValue] = equalsMatch;
      if (questionName && expectedValue) {
        const answer = this.getAnswerByVariableName(questionName);
        return answer === expectedValue;
      }
    }

    // Handle notEquals(answer('Q1'), 'No')
    const notEqualsMatch = dsl.match(/notEquals\(answer\('([^']+)'\),\s*'([^']+)'\)/);
    if (notEqualsMatch) {
      const [, questionName, expectedValue] = notEqualsMatch;
      if (questionName && expectedValue) {
        const answer = this.getAnswerByVariableName(questionName);
        return answer !== expectedValue;
      }
    }

    // Handle greaterThan(answer('Q2'), 18)
    const greaterThanMatch = dsl.match(/greaterThan\(answer\('([^']+)'\),\s*(\d+)\)/);
    if (greaterThanMatch) {
      const [, questionName, expectedValue] = greaterThanMatch;
      if (questionName && expectedValue) {
        const answer = this.getAnswerByVariableName(questionName);
        return Number(answer) > Number(expectedValue);
      }
    }

    // Handle lessThan(answer('Q2'), 65)
    const lessThanMatch = dsl.match(/lessThan\(answer\('([^']+)'\),\s*(\d+)\)/);
    if (lessThanMatch) {
      const [, questionName, expectedValue] = lessThanMatch;
      if (questionName && expectedValue) {
        const answer = this.getAnswerByVariableName(questionName);
        return Number(answer) < Number(expectedValue);
      }
    }

    // Handle contains(answer('Q3'), 'email')
    const containsMatch = dsl.match(/contains\(answer\('([^']+)'\),\s*'([^']+)'\)/);
    if (containsMatch) {
      const [, questionName, expectedValue] = containsMatch;
      if (questionName && expectedValue) {
        const answer = this.getAnswerByVariableName(questionName);
        return String(answer).includes(expectedValue);
      }
    }

    // Handle startsWith(answer('Q3'), 'Mr.')
    const startsWithMatch = dsl.match(/startsWith\(answer\('([^']+)'\),\s*'([^']+)'\)/);
    if (startsWithMatch) {
      const [, questionName, expectedValue] = startsWithMatch;
      if (questionName && expectedValue) {
        const answer = this.getAnswerByVariableName(questionName);
        return String(answer).startsWith(expectedValue);
      }
    }

    // Handle anySelected('Q1', ['Apple', 'Banana'])
    const anySelectedMatch = dsl.match(/anySelected\('([^']+)',\s*\[([^\]]+)\]\)/);
    if (anySelectedMatch) {
      const [, questionName, valuesStr] = anySelectedMatch;
      if (questionName && valuesStr) {
        const values = valuesStr.split(',').map(v => v.trim().replace(/'/g, ''));
        const answer = this.getAnswerByVariableName(questionName);
        
        if (Array.isArray(answer)) {
          return values.some(v => answer.includes(v));
        } else {
          return values.includes(answer);
        }
      }
    }

    // Handle allSelected('Q1', ['Apple', 'Banana'])
    const allSelectedMatch = dsl.match(/allSelected\('([^']+)',\s*\[([^\]]+)\]\)/);
    if (allSelectedMatch) {
      const [, questionName, valuesStr] = allSelectedMatch;
      if (questionName && valuesStr) {
        const values = valuesStr.split(',').map(v => v.trim().replace(/'/g, ''));
        const answer = this.getAnswerByVariableName(questionName);
        
        if (Array.isArray(answer)) {
          return values.every(v => answer.includes(v));
        } else {
          return values.includes(answer);
        }
      }
    }

    // Handle noneSelected('Q1', ['Apple', 'Banana'])
    const noneSelectedMatch = dsl.match(/noneSelected\('([^']+)',\s*\[([^\]]+)\]\)/);
    if (noneSelectedMatch) {
      const [, questionName, valuesStr] = noneSelectedMatch;
      if (questionName && valuesStr) {
        const values = valuesStr.split(',').map(v => v.trim().replace(/'/g, ''));
        const answer = this.getAnswerByVariableName(questionName);
        
        if (Array.isArray(answer)) {
          return !values.some(v => answer.includes(v));
        } else {
          return !values.includes(answer);
        }
      }
    }

    // Handle logical operators with parentheses
    // For now, let's handle simple AND/OR cases
    if (dsl.includes('&&')) {
      const parts = dsl.split('&&').map(p => p.trim());
      return parts.every(part => this.evaluateSimple(part));
    }

    if (dsl.includes('||')) {
      const parts = dsl.split('||').map(p => p.trim());
      return parts.some(part => this.evaluateSimple(part));
    }

    // Handle NOT operator
    if (dsl.startsWith('!(') && dsl.endsWith(')')) {
      const innerExpression = dsl.slice(2, -1);
      return !this.evaluateSimple(innerExpression);
    }

    throw new Error(`Unsupported expression: ${dsl}`);
  }

  /**
   * Get answer value for a question by variable name
   */
  private getAnswerByVariableName(variableName: string): any {
    const question = this.context.questions.find(q => q.variableName === variableName);
    if (!question) return null;
    return this.context.answers[question.id];
  }
}

/**
 * Validate DSL syntax without evaluating
 */
export function validateDSL(dsl: string): { valid: boolean; error?: string } {
  try {
    const evaluator = new ExpressionEvaluator({ answers: {}, questions: [] });
    evaluator.evaluate(dsl);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Invalid DSL syntax' 
    };
  }
}

/**
 * Test DSL with sample data
 */
export function testDSL(dsl: string, testAnswers: AnswerData, questions: QuestionContext[]): { result: boolean; error?: string } {
  try {
    const evaluator = new ExpressionEvaluator({ answers: testAnswers, questions });
    const result = evaluator.evaluate(dsl);
    return { result };
  } catch (error) {
    return { 
      result: false, 
      error: error instanceof Error ? error.message : 'Evaluation error' 
    };
  }
}