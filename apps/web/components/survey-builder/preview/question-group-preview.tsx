"use client";

import { QuestionWithDetails } from '@/lib/api/questions-api';
import { PreviewLogicEngine } from '@/lib/preview-logic-engine';
import QuestionPreview from './question-preview';

interface QuestionGroup {
  id: string;
  pageId: string;
  index: number;
  key?: string;
  titleTemplate?: string;
  descriptionTemplate?: string;
  visibleIfExpressionId?: string;
  innerOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
}

interface QuestionGroupPreviewProps {
  group: QuestionGroup;
  questions: QuestionWithDetails[];
  responses: Record<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  questionNumber: number;
  questionResponses?: Record<string, any>;
  embeddedData?: Record<string, any>;
  allQuestions?: QuestionWithDetails[];
  logicEngine?: PreviewLogicEngine;
}

export default function QuestionGroupPreview({
  group,
  questions,
  responses,
  onResponseChange,
  questionNumber,
  questionResponses = {},
  embeddedData = {},
  allQuestions = [],
  logicEngine
}: QuestionGroupPreviewProps) {
  // Apply group-level shuffling if needed
  let orderedQuestions = [...questions];
  
  if (logicEngine && group.innerOrderMode !== 'SEQUENTIAL') {
    // Use the logic engine's public method for question ordering
    orderedQuestions = logicEngine.getOrderedQuestionsForGroup(questions, group.innerOrderMode);
  }

  // Check if group should be visible (if it has visibility conditions)
  const isGroupVisible = !logicEngine || logicEngine.isGroupVisible(group);

  if (!isGroupVisible) {
    return null;
  }

  return (
    <div className="border border-green-200 rounded-lg bg-green-50 mb-6">
      {/* Group Header */}
      <div className="p-4 border-b border-green-200 bg-green-100 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-medium">
            G{group.index + 1}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              {group.titleTemplate || 'Untitled Group'}
            </h3>
            {group.descriptionTemplate && (
              <p className="text-sm text-green-700 mt-1">
                {group.descriptionTemplate}
              </p>
            )}
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {/* Group Shuffling Indicator */}
        {group.innerOrderMode !== 'SEQUENTIAL' && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2M9 12l2 2 4-4" />
            </svg>
            <span>
              Questions are {group.innerOrderMode === 'RANDOM' ? 'randomized' : 
                           group.innerOrderMode === 'GROUP_RANDOM' ? 'randomized within groups' :
                           group.innerOrderMode === 'WEIGHTED' ? 'weighted' : 'ordered'}
            </span>
          </div>
        )}
      </div>

      {/* Group Questions */}
      <div className="p-4 space-y-6">
        {orderedQuestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📝</div>
            <p className="text-sm text-gray-500">No questions in this group</p>
          </div>
        ) : (
          orderedQuestions.map((question, index) => (
            <div key={question.id} className="border-b border-green-200 pb-6 last:border-b-0 last:pb-0">
              <QuestionPreview
                question={question}
                value={responses[question.id]}
                onChange={(value) => onResponseChange(question.id, value)}
                questionNumber={questionNumber + index}
                questionResponses={questionResponses}
                embeddedData={embeddedData}
                allQuestions={allQuestions}
                logicEngine={logicEngine}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
