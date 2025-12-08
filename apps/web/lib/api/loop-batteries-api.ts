import { LoopBattery } from './types';
import { getApiHeaders } from '../api-headers';
import { config } from '../config';
const API_BASE_URL = process.env.NEXT_PUBLIC_SURVEY_API || `${config.api.surveyService}`;

export interface CreateLoopBatteryData {
  name: string;
  startPageId: string;
  endPageId: string;
  sourceType: 'ANSWER' | 'DATASET';
  sourceQuestionId?: string;
  maxItems?: number;
  randomize?: boolean;
  sampleWithoutReplacement?: boolean;
}

export interface UpdateLoopBatteryData {
  name?: string;
  startPageId?: string;
  endPageId?: string;
  sourceType?: 'ANSWER' | 'DATASET';
  sourceQuestionId?: string;
  maxItems?: number;
  randomize?: boolean;
  sampleWithoutReplacement?: boolean;
}

export interface LoopDatasetItem {
  id: string;
  batteryId: string;
  key: string;
  attributes?: Record<string, any>;
  isActive: boolean;
  sortIndex?: number;
}

export interface CreateDatasetItemData {
  key: string;
  attributes?: Record<string, any>;
  isActive?: boolean;
  sortIndex?: number;
}

export interface UpdateDatasetItemData {
  key?: string;
  attributes?: Record<string, any>;
  isActive?: boolean;
  sortIndex?: number;
}

class LoopBatteriesAPI {
  private getAuthHeaders() {
    // Use dynamic API headers utility for consistent tenant ID and auth token handling
    return getApiHeaders();
  }

  // Loop Battery CRUD operations
  async createLoopBattery(surveyId: string, data: CreateLoopBatteryData): Promise<LoopBattery> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create loop battery');
    }

    const result = await response.json();
    return result.loopBattery;
  }

  async getLoopBatteries(surveyId: string): Promise<LoopBattery[]> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch loop batteries');
    }

    const result = await response.json();
    return result.loopBatteries || [];
  }

  async getLoopBattery(surveyId: string, batteryId: string): Promise<LoopBattery> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries/${batteryId}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch loop battery');
    }

    const result = await response.json();
    return result.loopBattery;
  }

  async updateLoopBattery(surveyId: string, batteryId: string, data: UpdateLoopBatteryData): Promise<LoopBattery> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries/${batteryId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update loop battery');
    }

    const result = await response.json();
    return result.loopBattery;
  }

  async deleteLoopBattery(surveyId: string, batteryId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries/${batteryId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete loop battery');
    }
  }

  // Dataset Items CRUD operations
  async createDatasetItem(surveyId: string, batteryId: string, data: CreateDatasetItemData): Promise<LoopDatasetItem> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries/${batteryId}/dataset-items`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create dataset item');
    }

    const result = await response.json();
    return result.datasetItem;
  }

  async getDatasetItems(surveyId: string, batteryId: string): Promise<LoopDatasetItem[]> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries/${batteryId}/dataset-items`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch dataset items');
    }

    const result = await response.json();
    return result.datasetItems || [];
  }

  async updateDatasetItem(surveyId: string, batteryId: string, itemId: string, data: UpdateDatasetItemData): Promise<LoopDatasetItem> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries/${batteryId}/dataset-items/${itemId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update dataset item');
    }

    const result = await response.json();
    return result.datasetItem;
  }

  async deleteDatasetItem(surveyId: string, batteryId: string, itemId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/loop-batteries/${batteryId}/dataset-items/${itemId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete dataset item');
    }
  }
}

export const loopBatteriesAPI = new LoopBatteriesAPI();
