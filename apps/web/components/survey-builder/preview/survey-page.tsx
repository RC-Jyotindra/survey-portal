"use client";

import { useState, useEffect } from 'react';
import { PageWithQuestions, pagesAPI } from '@/lib/api/pages-api';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { PreviewLogicEngine } from '@/lib/preview-logic-engine';
import QuestionPreview from './question-preview';
import QuestionGroupPreview from './question-group-preview';
import LogicStatusIndicator from './logic-status-indicator';
import { config } from '@/lib/config';

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

interface SurveyPageProps {
  page: PageWithQuestions;
  questions: QuestionWithDetails[];
  responses: Record<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  surveyId?: string;
  onPageUpdated?: (page: PageWithQuestions) => void;
  isEditable?: boolean;
  questionResponses?: Record<string, any>;
  embeddedData?: Record<string, any>;
  allQuestions?: QuestionWithDetails[];
  logicEngine?: PreviewLogicEngine;
}

export default function SurveyPage({
  page,
  questions,
  responses,
  onResponseChange,
  surveyId,
  onPageUpdated,
  isEditable = false,
  questionResponses = {},
  embeddedData = {},
  allQuestions = [],
  logicEngine
}: SurveyPageProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(page.titleTemplate || '');
  const [editedDescription, setEditedDescription] = useState(page.descriptionTemplate || '');
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Load question groups for this page
  useEffect(() => {
    if (surveyId) {
      loadQuestionGroups();
    }
  }, [surveyId, page.id]);

  const loadQuestionGroups = async () => {
    if (!surveyId) return;
    
    try {
      setGroupsLoading(true);
      
      // Try to get auth token, but don't fail if it's not available (for preview mode)
      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        headers['ngrok-skip-browser-warning'] = 'true'; // Skip ngrok warning page;
      }
      
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${page.id}/groups`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded question groups:', data.groups);
        setGroups(data.groups || []);
      } else {
        console.error('Failed to load groups:', response.status, response.statusText);
        // If we can't load groups, just set empty array
        setGroups([]);
      }
    } catch (error) {
      console.error('Error loading question groups:', error);
      // If there's an error, just set empty array
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!surveyId || !onPageUpdated) return;
    
    try {
      if (editedTitle.trim() === (page.titleTemplate || '')) {
        setIsEditingTitle(false);
        return;
      }

      const updatedPage = await pagesAPI.updatePage(surveyId, page.id, {
        titleTemplate: editedTitle.trim() || undefined
      });
      
      onPageUpdated(updatedPage);
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating page title:', error);
      alert('Failed to update page title. Please try again.');
    }
  };

  const handleSaveDescription = async () => {
    if (!surveyId || !onPageUpdated) return;
    
    try {
      if (editedDescription.trim() === (page.descriptionTemplate || '')) {
        setIsEditingDescription(false);
        return;
      }

      const updatedPage = await pagesAPI.updatePage(surveyId, page.id, {
        descriptionTemplate: editedDescription.trim() || undefined
      });
      
      onPageUpdated(updatedPage);
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Error updating page description:', error);
      alert('Failed to update page description. Please try again.');
    }
  };

  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle(page.titleTemplate || '');
  };

  const handleCancelDescriptionEdit = () => {
    setIsEditingDescription(false);
    setEditedDescription(page.descriptionTemplate || '');
  };
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          {/* Page Title */}
          {isEditable ? (
            <div className="mb-4">
              {isEditingTitle ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-2xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    placeholder="Enter page title"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTitle();
                      } else if (e.key === 'Escape') {
                        handleCancelTitleEdit();
                      }
                    }}
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
                    title="Save title"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCancelTitleEdit}
                    className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Cancel"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 group">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {page.titleTemplate || 'Untitled Page'}
                  </h2>
                  <button
                    onClick={() => {
                      setEditedTitle(page.titleTemplate || '');
                      setIsEditingTitle(true);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit title"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            page.titleTemplate && (
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {page.titleTemplate}
              </h2>
            )
          )}

          {/* Page Description */}
          {isEditable ? (
            <div>
              {isEditingDescription ? (
                <div className="flex items-start space-x-2">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="text-gray-600 text-lg leading-relaxed bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-h-[100px] resize-vertical"
                    placeholder="Enter page description"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        handleCancelDescriptionEdit();
                      }
                    }}
                  />
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={handleSaveDescription}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
                      title="Save description"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCancelDescriptionEdit}
                      className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Cancel"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-2 group">
                  <p className="text-gray-600 text-lg leading-relaxed flex-1">
                    {page.descriptionTemplate || 'No description'}
                  </p>
                  <button
                    onClick={() => {
                      setEditedDescription(page.descriptionTemplate || '');
                      setIsEditingDescription(true);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                    title="Edit description"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            page.descriptionTemplate && (
              <p className="text-gray-600 text-lg leading-relaxed">
                {page.descriptionTemplate}
              </p>
            )
          )}
        </div>

        {/* Logic Status Indicator */}
        {logicEngine && (
          <LogicStatusIndicator 
            logicEngine={logicEngine}
            currentPage={page}
            allQuestions={allQuestions}
            responses={responses}
          />
        )}

        {/* Questions and Groups */}
        <div className="space-y-8">
          {groupsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading question groups...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-4">No question groups found for this page.</p>
              <div className="space-y-8">
                {questions.map((question, index) => (
                  <div key={question.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                    <QuestionPreview
                      question={question}
                      value={responses[question.id]}
                      onChange={(value) => onResponseChange(question.id, value)}
                      questionNumber={index + 1}
                      questionResponses={questionResponses}
                      embeddedData={embeddedData}
                      allQuestions={allQuestions}
                      logicEngine={logicEngine}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Question Groups */}
              {(() => {
                console.log('Groups:', groups);
                console.log('Questions:', questions.map(q => ({ id: q.id, title: q.titleTemplate, groupId: q.groupId })));
                return null;
              })()}
              {groups.map((group, groupIndex) => {
                const groupQuestions = questions.filter(q => q.groupId === group.id);
                console.log(`Group ${group.id} (${group.titleTemplate}) has ${groupQuestions.length} questions:`, groupQuestions.map(q => q.titleTemplate));
                return (
                  <QuestionGroupPreview
                    key={group.id}
                    group={group}
                    questions={groupQuestions}
                    responses={responses}
                    onResponseChange={onResponseChange}
                    questionNumber={groupIndex + 1}
                    questionResponses={questionResponses}
                    embeddedData={embeddedData}
                    allQuestions={allQuestions}
                    logicEngine={logicEngine}
                  />
                );
              })}

              {/* Ungrouped Questions */}
              {(() => {
                const groupedQuestionIds = new Set<string>();
                groups.forEach(group => {
                  const groupQuestions = questions.filter(q => q.groupId === group.id);
                  groupQuestions.forEach(q => groupedQuestionIds.add(q.id));
                });
                
                const ungroupedQuestions = questions.filter(q => !groupedQuestionIds.has(q.id));
                console.log('Ungrouped questions:', ungroupedQuestions.map(q => q.titleTemplate));
                
                return ungroupedQuestions.length > 0 && (
                  <div className="space-y-8">
                    {ungroupedQuestions.map((question, index) => (
                      <div key={question.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                        <QuestionPreview
                          question={question}
                          value={responses[question.id]}
                          onChange={(value) => onResponseChange(question.id, value)}
                          questionNumber={groups.length + index + 1}
                          questionResponses={questionResponses}
                          embeddedData={embeddedData}
                          allQuestions={allQuestions}
                          logicEngine={logicEngine}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Empty State */}
        {questions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No questions on this page</h3>
            <p className="text-gray-500">This page doesn't have any questions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
