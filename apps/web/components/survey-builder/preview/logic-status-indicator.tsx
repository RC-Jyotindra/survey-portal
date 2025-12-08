"use client";

import { useState } from 'react';
import { PreviewLogicEngine } from '@/lib/preview-logic-engine';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { PageWithQuestions } from '@/lib/api/pages-api';

interface LogicStatusIndicatorProps {
  logicEngine: PreviewLogicEngine;
  currentPage: PageWithQuestions;
  allQuestions: QuestionWithDetails[];
  responses: Record<string, any>;
}

export default function LogicStatusIndicator({
  logicEngine,
  currentPage,
  allQuestions,
  responses
}: LogicStatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get visible vs hidden questions
  const pageQuestions = allQuestions.filter(q => q.pageId === currentPage.id);
  const visibleQuestions = logicEngine.getVisibleQuestionsForPage(currentPage.id, allQuestions);
  const hiddenQuestions = pageQuestions.filter(q => !visibleQuestions.find(vq => vq.id === q.id));

  // Count logic features in use
  const conditionalLogicCount = pageQuestions.filter(q => q.visibleIfExpressionId).length;
  const jumpLogicCount = pageQuestions.filter(q => q.fromJumps && q.fromJumps.length > 0).length;
  const carryForwardCount = pageQuestions.filter(q => q.optionsSource === 'CARRY_FORWARD').length;
  const randomizedQuestions = pageQuestions.filter(q => q.optionOrderMode !== 'SEQUENTIAL').length;
  const randomizedPages = currentPage.questionOrderMode !== 'SEQUENTIAL' ? 1 : 0;
  
  // Count question groups (this would need to be passed from parent or loaded)
  const questionGroupsCount = 0; // TODO: Load this from parent component
  const randomizedGroups = 0; // TODO: Count groups with non-sequential ordering

  const hasAnyLogic = conditionalLogicCount > 0 || jumpLogicCount > 0 || carryForwardCount > 0 || 
                      randomizedQuestions > 0 || randomizedPages > 0 || questionGroupsCount > 0;

  if (!hasAnyLogic) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Logic Status Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-blue-900">Logic Features Active</h3>
            <p className="text-xs text-blue-700">
              {hiddenQuestions.length > 0 && `${hiddenQuestions.length} question(s) hidden • `}
              {conditionalLogicCount + jumpLogicCount + carryForwardCount + randomizedQuestions + randomizedPages} logic rule(s) applied
            </p>
          </div>
        </div>
        <div className="text-blue-600">
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Logic Details */}
      {isExpanded && (
        <div className="mt-2 px-4 py-3 bg-white border border-blue-200 rounded-lg space-y-3">
          {/* Conditional Logic */}
          {conditionalLogicCount > 0 && (
            <div className="flex items-start space-x-3">
              <div className="text-green-600 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Conditional Logic</p>
                <p className="text-xs text-gray-600">
                  {conditionalLogicCount} question(s) with show/hide conditions
                </p>
              </div>
            </div>
          )}

          {/* Jump Logic */}
          {jumpLogicCount > 0 && (
            <div className="flex items-start space-x-3">
              <div className="text-purple-600 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Jump Logic</p>
                <p className="text-xs text-gray-600">
                  {jumpLogicCount} question(s) with skip/jump rules
                </p>
              </div>
            </div>
          )}

          {/* Carry Forward */}
          {carryForwardCount > 0 && (
            <div className="flex items-start space-x-3">
              <div className="text-orange-600 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Carry Forward</p>
                <p className="text-xs text-gray-600">
                  {carryForwardCount} question(s) with carried forward options
                </p>
              </div>
            </div>
          )}

          {/* Randomization */}
          {(randomizedQuestions > 0 || randomizedPages > 0) && (
            <div className="flex items-start space-x-3">
              <div className="text-indigo-600 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Randomization</p>
                <p className="text-xs text-gray-600">
                  {randomizedQuestions > 0 && `${randomizedQuestions} question(s) with randomized options`}
                  {randomizedQuestions > 0 && randomizedPages > 0 && ' • '}
                  {randomizedPages > 0 && 'Page has randomized question order'}
                </p>
              </div>
            </div>
          )}

          {/* Question Groups */}
          {questionGroupsCount > 0 && (
            <div className="flex items-start space-x-3">
              <div className="text-green-600 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Question Groups</p>
                <p className="text-xs text-gray-600">
                  {questionGroupsCount} group(s) with organized questions
                  {randomizedGroups > 0 && ` • ${randomizedGroups} group(s) with randomized order`}
                </p>
              </div>
            </div>
          )}

          {/* Hidden Questions */}
          {hiddenQuestions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-2">Hidden Questions:</p>
              <div className="space-y-1">
                {hiddenQuestions.map((question, index) => (
                  <div key={question.id} className="flex items-center space-x-2 text-xs text-gray-600">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <span>Q{index + pageQuestions.findIndex(q => q.id === question.id) + 1}: {question.titleTemplate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Responses Debug */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-2">Current Responses:</p>
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono max-h-20 overflow-y-auto">
              {Object.keys(responses).length > 0 ? (
                <pre>{JSON.stringify(responses, null, 2)}</pre>
              ) : (
                <span className="text-gray-400">No responses yet</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
