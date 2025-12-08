'use client';

import React, { useState } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import VisualDisplayLogicBuilder from './visual-display-logic-builder';

interface QuestionTerminationLogicModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionWithDetails;
  allQuestions: QuestionWithDetails[];
  surveyId: string;
  onTerminationLogicUpdated: (expressionId: string | null) => void;
}

export function QuestionTerminationLogicModal({
  isOpen,
  onClose,
  question,
  allQuestions,
  surveyId,
  onTerminationLogicUpdated
}: QuestionTerminationLogicModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Set Termination Logic
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Define when this question should terminate the survey
            </p>
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Termination Logic</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  When the condition is met, the survey will be terminated and the respondent will be shown an exit message.
                  This is useful for screening questions or when certain answers should end the survey.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Question: {question.titleTemplate}
            </h3>
            <p className="text-sm text-gray-600">
              Set conditions for when this question should terminate the survey
            </p>
          </div>

          <VisualDisplayLogicBuilder
            isOpen={true}
            onClose={onClose} // Pass the close handler directly
            question={question}
            allQuestions={allQuestions}
            surveyId={surveyId}
            onSave={(expressionId: string | null) => {
              onTerminationLogicUpdated(expressionId);
              onClose();
            }}
            onCancel={onClose}
            mode="termination"
          />
        </div>
      </div>
    </div>
  );
}
