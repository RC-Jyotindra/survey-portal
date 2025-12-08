"use client";

import { useState } from 'react';
import { pagesAPI, PageWithQuestions, CreatePageData } from '@/lib/api/pages-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface PageManagerProps {
  surveyId: string;
  pages: PageWithQuestions[];
  onPageCreated: (page: PageWithQuestions) => void;
  onPageUpdated: (page: PageWithQuestions) => void;
  onPageDeleted: (pageId: string) => void;
  selectedPageId: string | null;
  onPageSelected: (pageId: string) => void;
}

export default function PageManager({
  surveyId,
  pages,
  onPageCreated,
  onPageUpdated,
  onPageDeleted,
  selectedPageId,
  onPageSelected
}: PageManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreatePage = async (data: CreatePageData) => {
    try {
      setLoading(true);
      setError('');
      const newPage = await pagesAPI.createPage(surveyId, data);
      onPageCreated(newPage);
      setShowCreateForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create page');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePage = async (pageId: string, data: CreatePageData) => {
    try {
      setLoading(true);
      setError('');
      const updatedPage = await pagesAPI.updatePage(surveyId, pageId, data);
      onPageUpdated(updatedPage);
      setEditingPageId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update page');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await pagesAPI.deletePage(surveyId, pageId);
      onPageDeleted(pageId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete page');
    } finally {
      setLoading(false);
    }
  };

  const handleReorderPage = async (pageId: string, newIndex: number) => {
    try {
      setLoading(true);
      setError('');
      await pagesAPI.reorderPage(surveyId, pageId, newIndex);
      // Reload pages to get updated order
      const updatedPages = await pagesAPI.getPages(surveyId);
      updatedPages.forEach((page: PageWithQuestions) => onPageUpdated(page));
    } catch (err: any) {
      setError(err.message || 'Failed to reorder page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pages</h2>
          <p className="text-gray-600">Manage your survey pages and their order</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Page</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Create Page Form */}
      {showCreateForm && (
        <CreatePageForm
          onSubmit={handleCreatePage}
          onCancel={() => setShowCreateForm(false)}
          loading={loading}
        />
      )}

      {/* Pages List */}
      <div className="bg-white rounded-lg shadow">
        {pages.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pages</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first page.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Page
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pages.map((page, index) => (
              <PageItem
                key={page.id}
                page={page}
                index={index}
                isSelected={selectedPageId === page.id}
                isEditing={editingPageId === page.id}
                onSelect={() => onPageSelected(page.id)}
                onEdit={() => setEditingPageId(page.id)}
                onSave={(data) => handleUpdatePage(page.id, data)}
                onCancel={() => setEditingPageId(null)}
                onDelete={() => handleDeletePage(page.id)}
                onMoveUp={index > 0 ? () => handleReorderPage(page.id, index) : undefined}
                onMoveDown={index < pages.length - 1 ? () => handleReorderPage(page.id, index + 2) : undefined}
                loading={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CreatePageFormProps {
  onSubmit: (data: CreatePageData) => void;
  onCancel: () => void;
  loading: boolean;
}

function CreatePageForm({ onSubmit, onCancel, loading }: CreatePageFormProps) {
  const [formData, setFormData] = useState<CreatePageData>({
    titleTemplate: '',
    descriptionTemplate: '',
    questionOrderMode: 'SEQUENTIAL'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Page</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page Title
          </label>
          <input
            type="text"
            value={formData.titleTemplate || ''}
            onChange={(e) => setFormData((prev: CreatePageData) => ({ ...prev, titleTemplate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter page title (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page Description
          </label>
          <textarea
            value={formData.descriptionTemplate || ''}
            onChange={(e) => setFormData((prev: CreatePageData) => ({ ...prev, descriptionTemplate: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter page description (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question Order Mode
          </label>
          <select
            value={formData.questionOrderMode}
            onChange={(e) => setFormData((prev: CreatePageData) => ({ ...prev, questionOrderMode: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="SEQUENTIAL">Sequential</option>
            <option value="RANDOM">Random</option>
            <option value="GROUP_RANDOM">Group Random</option>
            <option value="WEIGHTED">Weighted</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Create Page'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface PageItemProps {
  page: PageWithQuestions;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (data: CreatePageData) => void;
  onCancel: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  loading: boolean;
}

function PageItem({
  page,
  index,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
  loading
}: PageItemProps) {
  const [formData, setFormData] = useState<CreatePageData>({
    titleTemplate: page.titleTemplate || '',
    descriptionTemplate: page.descriptionTemplate || '',
    questionOrderMode: page.questionOrderMode
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (isEditing) {
    return (
      <div className="p-6 bg-blue-50">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Title
            </label>
            <input
              type="text"
              value={formData.titleTemplate || ''}
              onChange={(e) => setFormData((prev: CreatePageData) => ({ ...prev, titleTemplate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Description
            </label>
            <textarea
              value={formData.descriptionTemplate || ''}
              onChange={(e) => setFormData((prev: CreatePageData) => ({ ...prev, descriptionTemplate: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Order Mode
            </label>
            <select
              value={formData.questionOrderMode}
              onChange={(e) => setFormData((prev: CreatePageData) => ({ ...prev, questionOrderMode: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SEQUENTIAL">Sequential</option>
              <option value="RANDOM">Random</option>
              <option value="GROUP_RANDOM">Group Random</option>
              <option value="WEIGHTED">Weighted</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className={`p-6 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            {onMoveUp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
            {onMoveDown && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {page.titleTemplate || `Page ${index + 1}`}
            </h3>
            {page.descriptionTemplate && (
              <p className="text-sm text-gray-600 mt-1">{page.descriptionTemplate}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>{page._count.questions} questions</span>
              <span>•</span>
              <span className="capitalize">{page.questionOrderMode.toLowerCase().replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-400 hover:text-red-600 p-1"
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
