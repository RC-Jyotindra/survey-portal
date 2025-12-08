export interface LoopBattery {
  id: string;
  name: string;
  startPageId: string;
  endPageId: string;
  sourceType: 'ANSWER' | 'DATASET';
  sourceQuestionId?: string;
  maxItems?: number;
  randomize: boolean;
  sampleWithoutReplacement: boolean;
  createdAt: string;
  updatedAt: string;
  startPage: {
    id: string;
    index: number;
    titleTemplate: string;
  };
  endPage: {
    id: string;
    index: number;
    titleTemplate: string;
  };
  sourceQuestion?: {
    id: string;
    variableName: string;
    titleTemplate: string;
    type: string;
  };
  datasetItems?: LoopDatasetItem[];
}

export interface LoopDatasetItem {
  id: string;
  batteryId: string;
  key: string;
  attributes?: Record<string, any>;
  isActive: boolean;
  sortIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoopContext {
  currentItem: {
    key: string;
    label: string;
    attributes: Record<string, any>;
  };
  currentIndex: number;
  totalItems: number;
  isFirstIteration: boolean;
  isLastIteration: boolean;
}

export interface LoopPlan {
  keys: string[];
  currentIndex: number;
  items: Array<{
    key: string;
    label: string;
    attributes: Record<string, any>;
  }>;
  isComplete: boolean;
}
