"use client";

import { useState } from 'react';
import { QuestionOption } from '@prisma/client';
import { CreateQuestionOptionData, questionsAPI, QuestionWithDetails } from '@/lib/api/questions-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import OptionDisplayLogicModal from './option-display-logic-modal';

interface QuestionOptionsEditorProps {
  surveyId: string;
  questionId: string;
  options: QuestionOption[];
  onOptionsChange: (options: QuestionOption[]) => void;
  allQuestions?: QuestionWithDetails[];
}

export default function QuestionOptionsEditor({
  surveyId,
  questionId,
  options,
  onOptionsChange,
  allQuestions = []
}: QuestionOptionsEditorProps) {
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayLogicModalOpen, setDisplayLogicModalOpen] = useState(false);
  const [selectedOptionForLogic, setSelectedOptionForLogic] = useState<QuestionOption | null>(null);

  const handleAddOption = async (data: CreateQuestionOptionData) => {
    try {
      setLoading(true);
      setError('');
      
      // Call the API to create the option
      const newOption = await questionsAPI.createQuestionOption(surveyId, questionId, {
        ...data,
        questionId,
        visibleIfExpressionId: data.visibleIfExpressionId || undefined
      });
      
      // Update the options list
      onOptionsChange([...options, newOption]);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add option');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOption = async (optionId: string, data: Partial<CreateQuestionOptionData>) => {
    try {
      setLoading(true);
      setError('');
      
      // Call the API to update the option
      const updatedOption = await questionsAPI.updateQuestionOption(surveyId, questionId, optionId, {
        ...data,
        visibleIfExpressionId: data.visibleIfExpressionId || undefined
      });
      
      // Update the options list
      const updatedOptions = options.map(option =>
        option.id === optionId ? updatedOption : option
      );
      onOptionsChange(updatedOptions);
      setEditingOptionId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update option');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this option?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Call the API to delete the option
      await questionsAPI.deleteQuestionOption(surveyId, questionId, optionId);
      
      // Update the options list
      const updatedOptions = options.filter(option => option.id !== optionId);
      onOptionsChange(updatedOptions);
    } catch (err: any) {
      setError(err.message || 'Failed to delete option');
    } finally {
      setLoading(false);
    }
  };

  const handleReorderOption = async (optionId: string, newIndex: number) => {
    try {
      setLoading(true);
      setError('');
      // This would call the API to reorder options
      const option = options.find(o => o.id === optionId);
      if (!option) return;

      const otherOptions = options.filter(o => o.id !== optionId);
      const updatedOptions = [
        ...otherOptions.slice(0, newIndex),
        { ...option, index: newIndex + 1 },
        ...otherOptions.slice(newIndex).map(o => ({ ...o, index: o.index + 1 }))
      ];

      onOptionsChange(updatedOptions);
    } catch (err: any) {
      setError(err.message || 'Failed to reorder option');
    } finally {
      setLoading(false);
    }
  };

  const handleDisplayLogicClick = (option: QuestionOption) => {
    setSelectedOptionForLogic(option);
    setDisplayLogicModalOpen(true);
  };

  const handleDisplayLogicUpdated = (expressionId: string | null) => {
    if (!selectedOptionForLogic) return;

    const updatedOptions = options.map(option =>
      option.id === selectedOptionForLogic.id
        ? { ...option, visibleIfExpressionId: expressionId }
        : option
    );
    onOptionsChange(updatedOptions);
    setDisplayLogicModalOpen(false);
    setSelectedOptionForLogic(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add Option Button */}
      <div className="flex justify-between items-center">
        <h5 className="text-sm font-medium text-gray-700">
          Options ({options.length})
        </h5>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Option</span>
        </button>
      </div>

      {/* Add Option Form */}
      {showAddForm && (
        <AddOptionForm
          onSubmit={handleAddOption}
          onCancel={() => setShowAddForm(false)}
          loading={loading}
        />
      )}

      {/* Options List */}
      <div className="space-y-2">
        {options.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No options yet. Add your first option above.
          </div>
        ) : (
          options.map((option, index) => (
            <OptionItem
              key={option.id}
              option={option}
              index={index}
              isEditing={editingOptionId === option.id}
              onEdit={() => setEditingOptionId(option.id)}
              onSave={(data) => handleUpdateOption(option.id, data)}
              onCancel={() => setEditingOptionId(null)}
              onDelete={() => handleDeleteOption(option.id)}
              onMoveUp={index > 0 ? () => handleReorderOption(option.id, index - 1) : undefined}
              onMoveDown={index < options.length - 1 ? () => handleReorderOption(option.id, index + 1) : undefined}
              onDisplayLogic={() => handleDisplayLogicClick(option)}
              loading={loading}
            />
          ))
        )}
      </div>

      {/* Option Display Logic Modal */}
      {selectedOptionForLogic && (
        <OptionDisplayLogicModal
          isOpen={displayLogicModalOpen}
          onClose={() => {
            setDisplayLogicModalOpen(false);
            setSelectedOptionForLogic(null);
          }}
          option={selectedOptionForLogic}
          surveyId={surveyId}
          allQuestions={allQuestions}
          onLogicUpdated={handleDisplayLogicUpdated}
        />
      )}
    </div>
  );
}

