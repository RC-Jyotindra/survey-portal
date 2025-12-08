
'use client';

import { useState } from 'react';

interface MatrixAnswerDisplayProps {
  answerValue: string;
  questionType: string;
  totalAnswers: number;
  questionData?: {
    items?: Array<{ id: string; label: string }>;
    scales?: Array<{ id: string; label: string }>;
  };
}

interface MatrixResponse {
  [itemId: string]: string | string[];
}

export default function MatrixAnswerDisplay({ answerValue, questionType, totalAnswers, questionData }: MatrixAnswerDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse the answer value to extract matrix data
  const parseMatrixAnswer = (value: string): MatrixResponse => {
    try {
      // If it's already a JSON string, parse it directly
      if (value.startsWith('{')) {
        return JSON.parse(value);
      }
      
      // If it's the formatted string from analytics, we need to parse it differently
      // Format: "Item1: [Scale1, Scale2] | Item2: Scale3 | Item3: No selection"
      const matrixData: MatrixResponse = {};
      
      const parts = value.split(' | ');
      parts.forEach(part => {
        const [itemPart, scalePart] = part.split(': ');
        if (itemPart && scalePart) {
          const itemLabel = itemPart.trim();
          const scaleValue = scalePart.trim();
          
          if (scaleValue === 'No selection') {
            matrixData[itemLabel] = [];
          } else if (scaleValue.startsWith('[') && scaleValue.endsWith(']')) {
            // Multiple selections: [Scale1, Scale2]
            const scales = scaleValue.slice(1, -1).split(', ').filter(s => s.trim());
            matrixData[itemLabel] = scales;
          } else {
            // Single selection: Scale1
            matrixData[itemLabel] = scaleValue;
          }
        }
      });
      
      return matrixData;
    } catch (error) {
      console.error('Error parsing matrix answer:', error);
      return {};
    }
  };

  const matrixData = parseMatrixAnswer(answerValue);
  
  // Create mapping from IDs to labels if question data is available
  const itemMap = new Map(questionData?.items?.map(item => [item.id, item.label]) || []);
  const scaleMap = new Map(questionData?.scales?.map(scale => [scale.id, scale.label]) || []);
  
  // Get items and scales, using labels if available, otherwise fall back to IDs
  const items = Object.keys(matrixData).map(itemId => itemMap.get(itemId) || itemId);
  const allScales = new Set<string>();
  
  // Collect all unique scales
  Object.values(matrixData).forEach(scaleValue => {
    if (Array.isArray(scaleValue)) {
      scaleValue.forEach(scale => {
        const scaleLabel = scaleMap.get(scale) || scale;
        allScales.add(scaleLabel);
      });
    } else if (scaleValue) {
      const scaleLabel = scaleMap.get(scaleValue) || scaleValue;
      allScales.add(scaleLabel);
    }
  });

  const scales = Array.from(allScales);

  if (items.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No matrix data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary View */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">
            Matrix Response ({items.length} items)
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full w-full"></div>
          </div>
          <span className="text-sm font-medium text-gray-900 w-12">{totalAnswers}</span>
          <span className="text-sm text-gray-500 w-12">100%</span>
        </div>
      </div>

      {/* Expanded Matrix View */}
      {isExpanded && (
        <div className="mt-4 overflow-x-auto">
          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-900">Matrix Response ({items.length} items)</h4>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certification
                  </th>
                  {scales.map((scale) => (
                    <th key={scale} className="border-r border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider last:border-r-0">
                      {scale}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.keys(matrixData).map((itemId) => {
                  const itemLabel = itemMap.get(itemId) || itemId;
                  const scaleValue = matrixData[itemId];
                  const selectedScales = Array.isArray(scaleValue) ? scaleValue : (scaleValue ? [scaleValue] : []);
                  
                  return (
                    <tr key={itemId} className="hover:bg-gray-50">
                      <td className="border-r border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                        {itemLabel}
                      </td>
                      {scales.map((scaleLabel) => {
                        // Check if this scale is selected for this item
                        const isSelected = selectedScales.some(selectedScale => {
                          const mappedSelectedScale = scaleMap.get(selectedScale) || selectedScale;
                          return mappedSelectedScale === scaleLabel;
                        });
                        
                        return (
                          <td key={scaleLabel} className="border-r border-gray-200 px-4 py-3 text-center last:border-r-0">
                            {isSelected ? (
                              <div className="flex items-center justify-center">
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            ) : (
                              <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compact Summary */}
      {!isExpanded && (
        <div className="text-xs text-gray-500 space-y-1">
          {Object.keys(matrixData).slice(0, 3).map((itemId) => {
            const itemLabel = itemMap.get(itemId) || itemId;
            const scaleValue = matrixData[itemId];
            const selectedScales = Array.isArray(scaleValue) ? scaleValue : (scaleValue ? [scaleValue] : []);
            const selectedScaleLabels = selectedScales.map(scale => scaleMap.get(scale) || scale);
            
            return (
              <div key={itemId} className="flex items-center space-x-2">
                <span className="font-medium">{itemLabel}:</span>
                <span className="text-gray-600">
                  {selectedScaleLabels.length > 0 ? selectedScaleLabels.join(', ') : 'No selection'}
                </span>
              </div>
            );
          })}
          {Object.keys(matrixData).length > 3 && (
            <div className="text-gray-400">
              ... and {Object.keys(matrixData).length - 3} more items
            </div>
          )}
        </div>
      )}
    </div>
  );
}
