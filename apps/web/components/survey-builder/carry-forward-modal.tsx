"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';

interface CarryForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: CarryForwardConfig) => void;
  availableQuestions: QuestionWithDetails[];
  currentQuestion: QuestionWithDetails;
  initialConfig?: CarryForwardConfig | null;
}

export interface CarryForwardConfig {
  sourceQuestionId: string;
  filterType: 'ALL_CHOICES' | 'DISPLAYED_CHOICES' | 'NOT_DISPLAYED_CHOICES' | 'SELECTED_CHOICES' | 'UNSELECTED_CHOICES';
}

const FILTER_OPTIONS = [
  { 
    value: 'ALL_CHOICES', 
    label: 'All Choices - Displayed & Hidden',
    description: 'Include all choices from the source question regardless of display logic'
  },
  { 
    value: 'DISPLAYED_CHOICES', 
    label: 'Displayed Choices',
    description: 'Only include choices that were actually shown to the respondent'
  },
  { 
    value: 'NOT_DISPLAYED_CHOICES', 
    label: 'Not Displayed Choices',
    description: 'Only include choices that were hidden from the respondent'
  },
  { 
    value: 'SELECTED_CHOICES', 
    label: 'Selected Choices',
    description: 'Only include choices that the respondent selected'
  },
  { 
    value: 'UNSELECTED_CHOICES', 
    label: 'Unselected Choices',
    description: 'Only include choices that the respondent did not select'
  }
] as const;

export default function CarryForwardModal({
  isOpen,
  onClose,
  onConfirm,
  availableQuestions,
  currentQuestion,
  initialConfig
}: CarryForwardModalProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [selectedFilterType, setSelectedFilterType] = useState<CarryForwardConfig['filterType']>('SELECTED_CHOICES');

  // Filter to only show questions that can be carried forward (have choices)
  const carryForwardableQuestions = availableQuestions.filter(q => 
    q.id !== currentQuestion.id && 
    (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE' || q.type === 'DROPDOWN') &&
    q.options && q.options.length > 0
  );

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setSelectedQuestionId(initialConfig.sourceQuestionId);
        setSelectedFilterType(initialConfig.filterType);
      } else {
        setSelectedQuestionId('');
        setSelectedFilterType('SELECTED_CHOICES');
      }
    }
  }, [isOpen, initialConfig]);

  const handleConfirm = () => {
    if (selectedQuestionId) {
      onConfirm({
        sourceQuestionId: selectedQuestionId,
        filterType: selectedFilterType
      });
    }
  };

  const selectedQuestion = carryForwardableQuestions.find(q => q.id === selectedQuestionId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Carry forward choices</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Source Question Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Carry forward choices from
              </label>
              
              <div className="space-y-3">
                {carryForwardableQuestions.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
                    No previous questions with choices are available for carry forward.
                    Only Single Choice, Multiple Choice, and Dropdown questions can be used as sources.
                  </div>
                ) : (
                  carryForwardableQuestions.map((question) => (
                    <div key={question.id} className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id={`question-${question.id}`}
                        name="sourceQuestion"
                        value={question.id}
                        checked={selectedQuestionId === question.id}
                        onChange={(e) => setSelectedQuestionId(e.target.value)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor={`question-${question.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-blue-600">{question.variableName}</span>
                          <span className="text-sm text-gray-600">{question.titleTemplate}</span>
                        </div>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {question.options.length} choice{question.options.length !== 1 ? 's' : ''}: {' '}
                            {question.options.slice(0, 3).map(opt => opt.labelTemplate).join(', ')}
                            {question.options.length > 3 && ` and ${question.options.length - 3} more...`}
                          </div>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Filter Type Selection */}
            {selectedQuestionId && (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-sm text-gray-700">that are</span>
                  <select
                    value={selectedFilterType}
                    onChange={(e) => setSelectedFilterType(e.target.value as CarryForwardConfig['filterType'])}
                    className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Description */}
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">
                        {FILTER_OPTIONS.find(opt => opt.value === selectedFilterType)?.label}
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        {FILTER_OPTIONS.find(opt => opt.value === selectedFilterType)?.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {selectedQuestion && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Preview of choices to be carried forward:</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        {currentQuestion.titleTemplate}
                      </div>
                      <div className="space-y-2">
                        {selectedQuestion.options?.map((option, index) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <div className="w-4 h-4 border border-gray-300 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-gray-400 rounded-full opacity-50"></div>
                            </div>
                            <span className="text-sm text-gray-700">{option.labelTemplate}</span>
                            <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-0.5 rounded">
                              from {selectedQuestion.variableName}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        * Final choices will depend on respondent's answers and the filter applied
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedQuestionId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
