"use client";

import { useState } from 'react';
import { questionsAPI, QuestionWithDetails, CreateQuestionData, QuestionType } from '@/lib/api/questions-api';
import { PageWithQuestions } from '@/lib/api/pages-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import QuestionTypeSelector from './question-type-selector';
import QuestionEditor from './question-editor';
import ConditionalLogicModal, { LogicRule } from './conditional-logic-modal';

interface QuestionManagerProps {
  surveyId: string;
  pages: PageWithQuestions[];
  questions: QuestionWithDetails[];
  selectedPageId: string | null;
  onPageSelected: (pageId: string) => void;
  onQuestionCreated: (question: QuestionWithDetails) => void;
  onQuestionUpdated: (question: QuestionWithDetails) => void;
  onQuestionDeleted: (questionId: string) => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string; description: string; icon: string }[] = [
  { value: 'SINGLE_CHOICE', label: 'Single Choice', description: 'Radio buttons - one answer only', icon: '🔘' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', description: 'Checkboxes - multiple answers', icon: '☑️' },
  { value: 'DROPDOWN', label: 'Dropdown', description: 'Select from a dropdown list', icon: '📋' },
  { value: 'TEXT', label: 'Text Input', description: 'Single line text input', icon: '📝' },
  { value: 'TEXTAREA', label: 'Long Text', description: 'Multi-line text area', icon: '📄' },
  { value: 'NUMBER', label: 'Number', description: 'Numeric input only', icon: '🔢' },
  { value: 'DECIMAL', label: 'Decimal', description: 'Decimal number input', icon: '🔢' },
  { value: 'DATE', label: 'Date', description: 'Date picker', icon: '📅' },
  { value: 'TIME', label: 'Time', description: 'Time picker', icon: '⏰' },
  { value: 'BOOLEAN', label: 'Yes/No', description: 'Boolean true/false', icon: '✅' },
  { value: 'RANK', label: 'Ranking', description: 'Rank options in order', icon: '📊' },
  { value: 'SLIDER', label: 'Slider', description: 'Range slider input', icon: '🎚️' },
  { value: 'MATRIX', label: 'Matrix', description: 'Grid of questions', icon: '📊' },
  { value: 'DESCRIPTIVE', label: 'Text Block', description: 'Display text only', icon: '📄' },
  { value: 'FILE_UPLOAD', label: 'File Upload', description: 'Upload files', icon: '📎' }
];

export default function QuestionManager({
  surveyId,
  pages,
  questions,
  selectedPageId,
  onPageSelected,
  onQuestionCreated,
  onQuestionUpdated,
  onQuestionDeleted
}: QuestionManagerProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logicModalQuestion, setLogicModalQuestion] = useState<QuestionWithDetails | null>(null);
  const [questionLogicRules, setQuestionLogicRules] = useState<Record<string, LogicRule[]>>({});

  const selectedPage = pages.find(p => p.id === selectedPageId);

  const handleCreateQuestion = async (type: QuestionType) => {
    if (!selectedPageId) return;

    try {
      setLoading(true);
      setError('');
      const newQuestion = await questionsAPI.createQuestion(surveyId, {
        pageId: selectedPageId,
        type,
        titleTemplate: `New ${QUESTION_TYPES.find(t => t.value === type)?.label || type} Question`,
        required: false
      });
      onQuestionCreated(newQuestion);
      setEditingQuestionId(newQuestion.id);
      setShowTypeSelector(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = async (questionId: string, data: CreateQuestionData) => {
    try {
      setLoading(true);
      setError('');
      const updatedQuestion = await questionsAPI.updateQuestion(surveyId, questionId, data);
      onQuestionUpdated(updatedQuestion);
      setEditingQuestionId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await questionsAPI.deleteQuestion(surveyId, questionId);
      onQuestionDeleted(questionId);
      // Remove logic rules for deleted question
      const updatedRules = { ...questionLogicRules };
      delete updatedRules[questionId];
      setQuestionLogicRules(updatedRules);
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLogicRules = (questionId: string, rules: LogicRule[]) => {
    setQuestionLogicRules(prev => ({
      ...prev,
      [questionId]: rules
    }));
    setLogicModalQuestion(null);
    // TODO: Save to backend
    console.log('Logic rules saved for question', questionId, rules);
  };

  const getQuestionLogicRules = (questionId: string): LogicRule[] => {
    return questionLogicRules[questionId] || [];
  };

  if (!selectedPage) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No page selected</h3>
        <p className="mt-1 text-sm text-gray-500">Select a page to manage its questions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
          <p className="text-gray-600">
            Managing questions for: <span className="font-medium">{selectedPage.titleTemplate || `Page ${selectedPage.index}`}</span>
          </p>
        </div>
        <button
          onClick={() => setShowTypeSelector(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Question</span>
        </button>
      </div>

      {/* Page Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Page
        </label>
        <select
          value={selectedPageId || ''}
          onChange={(e) => onPageSelected(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.titleTemplate || `Page ${page.index}`} ({page._count.questions} questions)
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Question Type Selector */}
      {showTypeSelector && (
        <QuestionTypeSelector
          questionTypes={QUESTION_TYPES}
          onSelect={handleCreateQuestion}
          onCancel={() => setShowTypeSelector(false)}
          loading={loading}
        />
      )}

      {/* Questions List */}
      <div className="bg-white rounded-lg shadow">
        {questions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No questions</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first question.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowTypeSelector(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Question
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
                         {questions.map((question, index) => (
               <QuestionItem
                 key={question.id}
                 question={question}
                 index={index}
                 isEditing={editingQuestionId === question.id}
                 onEdit={() => setEditingQuestionId(question.id)}
                 onSave={(data) => handleUpdateQuestion(question.id, data)}
                 onCancel={() => setEditingQuestionId(null)}
                 onDelete={() => handleDeleteQuestion(question.id)}
                 loading={loading}
                 questionTypes={QUESTION_TYPES}
                 onQuestionUpdated={onQuestionUpdated}
                 onOpenLogic={() => setLogicModalQuestion(question)}
                 logicRules={getQuestionLogicRules(question.id)}
                 allQuestions={questions}
                 allPages={pages}
               />
             ))}
          </div>
        )}
      </div>

      {/* Conditional Logic Modal */}
      {logicModalQuestion && (
        <ConditionalLogicModal
          isOpen={true}
          onClose={() => setLogicModalQuestion(null)}
          question={logicModalQuestion}
          allQuestions={questions}
          allPages={pages}
          onSave={(rules) => handleSaveLogicRules(logicModalQuestion.id, rules)}
          existingRules={getQuestionLogicRules(logicModalQuestion.id)}
        />
      )}
    </div>
  );
}

interface QuestionItemProps {
  question: QuestionWithDetails;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: CreateQuestionData) => void;
  onCancel: () => void;
  onDelete: () => void;
  loading: boolean;
  questionTypes: typeof QUESTION_TYPES;
  onQuestionUpdated: (question: QuestionWithDetails) => void;
  onOpenLogic: () => void;
  logicRules: LogicRule[];
  allQuestions: QuestionWithDetails[];
  allPages: PageWithQuestions[];
}

function QuestionItem({
  question,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  loading,
  questionTypes,
  onQuestionUpdated,
  onOpenLogic,
  logicRules,
  allQuestions,
  allPages
}: QuestionItemProps) {
  const questionType = questionTypes.find(t => t.value === question.type);

  if (isEditing) {
    return (
      <div className="p-6 bg-blue-50">
        <QuestionEditor
          question={question}
          onSave={onSave}
          onCancel={onCancel}
          loading={loading}
          onQuestionUpdated={onQuestionUpdated}
          allQuestions={allQuestions}
        />
      </div>
    );
  }

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <span className="text-2xl">{questionType?.icon}</span>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {question.titleTemplate}
            </h3>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{questionType?.label}</span>
              <span>•</span>
              <span>{question.variableName}</span>
              {question.required && (
                <>
                  <span>•</span>
                  <span className="text-red-600 font-medium">Required</span>
                </>
              )}
            </div>
            {question.helpTextTemplate && (
              <p className="text-sm text-gray-600 mt-1">{question.helpTextTemplate}</p>
            )}
            {question.options.length > 0 && (
              <div className="mt-2">
                <span className="text-sm text-gray-500">
                  {question.options.length} option{question.options.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Logic Rules Section */}
        {logicRules.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Logic Rules</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {logicRules.length}
                </span>
              </div>
              <button
                onClick={onOpenLogic}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit Logic
              </button>
            </div>
            <div className="space-y-2">
              {logicRules.slice(0, 2).map((rule, index) => (
                <div key={rule.id} className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                  <span className="font-medium text-amber-600">
                    {rule.type.replace('_', ' ')}:
                  </span>{' '}
                  {rule.description}
                </div>
              ))}
              {logicRules.length > 2 && (
                <div className="text-xs text-slate-500">
                  +{logicRules.length - 2} more rule{logicRules.length - 2 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1">
        {/* Logic Button */}
        <button
          onClick={onOpenLogic}
          className={`p-2 rounded-lg transition-colors ${
            logicRules.length > 0
              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
          title="Configure Logic Rules"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>

        <button
          onClick={onEdit}
          className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
