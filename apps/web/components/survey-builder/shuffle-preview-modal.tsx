"use client";

import { getApiHeaders } from '@/lib/api-headers';
import { useState, useEffect } from 'react';
import { config } from '@/lib/config';
interface ShufflePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  surveyId: string;
  groupOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
}

interface PreviewGroup {
  id: string;
  titleTemplate: string;
  questionCount: number;
  questions: Array<{
    id: string;
    variableName: string;
    titleTemplate: string;
    type: string;
  }>;
}

interface ShuffledOrder {
  position: number;
  id: string;
  variableName: string;
  titleTemplate: string;
  type: string;
  groupId: string | null;
}

export default function ShufflePreviewModal({
  isOpen,
  onClose,
  pageId,
  surveyId,
  groupOrderMode
}: ShufflePreviewModalProps) {
  const [preview, setPreview] = useState<{
    groups: PreviewGroup[];
    shuffledOrder: ShuffledOrder[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen, pageId, surveyId]);

  const loadPreview = async () => {
    if (!pageId || !surveyId) {
      setError('Page ID or Survey ID is missing');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${pageId}/preview-shuffle`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          preview: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load shuffle preview');
      }

      const data = await response.json();
      setPreview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const getOrderModeDescription = () => {
    switch (groupOrderMode) {
      case 'SEQUENTIAL':
        return 'Groups and questions appear in their original order';
      case 'RANDOM':
        return 'All questions are shuffled individually, ignoring groups';
      case 'GROUP_RANDOM':
        return 'Groups are shuffled, but questions within each group stay in order';
      case 'WEIGHTED':
        return 'Groups are ordered based on their assigned weights';
      default:
        return 'Unknown order mode';
    }
  };

  const getOrderModeIcon = () => {
    switch (groupOrderMode) {
      case 'SEQUENTIAL':
        return '➡️';
      case 'RANDOM':
        return '🔀';
      case 'GROUP_RANDOM':
        return '🎲';
      case 'WEIGHTED':
        return '⚖️';
      default:
        return '❓';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Shuffle Preview</h3>
            <p className="text-sm text-gray-500 mt-1">Preview how your questions will be ordered</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading preview...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {preview && (
            <div className="space-y-6">
              {/* Order Mode Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getOrderModeIcon()}</span>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Current Order Mode</h4>
                    <p className="text-sm text-blue-700">{getOrderModeDescription()}</p>
                  </div>
                </div>
              </div>

              {/* Groups Overview */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Groups Overview</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {preview.groups.map((group, index) => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-900">
                          {group.titleTemplate || `Group ${index + 1}`}
                        </h5>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {group.questionCount} questions
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {group.questions.map(q => q.variableName).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shuffled Order */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Question Order Preview</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {preview.shuffledOrder.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                        {/* Position */}
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {item.position}
                        </div>

                        {/* Question Info */}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {item.variableName}: {item.titleTemplate}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.type}
                          </div>
                        </div>

                        {/* Group Info */}
                        <div className="flex-shrink-0">
                          {item.groupId ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {preview.groups.find(g => g.id === item.groupId)?.titleTemplate || 'Group'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Ungrouped
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Total Questions</div>
                    <div className="font-medium">{preview.shuffledOrder.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Groups</div>
                    <div className="font-medium">{preview.groups.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Grouped Questions</div>
                    <div className="font-medium">
                      {preview.shuffledOrder.filter(q => q.groupId).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Ungrouped Questions</div>
                    <div className="font-medium">
                      {preview.shuffledOrder.filter(q => !q.groupId).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={loadPreview}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Preview'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
