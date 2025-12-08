"use client";

import { useState } from 'react';

interface LoopBattery {
  id: string;
  name: string;
  startPageId: string;
  endPageId: string;
  sourceType: 'ANSWER' | 'DATASET';
  sourceQuestionId?: string;
  maxItems?: number;
  randomize: boolean;
  sampleWithoutReplacement: boolean;
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
}

interface LoopBatteryIndicatorProps {
  battery: LoopBattery;
  pageIndex: number;
  isStartPage: boolean;
  isEndPage: boolean;
  isInsideLoop: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function LoopBatteryIndicator({
  battery,
  pageIndex,
  isStartPage,
  isEndPage,
  isInsideLoop,
  onEdit,
  onDelete
}: LoopBatteryIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getIndicatorType = () => {
    if (isStartPage) return 'start';
    if (isEndPage) return 'end';
    if (isInsideLoop) return 'middle';
    return 'none';
  };

  const indicatorType = getIndicatorType();

  if (indicatorType === 'none') {
    return null;
  }

  return (
    <div className="relative">
      {/* Loop Battery Indicator */}
      <div 
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer ${
          indicatorType === 'start' 
            ? 'bg-purple-50 border-purple-200 hover:bg-purple-100' 
            : indicatorType === 'end'
            ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
            : 'bg-purple-25 border-purple-100 hover:bg-purple-50'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Loop Icon */}
        <div className="flex-shrink-0">
          <div className={`p-1.5 rounded ${
            indicatorType === 'start' || indicatorType === 'end'
              ? 'bg-purple-100' 
              : 'bg-purple-50'
          }`}>
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>

        {/* Loop Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-purple-900 truncate">
              {battery.name}
            </h4>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              indicatorType === 'start' 
                ? 'bg-purple-200 text-purple-800' 
                : indicatorType === 'end'
                ? 'bg-purple-200 text-purple-800'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {indicatorType === 'start' && 'START'}
              {indicatorType === 'end' && 'END'}
              {indicatorType === 'middle' && 'LOOP'}
            </span>
          </div>
          
          {indicatorType === 'start' && (
            <p className="text-xs text-purple-600 mt-1">
              Pages {battery.startPage.index}-{battery.endPage.index} • Source: {battery.sourceQuestion?.variableName || 'Dataset'}
            </p>
          )}
          
          {indicatorType === 'end' && (
            <p className="text-xs text-purple-600 mt-1">
              End of loop • {battery.randomize ? 'Randomized' : 'Sequential'} order
            </p>
          )}
          
          {indicatorType === 'middle' && (
            <p className="text-xs text-purple-600 mt-1">
              Part of "{battery.name}" loop
            </p>
          )}
        </div>

        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0">
          <svg 
            className={`w-4 h-4 text-purple-500 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Loop Details Panel */}
      {showDetails && (
        <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="space-y-3">
            {/* Loop Configuration */}
            <div>
              <h5 className="text-sm font-medium text-purple-900 mb-2">Loop Configuration</h5>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-purple-600">Source Type:</span>
                  <span className="ml-1 text-gray-700">{battery.sourceType}</span>
                </div>
                <div>
                  <span className="text-purple-600">Max Items:</span>
                  <span className="ml-1 text-gray-700">{battery.maxItems || 'No limit'}</span>
                </div>
                <div>
                  <span className="text-purple-600">Randomize:</span>
                  <span className="ml-1 text-gray-700">{battery.randomize ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-purple-600">Sampling:</span>
                  <span className="ml-1 text-gray-700">{battery.sampleWithoutReplacement ? 'Without replacement' : 'With replacement'}</span>
                </div>
              </div>
            </div>

            {/* Source Question Info */}
            {battery.sourceQuestion && (
              <div>
                <h5 className="text-sm font-medium text-purple-900 mb-2">Source Question</h5>
                <div className="text-xs text-gray-700">
                  <div className="font-medium">{battery.sourceQuestion.variableName}</div>
                  <div className="text-gray-600 mt-1">{battery.sourceQuestion.titleTemplate}</div>
                </div>
              </div>
            )}

            {/* Template Variables Preview */}
            <div>
              <h5 className="text-sm font-medium text-purple-900 mb-2">Available Variables</h5>
              <div className="space-y-1">
                <div className="text-xs">
                  <code className="px-2 py-1 bg-white border border-purple-200 rounded text-purple-700">
                    {`{{loop.key}}`}
                  </code>
                  <span className="ml-2 text-gray-600">Current item key</span>
                </div>
                <div className="text-xs">
                  <code className="px-2 py-1 bg-white border border-purple-200 rounded text-purple-700">
                    {`{{loop.label}}`}
                  </code>
                  <span className="ml-2 text-gray-600">Current item label</span>
                </div>
                <div className="text-xs">
                  <code className="px-2 py-1 bg-white border border-purple-200 rounded text-purple-700">
                    {`{{loop.index}}`}
                  </code>
                  <span className="ml-2 text-gray-600">Current iteration (1-based)</span>
                </div>
                <div className="text-xs">
                  <code className="px-2 py-1 bg-white border border-purple-200 rounded text-purple-700">
                    {`{{loop.total}}`}
                  </code>
                  <span className="ml-2 text-gray-600">Total iterations</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {(onEdit || onDelete) && (
              <div className="flex items-center space-x-2 pt-3 border-t border-purple-200">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-3 py-1 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded hover:bg-purple-50 transition-colors"
                  >
                    Edit Loop
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-white border border-red-200 rounded hover:bg-red-50 transition-colors"
                  >
                    Delete Loop
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Loop Connection Line Component (for visual connection between start and end)
export function LoopConnectionLine({ 
  startPageIndex, 
  endPageIndex, 
  isVisible 
}: { 
  startPageIndex: number; 
  endPageIndex: number; 
  isVisible: boolean; 
}) {
  if (!isVisible || endPageIndex <= startPageIndex) {
    return null;
  }

  return (
    <div className="relative my-2">
      <div className="absolute left-0 right-0 h-px bg-purple-200"></div>
      <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="px-2 py-1 bg-purple-100 border border-purple-200 rounded-full">
          <span className="text-xs font-medium text-purple-700">
            {endPageIndex - startPageIndex + 1} pages
          </span>
        </div>
      </div>
    </div>
  );
}
