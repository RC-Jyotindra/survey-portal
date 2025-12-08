"use client";

import { useState } from 'react';
import { QuestionType } from '@/lib/api/questions-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface QuestionTypeSelectorProps {
  questionTypes: { value: QuestionType; label: string; description: string; icon: string }[];
  onSelect: (type: QuestionType) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function QuestionTypeSelector({
  questionTypes,
  onSelect,
  onCancel,
  loading
}: QuestionTypeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTypes = questionTypes.filter(type =>
    type.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = {
    'Choice Questions': ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'],
    'Text Questions': ['TEXT', 'TEXTAREA', 'DESCRIPTIVE'],
    'Number Questions': ['NUMBER', 'DECIMAL', 'SLIDER'],
    'Date & Time': ['DATE', 'TIME'],
    'Special': ['BOOLEAN', 'RANK', 'MATRIX', 'FILE_UPLOAD']
  };

  const getCategoryForType = (type: QuestionType) => {
    for (const [category, types] of Object.entries(categories)) {
      if (types.includes(type)) {
        return category;
      }
    }
    return 'Other';
  };

  const groupedTypes = filteredTypes.reduce((acc, type) => {
    const category = getCategoryForType(type.value);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(type);
    return acc;
  }, {} as Record<string, typeof questionTypes>);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Select Question Type</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mt-4">
          <input
            type="text"
            placeholder="Search question types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="p-6 max-h-96 overflow-y-auto">
        {Object.keys(groupedTypes).length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No question types found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTypes).map(([category, types]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-700 mb-3">{category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {types.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => onSelect(type.value)}
                      disabled={loading}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl flex-shrink-0">{type.icon}</span>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-sm font-medium text-gray-900">{type.label}</h5>
                          <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                        </div>
                        {loading && (
                          <div className="flex-shrink-0">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
