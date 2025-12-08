"use client";

import { useState, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';
interface SuggestedChoice {
  id: string;
  label: string;
  description: string;
  category: string;
  choices: Array<{
    value: string;
    label: string;
  }>;
}

interface SuggestedChoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  surveyId: string;
  onChoicesPopulated: (question: any) => void;
  currentChoicesCount?: number;
}

export default function SuggestedChoicesModal({
  isOpen,
  onClose,
  questionId,
  surveyId,
  onChoicesPopulated,
  currentChoicesCount = 0
}: SuggestedChoicesModalProps) {
  const [suggestedChoices, setSuggestedChoices] = useState<SuggestedChoice[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedChoice, setSelectedChoice] = useState<SuggestedChoice | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load suggested choices when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSuggestedChoices();
    }
  }, [isOpen, selectedCategory]);

  const loadSuggestedChoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = new URL(`${config.api.surveyService}/api/surveys/${surveyId}/suggested-choices`);
      if (selectedCategory) {
        url.searchParams.append('category', selectedCategory);
      }

      const response = await fetch(url.toString(), {
        headers: getApiHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load suggested choices');
      }

      const data = await response.json();
      setSuggestedChoices(data.suggestedChoices);
      setCategories(data.categories);
    } catch (err: any) {
      console.error('Error loading suggested choices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateChoices = async () => {
    if (!selectedChoice) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${questionId}/populate-choices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          suggestedChoiceId: selectedChoice.id,
          replaceExisting
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to populate choices');
      }

      const result = await response.json();
      onChoicesPopulated(result.question);
      onClose();
    } catch (err: any) {
      console.error('Error populating choices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedChoice(null);
    setReplaceExisting(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Suggested Choices</h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose from predefined choice sets to quickly populate your question
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[600px]">
          {/* Left Panel - Categories and Choices */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            {/* Category Filter */}
            <div className="p-4 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Choices List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 py-8">
                  <p>{error}</p>
                  <button
                    onClick={loadSuggestedChoices}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedChoices.map((choice) => (
                    <div
                      key={choice.id}
                      onClick={() => setSelectedChoice(choice)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedChoice?.id === choice.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{choice.label}</h3>
                          <p className="text-sm text-gray-500 mt-1">{choice.description}</p>
                          <div className="flex items-center mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {choice.category}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              {choice.choices.length} choices
                            </span>
                          </div>
                        </div>
                        {selectedChoice?.id === choice.id && (
                          <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Preview</h3>
              <p className="text-sm text-gray-500 mt-1">
                See how the choices will appear in your question
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedChoice ? (
                <div>
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900">{selectedChoice.label}</h4>
                    <p className="text-sm text-gray-500">{selectedChoice.description}</p>
                  </div>

                  <div className="space-y-2">
                    {selectedChoice.choices.map((choice, index) => (
                      <div
                        key={choice.value}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="w-4 h-4 border border-gray-300 rounded flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">{choice.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Replace Existing Options */}
                  {currentChoicesCount > 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="replaceExisting"
                          checked={replaceExisting}
                          onChange={(e) => setReplaceExisting(e.target.checked)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <label htmlFor="replaceExisting" className="text-sm font-medium text-gray-900">
                            Replace existing choices
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            This question currently has {currentChoicesCount} choice{currentChoicesCount !== 1 ? 's' : ''}. 
                            Check this to replace them with the suggested choices.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <p>Select a choice set to see preview</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePopulateChoices}
                  disabled={!selectedChoice || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Populating...' : 'Populate Choices'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
