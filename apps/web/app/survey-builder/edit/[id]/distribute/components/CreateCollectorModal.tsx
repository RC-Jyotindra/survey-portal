'use client';

import { useState } from 'react';

interface CreateCollectorModalProps {
  onClose: () => void;
  onCreate: (data: any) => void;
}

export default function CreateCollectorModal({ onClose, onCreate }: CreateCollectorModalProps) {
  const [formData, setFormData] = useState({
    type: 'PUBLIC',
    name: '',
    slug: '',
    opensAt: '',
    closesAt: '',
    maxResponses: '',
    allowMultiplePerDevice: false,
    allowTest: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const submitData = {
        ...formData,
        opensAt: formData.opensAt ? new Date(formData.opensAt).toISOString() : undefined,
        closesAt: formData.closesAt ? new Date(formData.closesAt).toISOString() : undefined,
        maxResponses: formData.maxResponses ? parseInt(formData.maxResponses) : undefined,
        slug: formData.slug || undefined
      };

      await onCreate(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collector');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    handleChange('slug', slug);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Create Survey Link</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PUBLIC">Public Link</option>
                <option value="SINGLE_USE">Single Use</option>
                <option value="INTERNAL">Internal (Coming Soon)</option>
                <option value="PANEL">Panel (Coming Soon)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.type === 'PUBLIC' && 'Anyone with the link can take the survey'}
                {formData.type === 'SINGLE_USE' && 'Each link can only be used once'}
                {formData.type === 'INTERNAL' && 'Only authenticated users can access'}
                {formData.type === 'PANEL' && 'Access through panel management system'}
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Customer Feedback Survey"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="customer-feedback"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={generateSlug}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to auto-generate from name
              </p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opens At
                </label>
                <input
                  type="datetime-local"
                  value={formData.opensAt}
                  onChange={(e) => handleChange('opensAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closes At
                </label>
                <input
                  type="datetime-local"
                  value={formData.closesAt}
                  onChange={(e) => handleChange('closesAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Max Responses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Responses
              </label>
              <input
                type="number"
                value={formData.maxResponses}
                onChange={(e) => handleChange('maxResponses', e.target.value)}
                placeholder="Leave empty for unlimited"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowMultiplePerDevice"
                  checked={formData.allowMultiplePerDevice}
                  onChange={(e) => handleChange('allowMultiplePerDevice', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowMultiplePerDevice" className="ml-2 text-sm text-gray-700">
                  Allow multiple responses per device
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowTest"
                  checked={formData.allowTest}
                  onChange={(e) => handleChange('allowTest', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowTest" className="ml-2 text-sm text-gray-700">
                  Allow test responses
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {submitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{submitting ? 'Creating...' : 'Create Link'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
