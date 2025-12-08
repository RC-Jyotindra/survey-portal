'use client';

import React, { useState } from 'react';

interface RandomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'page' | 'question' | 'group';
  currentMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
  onSave: (mode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED') => Promise<void>;
  isLoading?: boolean;
}

const RandomizationModal: React.FC<RandomizationModalProps> = ({
  isOpen,
  onClose,
  type,
  currentMode,
  onSave,
  isLoading = false
}) => {
  const [selectedMode, setSelectedMode] = useState<'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED'>(currentMode);

  const handleSave = async () => {
    try {
      await onSave(selectedMode);
      onClose();
    } catch (error) {
      console.error('Error saving randomization settings:', error);
      alert('Failed to save randomization settings');
    }
  };

  const getModeDescription = (mode: string) => {
    if (type === 'page') {
      switch (mode) {
        case 'SEQUENTIAL':
          return 'Questions appear in the order they were created (Q1, Q2, Q3, Q4)';
        case 'RANDOM':
          return 'Questions are randomly shuffled each time the page loads';
        case 'GROUP_RANDOM':
          return 'Question groups are shuffled, but questions within groups stay together';
        case 'WEIGHTED':
          return 'Questions are ordered by their weight (higher weight = higher priority)';
        default:
          return '';
      }
    } else if (type === 'group') {
      switch (mode) {
        case 'SEQUENTIAL':
          return 'Groups appear in the order they were created (Group 1, Group 2, Group 3)';
        case 'RANDOM':
          return 'Groups are randomly shuffled each time the page loads';
        case 'GROUP_RANDOM':
          return 'Groups are shuffled, but questions within each group stay in order';
        case 'WEIGHTED':
          return 'Groups are ordered by their weight (higher weight = higher priority)';
        default:
          return '';
      }
    } else {
      switch (mode) {
        case 'SEQUENTIAL':
          return 'Options appear in the order they were created (A, B, C, D)';
        case 'RANDOM':
          return 'Options are randomly shuffled each time the question loads';
        case 'GROUP_RANDOM':
          return 'Option groups are shuffled, but options within groups stay together';
        case 'WEIGHTED':
          return 'Options are ordered by their weight (higher weight = higher priority)';
        default:
          return '';
      }
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'SEQUENTIAL':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      case 'RANDOM':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'GROUP_RANDOM':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'WEIGHTED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {type === 'page' ? 'Question Randomization' : type === 'group' ? 'Group Shuffling' : 'Option Shuffling'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Choose how {type === 'page' ? 'questions' : type === 'group' ? 'groups' : 'options'} should be ordered:
            </p>

            <div className="space-y-3">
              {(['SEQUENTIAL', 'RANDOM', 'GROUP_RANDOM', 'WEIGHTED'] as const).map((mode) => (
                <label
                  key={mode}
                  className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedMode === mode
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="randomizationMode"
                    value={mode}
                    checked={selectedMode === mode}
                    onChange={(e) => setSelectedMode(e.target.value as any)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`p-1 rounded ${
                        selectedMode === mode ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {getModeIcon(mode)}
                      </div>
                      <span className={`font-medium ${
                        selectedMode === mode ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {mode === 'SEQUENTIAL' && 'Sequential'}
                        {mode === 'RANDOM' && 'Random'}
                        {mode === 'GROUP_RANDOM' && 'Group Random'}
                        {mode === 'WEIGHTED' && 'Weighted'}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      selectedMode === mode ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      {getModeDescription(mode)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {selectedMode === 'SEQUENTIAL' && 'No randomization applied'}
              {selectedMode === 'RANDOM' && (type === 'group' ? 'Group randomization enabled' : 'Full randomization enabled')}
              {selectedMode === 'GROUP_RANDOM' && (type === 'group' ? 'Group shuffling enabled' : 'Group-based randomization enabled')}
              {selectedMode === 'WEIGHTED' && 'Weight-based ordering enabled'}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || selectedMode === currentMode}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomizationModal;
