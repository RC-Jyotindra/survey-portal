"use client";

import { useState } from 'react';
import { QuestionWithDetails, QuestionType } from '@/lib/api/questions-api';
import QuestionEditorInline from './question-editor-inline';
import DisplayLogicModal from './display-logic-modal';
import PipingTokenRenderer from './piping-token-renderer';
import QuestionQuotaAssignmentModal from './question-quota-assignment-modal';
import QuestionPreview from './question-preview';
import SuggestedChoicesModal from './suggested-choices-modal';

interface QuestionBlockProps {
  question: QuestionWithDetails;
  questionIndex: number;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onQuestionUpdated: (question: QuestionWithDetails) => void;
  onQuestionDeleted: (questionId: string) => void;
  surveyId: string;
  allQuestions: QuestionWithDetails[];
}

export default function QuestionBlock({
  question,
  questionIndex,
  isSelected,
  onSelect,
  onDeselect,
  onQuestionUpdated,
  onQuestionDeleted,
  surveyId,
  allQuestions
}: QuestionBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDisplayLogicModalOpen, setIsDisplayLogicModalOpen] = useState(false);
  const [isQuotaAssignmentModalOpen, setIsQuotaAssignmentModalOpen] = useState(false);
  const [isSuggestedChoicesModalOpen, setIsSuggestedChoicesModalOpen] = useState(false);

  const getQuestionTypeInfo = (type: QuestionType) => {
    const types = {
      // Basic Choice Types
      SINGLE_CHOICE: { label: 'Single Choice', icon: '○' },
      MULTIPLE_CHOICE: { label: 'Multiple Choice', icon: '☐' },
      DROPDOWN: { label: 'Dropdown', icon: '▼' },
      YES_NO: { label: 'Yes/No', icon: '✓' },

      // Text Input Types
      TEXT: { label: 'Text Entry', icon: '⊞' },
      TEXTAREA: { label: 'Long Text', icon: '⊞' },
      EMAIL: { label: 'Email', icon: '@' },
      PHONE_NUMBER: { label: 'Phone Number', icon: '📞' },
      WEBSITE: { label: 'Website', icon: '🌐' },

      // Numeric Types
      NUMBER: { label: 'Number', icon: '#' },
      DECIMAL: { label: 'Decimal', icon: '#' },
      SLIDER: { label: 'Slider', icon: '⟷' },
      OPINION_SCALE: { label: 'Opinion Scale', icon: '⭐' },
      CONSTANT_SUM: { label: 'Constant Sum', icon: '📊' },

      // Date/Time Types
      DATE: { label: 'Date', icon: '📅' },
      TIME: { label: 'Time', icon: '🕐' },
      DATETIME: { label: 'Date & Time', icon: '📅' },

      // Advanced Types
      RANK: { label: 'Rank Order', icon: '≡' },
      MATRIX: { label: 'Matrix Table', icon: '⊞' },
      MATRIX_SINGLE: { label: 'Matrix Single', icon: '⊞' },
      MATRIX_MULTIPLE: { label: 'Matrix Multiple', icon: '⊞' },
      BIPOLAR_MATRIX: { label: 'Bipolar Matrix', icon: '↔' },
      GROUP_RANK: { label: 'Group Rank', icon: '📋' },
      GROUP_RATING: { label: 'Group Rating', icon: '⭐' },

      // File Types
      FILE_UPLOAD: { label: 'File Upload', icon: '📁' },
      PHOTO_CAPTURE: { label: 'Photo Capture', icon: '📷' },

      // Special Types
      PICTURE_CHOICE: { label: 'Picture Choice', icon: '🖼️' },
      PAYMENT: { label: 'Payment', icon: '💳' },
      SIGNATURE: { label: 'Signature', icon: '✍️' },
      CONSENT_AGREEMENT: { label: 'Consent Agreement', icon: '📋' },
      MESSAGE: { label: 'Message', icon: '💬' },
      CONTACT_FORM: { label: 'Contact Form', icon: '📝' },
      DESCRIPTIVE: { label: 'Descriptive Text', icon: '📄' },

      // Legacy types
      BOOLEAN: { label: 'Multiple Choice', icon: '☐' }
    };
    return types[type] || { label: 'Question', icon: '❓' };
  };

  const typeInfo = getQuestionTypeInfo(question.type);

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this question?')) {
      onQuestionDeleted(question.id);
    }
  };

  const handleDisplayLogicClick = () => {
    setIsDisplayLogicModalOpen(true);
  };

  const handleDisplayLogicUpdated = (expressionId: string | null) => {
    // Update the question with the new expression ID
    const updatedQuestion = { ...question, visibleIfExpressionId: expressionId };
    onQuestionUpdated(updatedQuestion);
  };

  if (isEditing) {
    return (
      <QuestionEditorInline
        question={question}
        onSave={(updatedQuestion) => {
          onQuestionUpdated(updatedQuestion);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
        surveyId={surveyId}
        allQuestions={allQuestions}
      />
    );
  }

  return (
    <>
    <div
      className={`border rounded-lg transition-all ${
        isSelected
          ? 'border-blue-500 shadow-md bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Question Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
            {questionIndex + 1}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{typeInfo.icon}</span>
              <span className="text-sm font-medium text-gray-900">{typeInfo.label}</span>
            </div>
            <div className="text-xs text-gray-500">
              {question.variableName} • {question.required ? 'Required' : 'Optional'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Edit Question"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsQuotaAssignmentModalOpen(true);
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"
            title="Assign Quota to Question"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>

          {/* Suggested Choices Button - only show for choice questions */}
          {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE' || question.type === 'DROPDOWN' || question.type === 'YES_NO') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSuggestedChoicesModalOpen(true);
              }}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded"
              title="Use Suggested Choices"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          {/* <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement duplicate
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Duplicate Question"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button> */}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
            title="Delete Question"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement question options menu
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="More Options"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button> */}
        </div>
      </div>

      {/* Question Content */}
      <div className="p-4">
        {/* Only show title for non-MESSAGE questions */}
        {question.type !== 'MESSAGE' && (
          <h4 className="text-lg font-medium text-gray-900 mb-3">
            <PipingTokenRenderer 
              text={question.titleTemplate}
              isEditable={false}
            />
          </h4>
        )}

        {question.helpTextTemplate && (
          <p className="text-sm text-gray-600 mb-4">
            <PipingTokenRenderer 
              text={question.helpTextTemplate}
              isEditable={false}
            />
          </p>
        )}

        {/* Question Preview */}
        <QuestionPreview
          questionType={question.type}
          question={question}
          isPreview={true}
          hideTitle={question.type === 'MESSAGE'}
        />
      </div>

      {/* Display Logic Indicator */}
      {question.visibleIfExpressionId && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDisplayLogicClick();
            }}
            className="w-full flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-800">Display Logic Active</span>
            </div>
            <div className="flex-1"></div>
            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              Conditional
            </div>
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Randomization Indicator */}
      {question.optionOrderMode && question.optionOrderMode !== 'SEQUENTIAL' && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open Randomization modal
            }}
            className="w-full flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg p-3 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium text-orange-800">Option Shuffling Active</span>
            </div>
            <div className="flex-1"></div>
            <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
              {question.optionOrderMode}
            </div>
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Carry Forward Indicator */}
      {question.optionsSource === 'CARRY_FORWARD' && question.carryForwardQuestionId && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open Carry Forward modal
            }}
            className="w-full flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-sm font-medium text-emerald-800">Carry Forward Choices</span>
            </div>
            <div className="flex-1"></div>
            <div className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
              Dynamic
            </div>
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Jump Logic Indicator */}
      {question.fromJumps && question.fromJumps.length > 0 && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open Jump Logic modal
            }}
            className="w-full flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-medium text-green-800">Jump Logic Active</span>
            </div>
            <div className="flex-1"></div>
            <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
              {question.fromJumps.length} Jump{question.fromJumps.length > 1 ? 's' : ''}
            </div>
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>

    {/* Question Editor Modal */}
    {isEditing && question.id && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <QuestionEditorInline
            question={question}
            surveyId={surveyId}
            onSave={(updatedQuestion) => {
              onQuestionUpdated(updatedQuestion);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    )}

    {/* Display Logic Modal */}
    <DisplayLogicModal
      isOpen={isDisplayLogicModalOpen}
      onClose={() => setIsDisplayLogicModalOpen(false)}
      question={question}
      surveyId={surveyId}
      allQuestions={allQuestions}
      onLogicUpdated={handleDisplayLogicUpdated}
    />

    {/* Question Quota Assignment Modal */}
    <QuestionQuotaAssignmentModal
      isOpen={isQuotaAssignmentModalOpen}
      onClose={() => setIsQuotaAssignmentModalOpen(false)}
      question={question}
      surveyId={surveyId}
      onQuotaAssigned={onQuestionUpdated}
    />

    {/* Suggested Choices Modal */}
    <SuggestedChoicesModal
      isOpen={isSuggestedChoicesModalOpen}
      onClose={() => setIsSuggestedChoicesModalOpen(false)}
      questionId={question.id}
      surveyId={surveyId}
      onChoicesPopulated={onQuestionUpdated}
      currentChoicesCount={question.options?.length || 0}
    />
    </>
  );
}
