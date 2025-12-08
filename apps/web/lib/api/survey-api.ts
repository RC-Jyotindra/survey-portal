// API client for survey service
import { config } from '../config';
import { getApiHeaders } from '../api-headers';
export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  version: number;
  slug?: string;
  defaultLanguage?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  _count?: {
    pages: number;
    questions: number;
    sessions: number;
  };
}

export interface CreateSurveyRequest {
  title: string;
  description?: string;
  slug?: string;
  defaultLanguage?: string;
  settings?: Record<string, any>;
}

export interface UpdateSurveyRequest {
  title?: string;
  description?: string;
  slug?: string;
  defaultLanguage?: string;
  settings?: Record<string, any>;
}

export interface SurveyListResponse {
  surveys: Survey[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: string;
  details?: any;
}

class SurveyApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SURVEY_API || `${config.api.surveyService}`;
  }

  private getAuthHeaders(): HeadersInit {
    // Use dynamic API headers utility instead of hardcoded values
    return getApiHeaders();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      if (response.status === 401) {
        // Token expired or invalid - redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          window.location.href = '/survey-builder';
        }
      }
      
      throw new Error(errorData.error || 'An error occurred');
    }

    return response.json();
  }

  async getSurveys(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SurveyListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const url = `${this.baseUrl}/api/surveys${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<SurveyListResponse>(response);
  }

  async getSurvey(id: string): Promise<{ survey: Survey }> {
    const response = await fetch(`${this.baseUrl}/api/surveys/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ survey: Survey }>(response);
  }

  async createSurvey(data: CreateSurveyRequest): Promise<{ survey: Survey }> {
    const response = await fetch(`${this.baseUrl}/api/surveys`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<{ survey: Survey }>(response);
  }

  async updateSurvey(id: string, data: UpdateSurveyRequest): Promise<{ survey: Survey }> {
    const response = await fetch(`${this.baseUrl}/api/surveys/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<{ survey: Survey }>(response);
  }

  async deleteSurvey(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/surveys/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async publishSurvey(id: string): Promise<{ survey: Survey; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/surveys/${id}/publish`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ survey: Survey; message: string }>(response);
  }

  async duplicateSurvey(id: string, title?: string): Promise<{ survey: Survey; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/surveys/${id}/duplicate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ title }),
    });

    return this.handleResponse<{ survey: Survey; message: string }>(response);
  }
}

export const surveyApi = new SurveyApiClient();
