import { getApiHeaders } from '../api-headers';
import { config } from '../config';

const API_BASE = process.env.NEXT_PUBLIC_SURVEY_API || `${config.api.surveyService}`;

export interface Expression {
  id: string;
  tenantId: string;
  surveyId: string;
  dsl: string;
  description?: string | null;
  compiled?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpressionData {
  dsl: string;
  description?: string | null;
}

export interface UpdateExpressionData {
  dsl?: string;
  description?: string | null;
}

export interface ValidateExpressionData {
  dsl: string;
  testAnswers?: Record<string, any>;
}

export interface ExpressionValidationResult {
  isValid: boolean;
  result?: any;
  error?: string;
}

export interface ExpressionUsage {
  pages: Array<{
    id: string;
    index: number;
    titleTemplate: string;
    usageType: 'page_visibility';
  }>;
  questions: Array<{
    id: string;
    variableName: string;
    titleTemplate: string;
    usageType: 'question_visibility' | 'carry_forward_filter';
  }>;
  options: Array<{
    id: string;
    value: string;
    labelTemplate: string;
    question: {
      variableName: string;
      titleTemplate: string;
    };
    usageType: 'option_visibility';
  }>;
  pageJumps: Array<{
    id: string;
    priority: number;
    fromPage: { index: number };
    toPage: { index: number };
    usageType: 'page_jump_condition';
  }>;
  questionJumps: Array<{
    id: string;
    priority: number;
    fromQuestion: {
      variableName: string;
      titleTemplate: string;
    };
    usageType: 'question_jump_condition';
  }>;
}

class ExpressionsAPI {
  private getAuthHeaders() {
    // Use dynamic API headers utility for consistent tenant ID and auth token handling
    return getApiHeaders();
  }

  // List all expressions for a survey
  async getExpressions(surveyId: string): Promise<{ expressions: Expression[] }> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/expressions`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch expressions');
    }

    const data = await response.json();
    return data;
  }

  // Create a new expression
  async createExpression(surveyId: string, data: CreateExpressionData): Promise<{ expression: Expression }> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/expressions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create expression');
    }

    const result = await response.json();
    return result;
  }

  // Get a specific expression
  async getExpression(surveyId: string, expressionId: string): Promise<{ expression: Expression }> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/expressions/${expressionId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch expression');
    }

    const data = await response.json();
    return data;
  }

  // Update an expression
  async updateExpression(surveyId: string, expressionId: string, data: UpdateExpressionData): Promise<{ expression: Expression }> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/expressions/${expressionId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update expression');
    }

    const result = await response.json();
    return result;
  }

  // Delete an expression
  async deleteExpression(surveyId: string, expressionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/expressions/${expressionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete expression');
    }

    const data = await response.json();
    return data;
  }

  // Validate DSL syntax
  async validateExpression(surveyId: string, data: ValidateExpressionData): Promise<ExpressionValidationResult> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/expressions/validate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to validate expression');
    }

    const result = await response.json();
    return result;
  }

  // Get expression usage information
  async getExpressionUsage(surveyId: string, expressionId: string): Promise<{ expression: Expression; usage: ExpressionUsage }> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/expressions/${expressionId}/usage`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch expression usage');
    }

    const data = await response.json();
    return data;
  }
}

export const expressionsAPI = new ExpressionsAPI();
