"use client";

import { useState } from 'react';
import { QuestionWithDetails, questionsAPI } from '@/lib/api/questions-api';
import { PageWithQuestions } from '@/lib/api/pages-api';
import DisplayLogicModal from './display-logic-modal';
import JumpLogicModal from './jump-logic-modal';
import RandomizationModal from './randomization-modal';
import CarryForwardModal, { CarryForwardConfig } from './carry-forward-modal';

interface QuestionBehaviorPanelProps {
  question: QuestionWithDetails;
  surveyId: string;
  onQuestionUpdated: (question: QuestionWithDetails) => void;
  allQuestions?: QuestionWithDetails[];
  allPages?: PageWithQuestions[];
}

export default function QuestionBehaviorPanel({ 
  question, 
  surveyId, 
  onQuestionUpdated,
  allQuestions = [],
  allPages = []
}: QuestionBehaviorPanelProps) {
  const [isDisplayLogicOpen, setIsDisplayLogicOpen] = useState(false);
  const [isJumpLogicOpen, setIsJumpLogicOpen] = useState(false);
  const [isRandomizationOpen, setIsRandomizationOpen] = useState(false);
  const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRandomizationLoading, setIsRandomizationLoading] = useState(false);
  const [isCarryForwardLoading, setIsCarryForwardLoading] = useState(false);

  // Check if question has any conditional logic
  const hasDisplayLogic = question.visibleIfExpressionId !== null;
  const hasJumpLogic = question.fromJumps && question.fromJumps.length > 0;
  const hasRandomization = question.optionOrderMode && question.optionOrderMode !== 'SEQUENTIAL';
  const hasCarryForward = question.optionsSource === 'CARRY_FORWARD' && question.carryForwardQuestionId;
  
  // Check if question supports carry forward (has choices)
  const supportsCarryForward = question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE' || question.type === 'DROPDOWN';

  const handleDisplayLogicClick = () => {
    setIsDisplayLogicOpen(true);
  };

  const handleDisplayLogicClose = () => {
    setIsDisplayLogicOpen(false);
  };

  const handleLogicUpdated = (expressionId: string | null) => {
    // Update the question with the new expression ID
    const updatedQuestion = {
      ...question,
      visibleIfExpressionId: expressionId
    };
    onQuestionUpdated(updatedQuestion);
  };

  const handleJumpLogicClick = () => {
    setIsJumpLogicOpen(true);
  };

  const handleRandomizationClick = () => {
    setIsRandomizationOpen(true);
  };

  const handleRandomizationClose = () => {
    setIsRandomizationOpen(false);
  };

  const handleRandomizationSave = async (optionOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED') => {
    setIsRandomizationLoading(true);
    try {
      const updatedQuestion = await questionsAPI.updateQuestionShuffling(surveyId, question.id, optionOrderMode);
      onQuestionUpdated(updatedQuestion);
    } catch (error) {
      console.error('Error updating question shuffling:', error);
      throw error;
    } finally {
      setIsRandomizationLoading(false);
    }
  };

  const handleJumpLogicClose = () => {
    setIsJumpLogicOpen(false);
  };

  const handleJumpLogicUpdated = () => {
    // Refresh the question data to get updated jump logic
    // This will be handled by the parent component
    onQuestionUpdated(question);
  };

  const handleCarryForwardClick = () => {
    setIsCarryForwardOpen(true);
  };

  const handleCarryForwardClose = () => {
    setIsCarryForwardOpen(false);
  };

  const handleCarryForwardConfirm = async (config: CarryForwardConfig) => {
    setIsCarryForwardLoading(true);
    try {
      const updatedQuestion = await questionsAPI.updateQuestion(surveyId, question.id, {
        optionsSource: 'CARRY_FORWARD',
        carryForwardQuestionId: config.sourceQuestionId,
        // TODO: Store filter type in carryForwardFilterExprId or another field
        // For now, we'll store it in a JSON field or create an expression
      });
      onQuestionUpdated(updatedQuestion);
      setIsCarryForwardOpen(false);
    } catch (error) {
      console.error('Error updating carry forward:', error);
      throw error;
    } finally {
      setIsCarryForwardLoading(false);
    }
  };

  const handleRemoveCarryForward = async () => {
    setIsCarryForwardLoading(true);
    try {
      const updatedQuestion = await questionsAPI.updateQuestion(surveyId, question.id, {
        optionsSource: 'STATIC',
        carryForwardQuestionId: undefined,
        carryForwardFilterExprId: undefined
      });
      onQuestionUpdated(updatedQuestion);
    } catch (error) {
      console.error('Error removing carry forward:', error);
      throw error;
    } finally {
      setIsCarryForwardLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-6">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Question Behavior</h3>
      
      <div className="space-y-2">
        {/* Display Logic */}
        <button 
          onClick={handleDisplayLogicClick}
          className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-purple-100 rounded">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Display Logic</h4>
                <p className="text-xs text-gray-500">
                  {hasDisplayLogic ? 'Skip Logic Applied' : 'Show/hide based on answers'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasDisplayLogic && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              )}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Jump Logic */}
        <button 
          onClick={handleJumpLogicClick}
          className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-100 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Jump Logic</h4>
                <p className="text-xs text-gray-500">
                  {hasJumpLogic ? `${question.fromJumps?.length} jump(s) configured` : 'Jump to different questions/pages'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasJumpLogic && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {question.fromJumps?.length} Active
                </span>
              )}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Carry Forward Choices */}
        {supportsCarryForward && (
          <div className="w-full border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-green-100 rounded">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Carry Forward Choices</h4>
                  <p className="text-xs text-gray-500">
                    {hasCarryForward ? 'Choices from another question' : 'Use options from previous question'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {hasCarryForward && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                )}
                <button
                  onClick={handleCarryForwardClick}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={hasCarryForward ? "Edit carry forward" : "Add carry forward"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Remove button - only show when active */}
            {/* {hasCarryForward && (
              <div className="px-3 pb-3 border-t border-gray-100">
                <button
                  onClick={handleRemoveCarryForward}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-800 text-xs transition-colors"
                  title="Remove carry forward"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Remove carry forward</span>
                </button>
              </div>
            )} */}
          </div>
        )}

        {/* Randomization */}
        <button 
          onClick={handleRandomizationClick}
          className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-orange-100 rounded">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Randomization</h4>
                <p className="text-xs text-gray-500">
                  {hasRandomization ? `Option shuffling: ${question.optionOrderMode}` : 'Shuffle answer options'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasRandomization && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Active
                </span>
              )}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Validation Rules */}
        <button 
          className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-red-100 rounded">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Validation Rules</h4>
                <p className="text-xs text-gray-500">Set answer requirements</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Stats */}
      {(hasDisplayLogic || hasJumpLogic || hasRandomization || hasCarryForward) && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Logic Summary</h4>
          <div className="space-y-1 text-xs text-gray-600">
            {hasDisplayLogic && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Display logic: Active</span>
              </div>
            )}
            {hasJumpLogic && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Jump logic: {question.fromJumps?.length} rule(s)</span>
              </div>
            )}
            {hasRandomization && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Option shuffling: {question.optionOrderMode}</span>
              </div>
            )}
            {hasCarryForward && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Carry forward: Active</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Display Logic Modal */}
      <DisplayLogicModal
        isOpen={isDisplayLogicOpen}
        onClose={handleDisplayLogicClose}
        question={question}
        surveyId={surveyId}
        allQuestions={allQuestions}
        onLogicUpdated={handleLogicUpdated}
      />

      {/* Jump Logic Modal */}
      <JumpLogicModal
        isOpen={isJumpLogicOpen}
        onClose={handleJumpLogicClose}
        question={question}
        allQuestions={allQuestions}
        allPages={allPages}
        surveyId={surveyId}
        onJumpLogicUpdated={handleJumpLogicUpdated}
      />

      {/* Question Randomization Modal */}
      <RandomizationModal
        isOpen={isRandomizationOpen}
        onClose={handleRandomizationClose}
        type="question"
        currentMode={question.optionOrderMode || 'SEQUENTIAL'}
        onSave={handleRandomizationSave}
        isLoading={isRandomizationLoading}
      />

      {/* Carry Forward Modal */}
      <CarryForwardModal
        isOpen={isCarryForwardOpen}
        onClose={handleCarryForwardClose}
        onConfirm={handleCarryForwardConfirm}
        availableQuestions={allQuestions.filter(q => 
          q.id !== question.id && 
          (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE' || q.type === 'DROPDOWN')
        )}
        currentQuestion={question}
        initialConfig={hasCarryForward ? {
          sourceQuestionId: question.carryForwardQuestionId!,
          filterType: 'SELECTED_CHOICES' // Default for now, could be stored in carryForwardFilterExprId
        } : null}
      />
    </div>
  );
}