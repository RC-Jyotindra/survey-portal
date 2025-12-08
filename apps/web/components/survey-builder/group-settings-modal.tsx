"use client";

import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';
import { useState, useEffect } from 'react';

interface QuestionGroup {
  id: string;
  pageId: string;
  index: number;
  key?: string;
  titleTemplate?: string;
  descriptionTemplate?: string;
  innerOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
  questions: any[];
}

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: QuestionGroup | null;
  surveyId: string;
  onGroupUpdated: (group: QuestionGroup) => void;
}

export default function GroupSettingsModal({
  isOpen,
  onClose,
  group,
  surveyId,
  onGroupUpdated
}: GroupSettingsModalProps) {
  const [formData, setFormData] = useState({
    titleTemplate: '',
    descriptionTemplate: '',
    key: '',
    innerOrderMode: 'SEQUENTIAL' as 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (group) {
      setFormData({
        titleTemplate: group.titleTemplate || '',
        descriptionTemplate: group.descriptionTemplate || '',
        key: group.key || '',
        innerOrderMode: group.innerOrderMode
      });
    }
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !surveyId) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${group.pageId}/groups/${group.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update group');
      }

      const result = await response.json();
      onGroupUpdated(result.group);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Group Settings</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Group Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Title
              </label>
              <input
                type="text"
                value={formData.titleTemplate}
                onChange={(e) => handleInputChange('titleTemplate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Demographics, Preferences"
                required
              />
            </div>

            {/* Group Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.descriptionTemplate}
                onChange={(e) => handleInputChange('descriptionTemplate', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this group contains..."
              />
            </div>

            {/* Group Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Key (Optional)
              </label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => handleInputChange('key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., DEMO, PREF, etc."
              />
              <p className="text-xs text-gray-500 mt-1">Used for referencing in exports and logic</p>
            </div>

            {/* Question Order Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Order Within Group
              </label>
              <select
                value={formData.innerOrderMode}
                onChange={(e) => handleInputChange('innerOrderMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SEQUENTIAL">Sequential (1, 2, 3...)</option>
                <option value="RANDOM">Random (shuffle all questions)</option>
                <option value="GROUP_RANDOM">Group Random (keep group order, shuffle groups)</option>
                <option value="WEIGHTED">Weighted (based on question weights)</option>
              </select>
              <div className="mt-2 text-xs text-gray-500">
                {formData.innerOrderMode === 'SEQUENTIAL' && (
                  <span>Questions will appear in the order they were added to the group.</span>
                )}
                {formData.innerOrderMode === 'RANDOM' && (
                  <span>All questions in this group will be shuffled randomly.</span>
                )}
                {formData.innerOrderMode === 'GROUP_RANDOM' && (
                  <span>This group will be shuffled with other groups, but questions within the group stay in order.</span>
                )}
                {formData.innerOrderMode === 'WEIGHTED' && (
                  <span>Questions will be ordered based on their assigned weights.</span>
                )}
              </div>
            </div>

            {/* Group Statistics */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Group Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Questions</div>
                  <div className="font-medium">{group.questions.length}</div>
                </div>
                <div>
                  <div className="text-gray-500">Group Index</div>
                  <div className="font-medium">{group.index + 1}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
