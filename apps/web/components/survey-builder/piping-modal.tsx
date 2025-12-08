"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';

interface PipingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertPipe: (token: string) => void;
  availableQuestions: QuestionWithDetails[];
  currentQuestionId?: string;
}

interface PipingSource {
  id: string;
  label: string;
  icon: string;
  category: 'survey' | 'data' | 'system';
}

const PIPING_SOURCES: PipingSource[] = [
  { id: 'survey-question', label: 'Survey Question', icon: '📝', category: 'survey' },
  { id: 'embedded-data', label: 'Embedded Data Field', icon: '💾', category: 'data' },
  { id: 'geoip-location', label: 'GeoIP Location', icon: '🌍', category: 'system' },
  { id: 'survey-links', label: 'Survey Links', icon: '🔗', category: 'survey' },
  { id: 'date-time', label: 'Date / Time', icon: '📅', category: 'system' },
  { id: 'opt-out-link', label: 'Opt Out Link', icon: '🚫', category: 'system' },
  { id: 'random-number', label: 'Random Number', icon: '🎲', category: 'system' },
  { id: 'panels-field', label: 'Panels Field', icon: '👥', category: 'data' },
  { id: 'loop-merge', label: 'Loop & Merge', icon: '🔄', category: 'survey' }
];

export default function PipingModal({ 
  isOpen, 
  onClose, 
  onInsertPipe, 
  availableQuestions, 
  currentQuestionId 
}: PipingModalProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithDetails | null>(null);

  // Filter questions to only show previous questions (excluding current)
  const previousQuestions = availableQuestions.filter(q => 
    q.id !== currentQuestionId && 
    q.titleTemplate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedSource(null);
      setSearchQuery('');
      setSelectedQuestion(null);
    }
  }, [isOpen]);

  const handleSourceSelect = (sourceId: string) => {
    setSelectedSource(sourceId);
    setSearchQuery('');
    setSelectedQuestion(null);
  };

  const handleQuestionSelect = (question: QuestionWithDetails) => {
    setSelectedQuestion(question);
  };

  const handleInsertPipe = (question: QuestionWithDetails, field: string = 'response') => {
    const token = `\${pipe:question:${question.variableName}:${field}}`;
    onInsertPipe(token);
    onClose();
  };

  const handleInsertSystemPipe = (sourceId: string, field?: string) => {
    let token = '';
    switch (sourceId) {
      case 'embedded-data':
        token = '${pipe:embeddedData:fieldName}';
        break;
      case 'geoip-location':
        token = '${pipe:geoip:country}';
        break;
      case 'date-time':
        token = '${pipe:datetime:now}';
        break;
      case 'random-number':
        token = '${pipe:random:1:100}';
        break;
      default:
        token = `\${pipe:${sourceId}:value}`;
    }
    onInsertPipe(token);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Pipe Text From</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Source Categories */}
          <div className="w-1/2 border-r border-gray-200 p-4">
            <div className="space-y-2">
              {PIPING_SOURCES.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceSelect(source.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center space-x-3 ${
                    selectedSource === source.id
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{source.icon}</span>
                  <span className="text-sm font-medium">{source.label}</span>
                  <span className="ml-auto text-gray-400">›</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel - Source Details */}
          <div className="w-1/2 p-4 flex flex-col">
            {selectedSource === 'survey-question' && (
              <div className="flex flex-col h-full">
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg 
                      className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto">
                  {previousQuestions.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-8">
                      {searchQuery ? 'No questions found matching your search.' : 'No previous questions available.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {previousQuestions.map((question) => (
                        <div
                          key={question.id}
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedQuestion?.id === question.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => handleQuestionSelect(question)}
                        >
                          <div className="flex items-start space-x-2">
                            <span className="text-sm font-medium text-blue-600 flex-shrink-0">
                              {question.variableName}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 line-clamp-2">
                                {question.titleTemplate}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {question.type.replace('_', ' ').toLowerCase()}
                              </p>
                            </div>
                          </div>

                          {/* Pipe Options for Selected Question */}
                          {selectedQuestion?.id === question.id && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInsertPipe(question, 'response');
                                }}
                                className="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded"
                              >
                                Response Value
                              </button>
                              {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInsertPipe(question, 'choiceText');
                                  }}
                                  className="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded"
                                >
                                  Choice Text
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedSource === 'embedded-data' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-4">💾</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Embedded Data Field</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Insert a reference to embedded data that will be replaced with actual values during the survey.
                </p>
                <button
                  onClick={() => handleInsertSystemPipe('embedded-data')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Insert Embedded Data
                </button>
              </div>
            )}

            {selectedSource === 'geoip-location' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-4">🌍</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">GeoIP Location</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Insert location data based on the respondent's IP address.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleInsertSystemPipe('geoip-location')}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Insert Country
                  </button>
                  <button
                    onClick={() => {
                      onInsertPipe('${pipe:geoip:city}');
                      onClose();
                    }}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Insert City
                  </button>
                </div>
              </div>
            )}

            {selectedSource === 'date-time' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-4">📅</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Date / Time</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Insert current date or time information.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleInsertSystemPipe('date-time')}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Insert Current Date
                  </button>
                  <button
                    onClick={() => {
                      onInsertPipe('${pipe:datetime:time}');
                      onClose();
                    }}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Insert Current Time
                  </button>
                </div>
              </div>
            )}

            {selectedSource && !['survey-question', 'embedded-data', 'geoip-location', 'date-time'].includes(selectedSource) && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-4">
                  {PIPING_SOURCES.find(s => s.id === selectedSource)?.icon}
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {PIPING_SOURCES.find(s => s.id === selectedSource)?.label}
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  This piping source is coming soon.
                </p>
                <button
                  disabled
                  className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            )}

            {!selectedSource && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-4">📝</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Piping Source</h4>
                <p className="text-sm text-gray-600">
                  Choose a source from the left panel to pipe text into your question.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
