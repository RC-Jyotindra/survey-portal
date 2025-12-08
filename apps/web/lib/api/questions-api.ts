import { Question, QuestionOption, QuestionItem, QuestionScale } from '@prisma/client';
import { getApiHeaders } from '../api-headers';
import { config } from '../config';

const API_BASE = process.env.NEXT_PUBLIC_SURVEY_API || `${config.api.surveyService}`;

export type QuestionType = 
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE' 
  | 'DROPDOWN'
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DECIMAL'
  | 'DATE'
  | 'TIME'
  | 'BOOLEAN'
  | 'RANK'
  | 'SLIDER'
  | 'MATRIX'
  | 'MATRIX_SINGLE'
  | 'MATRIX_MULTIPLE'
  | 'BIPOLAR_MATRIX'
  | 'OPINION_SCALE'
  | 'CONSTANT_SUM'
  | 'DATETIME'
  | 'YES_NO'
  | 'EMAIL'
  | 'PHONE_NUMBER'
  | 'WEBSITE'
  | 'GROUP_RANK'
  | 'GROUP_RATING'
  | 'PHOTO_CAPTURE'
  | 'PICTURE_CHOICE'
  | 'PAYMENT'
  | 'SIGNATURE'
  | 'CONSENT_AGREEMENT'
  | 'MESSAGE'
  | 'CONTACT_FORM'
  | 'DESCRIPTIVE'
  | 'FILE_UPLOAD';

export interface CreateQuestionData {
  pageId: string;
  groupId?: string;
  type: QuestionType;
  variableName?: string;
  titleTemplate: string;
  helpTextTemplate?: string;
  required?: boolean;
  validation?: any;
  minValue?: number | null;
  maxValue?: number | null;
  optionOrderMode?: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
  optionsSource?: 'STATIC' | 'CARRY_FORWARD';
  carryForwardQuestionId?: string;
  carryForwardFilterExprId?: string;
  visibleIfExpressionId?: string;
}

export interface UpdateQuestionData {
  groupId?: string;
  type?: QuestionType;
  variableName?: string;
  titleTemplate?: string;
  helpTextTemplate?: string;
  required?: boolean;
  validation?: any;
  minValue?: number | null;
  maxValue?: number | null;
  optionOrderMode?: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
  optionsSource?: 'STATIC' | 'CARRY_FORWARD';
  carryForwardQuestionId?: string;
  carryForwardFilterExprId?: string;
  visibleIfExpressionId?: string;
  terminateIfExpressionId?: string;
}

export interface CreateQuestionOptionData {
  questionId: string;
  value: string;
  labelTemplate: string;
  exclusive?: boolean;
  groupKey?: string;
  weight?: number;
  visibleIfExpressionId?: string;
}

export interface UpdateQuestionOptionData {
  value?: string;
  labelTemplate?: string;
  exclusive?: boolean;
  groupKey?: string;
  weight?: number;
  visibleIfExpressionId?: string;
}

export interface CreateQuestionItemData {
  questionId: string;
  value: string;
  label: string;
}

export interface UpdateQuestionItemData {
  value?: string;
  label?: string;
}

export interface CreateQuestionScaleData {
  questionId: string;
  value: string;
  label: string;
}

export interface UpdateQuestionScaleData {
  value?: string;
  label?: string;
}

export interface QuestionWithDetails extends Question {
  page: {
    id: string;
    index: number;
    titleTemplate: string | null;
  };
  options: QuestionOption[];
  items: QuestionItem[];
  scales: QuestionScale[];
  fromJumps?: {
    id: string;
    fromQuestionId: string;
    toQuestionId: string | null;
    toPageId: string | null;
    conditionExpressionId: string | null;
    priority: number;
    condition?: {
      id: string;
      dsl: string;
      description: string | null;
    };
    toQuestion?: {
      id: string;
      variableName: string | null;
      titleTemplate: string;
    };
    toPage?: {
      id: string;
      titleTemplate: string | null;
      index: number;
    };
  }[];
}

class QuestionsAPI {
  private getAuthHeaders() {
    // Use dynamic API headers utility for consistent tenant ID and auth token handling
    return getApiHeaders();
  }

  async getQuestions(surveyId: string): Promise<QuestionWithDetails[]> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch questions');
    }

    const data = await response.json();
    return data.questions;
  }

  async getQuestion(surveyId: string, questionId: string): Promise<QuestionWithDetails> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions/${questionId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch question');
    }

    const data = await response.json();
    return data.question;
  }

  async createQuestion(surveyId: string, data: CreateQuestionData): Promise<QuestionWithDetails> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create question');
    }

    const result = await response.json();
    return result.question;
  }

  async updateQuestion(surveyId: string, questionId: string, data: UpdateQuestionData): Promise<QuestionWithDetails> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions/${questionId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update question');
    }

    const result = await response.json();
    return result.question;
  }

  async deleteQuestion(surveyId: string, questionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions/${questionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete question');
    }
  }

  // Question Options
  async createQuestionOption(surveyId: string, questionId: string, data: CreateQuestionOptionData): Promise<QuestionOption> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions/${questionId}/options`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create option');
    }

    const result = await response.json();
    return result.option;
  }

  async updateQuestionOption(surveyId: string, questionId: string, optionId: string, data: UpdateQuestionOptionData): Promise<QuestionOption> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions/${questionId}/options/${optionId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update option');
    }

    const result = await response.json();
    return result.option;
  }

  async deleteQuestionOption(surveyId: string, questionId: string, optionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions/${questionId}/options/${optionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete option');
    }
  }

  async updateQuestionShuffling(surveyId: string, questionId: string, optionOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED'): Promise<QuestionWithDetails> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/questions/${questionId}/shuffling`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ optionOrderMode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update question shuffling');
    }

    const data = await response.json();
    return data.question;
  }
}

export const questionsAPI = new QuestionsAPI();