interface AddOptionFormProps {
  onSubmit: (data: CreateQuestionOptionData) => void;
  onCancel: () => void;
  loading: boolean;
}

function AddOptionForm({ onSubmit, onCancel, loading }: AddOptionFormProps) {
  const [formData, setFormData] = useState({
    value: '',
    labelTemplate: '',
    exclusive: false,
    visibleIfExpressionId: null as string | null
  });

  const handleSubmit = () => {
    if (formData.value.trim() && formData.labelTemplate.trim()) {
      onSubmit({ 
        ...formData, 
        questionId: '',
        visibleIfExpressionId: formData.visibleIfExpressionId || undefined
      });
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h6 className="text-sm font-medium text-gray-900 mb-3">Add New Option</h6>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Value *
            </label>
            <input
              type="text"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="option1"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Label *
            </label>
            <input
              type="text"
              value={formData.labelTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, labelTemplate: e.target.value }))}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Option 1"
              required
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.exclusive}
              onChange={(e) => setFormData(prev => ({ ...prev, exclusive: e.target.checked }))}
              className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-xs text-gray-700">Exclusive (e.g., "None of the above")</span>
          </label>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.value.trim() || !formData.labelTemplate.trim()}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Add Option'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface OptionItemProps {
  option: QuestionOption;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: Partial<CreateQuestionOptionData>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDisplayLogic: () => void;
  loading: boolean;
}

function OptionItem({
  option,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDisplayLogic,
  loading
}: OptionItemProps) {
  const [formData, setFormData] = useState({
    value: option.value,
    labelTemplate: option.labelTemplate,
    exclusive: option.exclusive,
    visibleIfExpressionId: option.visibleIfExpressionId
  });

  const handleSave = () => {
    onSave({
      ...formData,
      visibleIfExpressionId: formData.visibleIfExpressionId || undefined
    });
  };

  if (isEditing) {
    return (
      <div className="bg-blue-50 rounded-lg p-3">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="text"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={formData.labelTemplate}
                onChange={(e) => setFormData(prev => ({ ...prev, labelTemplate: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.exclusive}
              onChange={(e) => setFormData(prev => ({ ...prev, exclusive: e.target.checked }))}
              className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-xs text-gray-700">Exclusive</span>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        
        <div>
          <div className="text-sm font-medium text-gray-900">{option.labelTemplate}</div>
          <div className="text-xs text-gray-500">Value: {option.value}</div>
          <div className="flex items-center space-x-2 mt-1">
            {option.exclusive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Exclusive
              </span>
            )}
            {option.visibleIfExpressionId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Conditional
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={onDisplayLogic}
          className="text-gray-400 hover:text-blue-600 p-1"
          disabled={loading}
          title="Set Display Logic"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-gray-600 p-1"
          disabled={loading}
          title="Edit Option"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600 p-1"
          disabled={loading}
          title="Delete Option"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
