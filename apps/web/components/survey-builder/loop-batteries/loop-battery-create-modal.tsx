"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';
import { LoopBattery } from './types';

interface Page {
  id: string;
  index: number;
  titleTemplate: string | null;
}

interface LoopBatteryCreateModalProps {
  surveyId: string;
  pageId: string;
  availableSourceQuestions: QuestionWithDetails[];
  allPages: Page[];
  onBatteryCreated: (battery: LoopBattery) => void;
  onClose: () => void;
}

interface Page {
  id: string;
  index: number;
  titleTemplate: string | null;
}

export default function LoopBatteryCreateModal({
  surveyId,
  pageId,
  availableSourceQuestions,
  allPages,
  onBatteryCreated,
  onClose
}: LoopBatteryCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    startPageId: pageId,
    endPageId: '',
    sourceType: 'ANSWER' as 'ANSWER' | 'DATASET',
    sourceQuestionId: '',
    maxItems: 5,
    randomize: true,
    sampleWithoutReplacement: true
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Loop battery name is required';
    }

    if (!formData.endPageId) {
      newErrors.endPageId = 'End page is required';
    }

    if (formData.startPageId && formData.endPageId) {
      const startPage = allPages.find(p => p.id === formData.startPageId);
      const endPage = allPages.find(p => p.id === formData.endPageId);
      
      if (startPage && endPage && startPage.index >= endPage.index) {
        newErrors.endPageId = 'End page must come after start page';
      }
    }

    if (formData.sourceType === 'ANSWER' && !formData.sourceQuestionId) {
      newErrors.sourceQuestionId = 'Source question is required for answer-driven loops';
    }

    if (formData.maxItems && formData.maxItems < 1) {
      newErrors.maxItems = 'Max items must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/loop-batteries`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create loop battery');
      }

      const result = await response.json();
      onBatteryCreated(result.loopBattery);
    } catch (error: any) {
      console.error('Error creating loop battery:', error);
      alert(error.message || 'Failed to create loop battery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableEndPages = (): Page[] => {
    const startPage = allPages.find(p => p.id === formData.startPageId);
    if (!startPage) return [];
    
    return allPages.filter(page => page.index > startPage.index);
  };

  const getPageIndex = (pageId: string): number => {
    const page = allPages.find(p => p.id === pageId);
    return page?.index || 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Create Loop Battery</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Loop Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loop Battery Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Brand Satisfaction Loop"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Page Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Range
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Page</label>
                  <select
                    value={formData.startPageId}
                    onChange={(e) => handleInputChange('startPageId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {allPages.map(page => (
                      <option key={page.id} value={page.id}>
                        Page {page.index}: {page.titleTemplate || `Block ${page.index}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Page</label>
                  <select
                    value={formData.endPageId}
                    onChange={(e) => handleInputChange('endPageId', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.endPageId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select end page</option>
                    {getAvailableEndPages().map(page => (
                      <option key={page.id} value={page.id}>
                        Page {page.index}: {page.titleTemplate || `Block ${page.index}`}
                      </option>
                    ))}
                  </select>
                  {errors.endPageId && (
                    <p className="mt-1 text-sm text-red-600">{errors.endPageId}</p>
                  )}
                </div>
              </div>
              
              {/* Visual Page Range Indicator */}
              {formData.startPageId && formData.endPageId && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-2">Page Flow:</div>
                  <div className="flex items-center space-x-2 text-sm">
                    {allPages
                      .filter(p => p.index >= getPageIndex(formData.startPageId) - 1 && 
                                   p.index <= getPageIndex(formData.endPageId) + 1)
                      .map(page => (
                        <div key={page.id} className="flex items-center space-x-1">
                          {page.index === getPageIndex(formData.startPageId) - 1 && (
                            <span className="text-gray-400">→</span>
                          )}
                          <div className={`px-2 py-1 rounded text-xs ${
                            page.id === formData.startPageId || page.id === formData.endPageId
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : page.index > getPageIndex(formData.startPageId) && page.index < getPageIndex(formData.endPageId)
                              ? 'bg-purple-50 text-purple-600 border border-purple-100'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {page.index}
                          </div>
                          {page.index === getPageIndex(formData.endPageId) + 1 && (
                            <span className="text-gray-400">→</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Source Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Item Source
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="answer-driven"
                    name="sourceType"
                    value="ANSWER"
                    checked={formData.sourceType === 'ANSWER'}
                    onChange={(e) => handleInputChange('sourceType', e.target.value)}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <label htmlFor="answer-driven" className="text-sm text-gray-900">
                    Answer-driven (from previous question)
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="dataset-driven"
                    name="sourceType"
                    value="DATASET"
                    checked={formData.sourceType === 'DATASET'}
                    onChange={(e) => handleInputChange('sourceType', e.target.value)}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <label htmlFor="dataset-driven" className="text-sm text-gray-900">
                    Dataset-driven (static list)
                  </label>
                </div>
              </div>
            </div>

            {/* Source Question Selection */}
            {formData.sourceType === 'ANSWER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Question
                </label>
                <select
                  value={formData.sourceQuestionId}
                  onChange={(e) => handleInputChange('sourceQuestionId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.sourceQuestionId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a multi-select question</option>
                  {availableSourceQuestions.map(question => (
                    <option key={question.id} value={question.id}>
                      {question.variableName}: {question.titleTemplate}
                    </option>
                  ))}
                </select>
                {errors.sourceQuestionId && (
                  <p className="mt-1 text-sm text-red-600">{errors.sourceQuestionId}</p>
                )}
                {availableSourceQuestions.length === 0 && (
                  <p className="mt-1 text-sm text-yellow-600">
                    No multi-select questions available. Create a multiple choice question first.
                  </p>
                )}
              </div>
            )}

            {/* Dataset-driven Information */}
            {formData.sourceType === 'DATASET' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Dataset-driven Loop</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      After creating this loop battery, you can add dataset items with custom attributes. 
                      Use variables like <code className="bg-white px-1 rounded">{`{{loop.label}}`}</code>, 
                      <code className="bg-white px-1 rounded">{`{{loop.price}}`}</code>, 
                      <code className="bg-white px-1 rounded">{`{{loop.rating}}`}</code> in your questions.
                    </p>
                    <div className="mt-2 text-xs text-blue-600">
                      <strong>Example:</strong> "How satisfied are you with {`{{loop.label}}`}? The {`{{loop.label}}`} costs {`{{loop.price}}`} and has a {`{{loop.rating}}`} rating."
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loop Behavior */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Loop Behavior
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max items per respondent</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxItems}
                    onChange={(e) => handleInputChange('maxItems', parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.maxItems ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.maxItems && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxItems}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Limit how many items each respondent sees</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="randomize"
                      checked={formData.randomize}
                      onChange={(e) => handleInputChange('randomize', e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="randomize" className="text-sm text-gray-900">
                      Randomize item order
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sampleWithoutReplacement"
                      checked={formData.sampleWithoutReplacement}
                      onChange={(e) => handleInputChange('sampleWithoutReplacement', e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="sampleWithoutReplacement" className="text-sm text-gray-900">
                      Sample without replacement
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Loop Battery'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
