import { SurveyPage, Question } from '@prisma/client';
import { getApiHeaders } from '../api-headers';
import { config } from '../config';

const API_BASE = process.env.NEXT_PUBLIC_SURVEY_API || `${config.api.surveyService}`;

export interface CreatePageData {
  titleTemplate?: string;
  descriptionTemplate?: string;
  questionOrderMode?: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
  visibleIfExpressionId?: string;
}

export interface UpdatePageData {
  titleTemplate?: string;
  descriptionTemplate?: string;
  questionOrderMode?: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
  visibleIfExpressionId?: string;
}

export interface PageWithQuestions extends SurveyPage {
  _count: {
    questions: number;
  };
  questions?: Question[];
}

class PagesAPI {
  private getAuthHeaders() {
    // Use dynamic API headers utility for consistent tenant ID and auth token handling
    return getApiHeaders();
  }

  async getPages(surveyId: string): Promise<PageWithQuestions[]> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/pages`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch pages');
    }

    const data = await response.json();
    return data.pages;
  }

  async getPage(surveyId: string, pageId: string): Promise<PageWithQuestions> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/pages/${pageId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch page');
    }

    const data = await response.json();
    return data.page;
  }

  async createPage(surveyId: string, data: CreatePageData): Promise<PageWithQuestions> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/pages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create page');
    }

    const result = await response.json();
    return result.page;
  }

  async updatePage(surveyId: string, pageId: string, data: UpdatePageData): Promise<PageWithQuestions> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/pages/${pageId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update page');
    }

    const result = await response.json();
    return result.page;
  }

  async deletePage(surveyId: string, pageId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/pages/${pageId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete page');
    }
  }

  async reorderPage(surveyId: string, pageId: string, newIndex: number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/pages/${pageId}/reorder`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ newIndex }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reorder page');
    }
  }

  async updatePageRandomization(surveyId: string, pageId: string, questionOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED'): Promise<PageWithQuestions> {
    const response = await fetch(`${API_BASE}/api/surveys/${surveyId}/pages/${pageId}/randomization`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ questionOrderMode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update page randomization');
    }

    const data = await response.json();
    return data.page;
  }
}

export const pagesAPI = new PagesAPI();
