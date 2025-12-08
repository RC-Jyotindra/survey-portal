"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails, CreateQuestionData, QuestionType } from '@/lib/api/questions-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import QuestionOptionsEditor from './question-options-editor';
import MatrixEditor from './matrix-editor';

interface QuestionEditorProps {
  question: QuestionWithDetails;
  onSave: (data: CreateQuestionData) => void;
  onCancel: () => void;
  loading: boolean;
  onQuestionUpdated?: (question: QuestionWithDetails) => void;
  allQuestions?: QuestionWithDetails[];
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'TEXT', label: 'Text Input' },
  { value: 'TEXTAREA', label: 'Long Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIME', label: 'Time' },
  { value: 'BOOLEAN', label: 'Yes/No' },
  { value: 'RANK', label: 'Ranking' },
  { value: 'SLIDER', label: 'Slider' },
  { value: 'MATRIX', label: 'Matrix' },
  { value: 'DESCRIPTIVE', label: 'Text Block' },
  { value: 'MESSAGE', label: 'Message' },
  { value: 'FILE_UPLOAD', label: 'File Upload' }
];

const OPTION_BASED_TYPES: QuestionType[] = [
  'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RANK'
];

const MATRIX_TYPES: QuestionType[] = ['MATRIX'];

export default function QuestionEditor({
  question,
  onSave,
  onCancel,
  loading,
  onQuestionUpdated,
  allQuestions = []
}: QuestionEditorProps) {
  const [formData, setFormData] = useState<CreateQuestionData>({
    pageId: question.pageId,
    type: question.type,
    variableName: question.variableName,
    titleTemplate: question.titleTemplate,
    helpTextTemplate: question.helpTextTemplate || undefined,
    required: question.required,
    validation: question.validation,
    optionOrderMode: question.optionOrderMode,
    optionsSource: question.optionsSource,
    carryForwardQuestionId: question.carryForwardQuestionId || undefined,
    carryForwardFilterExprId: question.carryForwardFilterExprId || undefined,
    visibleIfExpressionId: question.visibleIfExpressionId || undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.titleTemplate?.trim()) {
      newErrors.titleTemplate = 'Question title is required';
    }

    if (!formData.variableName?.trim()) {
      newErrors.variableName = 'Variable name is required';
    } else if (!/^Q[0-9]+$/.test(formData.variableName)) {
      newErrors.variableName = 'Variable name must be in format Q1, Q2, etc.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleFieldChange = (field: keyof CreateQuestionData, value: any) => {
    setFormData((prev: CreateQuestionData) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [field as string]: '' }));
    }
  };

  const showOptionsEditor = OPTION_BASED_TYPES.includes(formData.type);
  const showMatrixEditor = MATRIX_TYPES.includes(formData.type);
  const showMessageEditor = formData.type === 'MESSAGE';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Basic Settings</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleFieldChange('type', e.target.value as QuestionType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {QUESTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Title *
            </label>
            <textarea
              value={formData.titleTemplate}
              onChange={(e) => handleFieldChange('titleTemplate', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.titleTemplate ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your question..."
            />
            {errors.titleTemplate && (
              <p className="mt-1 text-sm text-red-600">{errors.titleTemplate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variable Name *
            </label>
            <input
              type="text"
              value={formData.variableName}
              onChange={(e) => handleFieldChange('variableName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.variableName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Q1, Q2, etc."
            />
            {errors.variableName && (
              <p className="mt-1 text-sm text-red-600">{errors.variableName}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Used for data analysis and logic. Must be unique within the survey.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Help Text
            </label>
            <textarea
              value={formData.helpTextTemplate || ''}
              onChange={(e) => handleFieldChange('helpTextTemplate', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional instructions or help text..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) => handleFieldChange('required', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
              Required question
            </label>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Advanced Settings</h4>
          
          {showOptionsEditor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option Order Mode
              </label>
              <select
                value={formData.optionOrderMode}
                onChange={(e) => handleFieldChange('optionOrderMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SEQUENTIAL">Sequential</option>
                <option value="RANDOM">Random</option>
                <option value="GROUP_RANDOM">Group Random</option>
                <option value="WEIGHTED">Weighted</option>
              </select>
            </div>
          )}

          {showOptionsEditor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options Source
              </label>
              <select
                value={formData.optionsSource}
                onChange={(e) => handleFieldChange('optionsSource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="STATIC">Static Options</option>
                <option value="CARRY_FORWARD">Carry Forward from Other Question</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Validation Rules
            </label>
            <textarea
              value={formData.validation ? JSON.stringify(formData.validation, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                  handleFieldChange('validation', parsed);
                } catch {
                  // Invalid JSON, keep as string for now
                }
              }}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"min": 1, "max": 100, "pattern": "^[a-zA-Z]+$"}'
            />
            <p className="mt-1 text-xs text-gray-500">
              JSON object with validation rules (min, max, pattern, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Options Editor */}
      {showOptionsEditor && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Question Options</h4>
          <QuestionOptionsEditor
            surveyId={question.surveyId}
            questionId={question.id}
            options={question.options}
            allQuestions={allQuestions}
            onOptionsChange={(options) => {
              // Update the question with new options
              if (onQuestionUpdated) {
                onQuestionUpdated({
                  ...question,
                  options
                });
              }
            }}
          />
        </div>
      )}

      {/* Matrix Editor */}
      {showMatrixEditor && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Matrix Configuration</h4>
          <MatrixEditor
            question={question}
            surveyId={question.surveyId}
            onQuestionUpdated={onQuestionUpdated || (() => {})}
            isUpdating={loading}
            allQuestions={allQuestions}
          />
        </div>
      )}

      {/* Message Editor */}
      {showMessageEditor && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Message Content</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Text
              </label>
              <div className="space-y-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-2">
                    <strong>Formatting Help:</strong>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>• Use <code>**text**</code> for <strong>bold text</strong></div>
                    <div>• Use <code>*text*</code> for <em>italic text</em></div>
                    <div>• Press Enter for line breaks</div>
                  </div>
                </div>
                <textarea
                  value={formData.titleTemplate}
                  onChange={(e) => handleFieldChange('titleTemplate', e.target.value)}
                  rows={8}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.titleTemplate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your message text here...

Example:
Hello, my name is **John Doe** and I work for *Ipsos GmbH*.

We are conducting a study on **certification processes** for sustainable solutions."
                />
                {errors.titleTemplate && (
                  <p className="mt-1 text-sm text-red-600">{errors.titleTemplate}</p>
                )}
              </div>
            </div>
            
            {/* Preview */}
            {formData.titleTemplate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div 
                    className="prose prose-sm max-w-none text-gray-900 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: formData.titleTemplate
                        .replace(/\n/g, '<br>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          <span>Save Question</span>
        </button>
      </div>
    </form>
  );
}
