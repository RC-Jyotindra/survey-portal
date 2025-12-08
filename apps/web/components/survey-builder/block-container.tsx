"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails, questionsAPI, QuestionType } from '@/lib/api/questions-api';
import { PageWithQuestions, pagesAPI } from '@/lib/api/pages-api';
import QuestionBlock from './question-block';
import { LoopBatteryIndicator } from './loop-batteries';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';

interface QuestionGroup {
  id: string;
  pageId: string;
  index: number;
  key?: string;
  titleTemplate?: string;
  descriptionTemplate?: string;
  innerOrderMode: 'SEQUENTIAL' | 'RANDOM' | 'GROUP_RANDOM' | 'WEIGHTED';
}

interface LoopBattery {
  id: string;
  name: string;
  startPageId: string;
  endPageId: string;
  sourceType: 'ANSWER' | 'DATASET';
  sourceQuestionId?: string;
  maxItems?: number;
  randomize: boolean;
  sampleWithoutReplacement: boolean;
  startPage: {
    id: string;
    index: number;
    titleTemplate: string;
  };
  endPage: {
    id: string;
    index: number;
    titleTemplate: string;
  };
  sourceQuestion?: {
    id: string;
    variableName: string;
    titleTemplate: string;
    type: string;
  };
}

interface BlockContainerProps {
  page: PageWithQuestions;
  pageIndex: number;
  questions: QuestionWithDetails[];
  groups: QuestionGroup[];
  allQuestions: QuestionWithDetails[];
  selectedQuestionId: string | null;
  selectedPageId: string | null;
  onQuestionSelect: (question: QuestionWithDetails) => void;
  onBlockSelect: () => void;
  onPageUpdated: (page: PageWithQuestions) => void;
  onPageDeleted: (pageId: string) => void;
  onQuestionCreated: (question: QuestionWithDetails) => void;
  onQuestionUpdated: (question: QuestionWithDetails) => void;
  onQuestionDeleted: (questionId: string) => void;
  onGroupCreated: (group: QuestionGroup) => void;
  onGroupUpdated: (group: QuestionGroup) => void;
  onGroupDeleted: (groupId: string) => void;
  surveyId: string;
}

export default function BlockContainer({
  page,
  pageIndex,
  questions,
  groups,
  allQuestions,
  selectedQuestionId,
  selectedPageId,
  onQuestionSelect,
  onBlockSelect,
  onPageUpdated,
  onPageDeleted,
  onQuestionCreated,
  onQuestionUpdated,
  onQuestionDeleted,
  onGroupCreated,
  onGroupUpdated,
  onGroupDeleted,
  surveyId
}: BlockContainerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(page.titleTemplate || '');
  const [loopBatteries, setLoopBatteries] = useState<LoopBattery[]>([]);

  // Load loop batteries for this survey
  useEffect(() => {
    loadLoopBatteries();
  }, [surveyId]);

  const loadLoopBatteries = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/loop-batteries`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setLoopBatteries(data.loopBatteries || []);
      }
    } catch (error) {
      console.error('Error loading loop batteries:', error);
    }
  };

  // Get loop battery info for this page
  const getLoopBatteryInfo = () => {
    const relevantBattery = loopBatteries.find(battery => 
      battery.startPageId === page.id || 
      battery.endPageId === page.id ||
      (battery.startPage.index <= pageIndex + 1 && battery.endPage.index >= pageIndex + 1)
    );

    if (!relevantBattery) return null;

    return {
      battery: relevantBattery,
      isStartPage: relevantBattery.startPageId === page.id,
      isEndPage: relevantBattery.endPageId === page.id,
      isInsideLoop: relevantBattery.startPage.index <= pageIndex + 1 && relevantBattery.endPage.index >= pageIndex + 1
    };
  };

  const loopInfo = getLoopBatteryInfo();

  const handleDeletePage = () => {
    if (confirm('Are you sure you want to delete this block? This action cannot be undone.')) {
      onPageDeleted(page.id);
    }
  };

  const handleStartEditing = () => {
    setIsEditingTitle(true);
    setEditedTitle(page.titleTemplate || '');
  };

  const handleCancelEditing = () => {
    setIsEditingTitle(false);
    setEditedTitle(page.titleTemplate || '');
  };

  const handleSaveTitle = async () => {
    try {
      if (editedTitle.trim() === (page.titleTemplate || '')) {
        // No changes, just cancel editing
        setIsEditingTitle(false);
        return;
      }

      // Make API call to update the page title
      const updatedPage = await pagesAPI.updatePage(surveyId, page.id, {
        titleTemplate: editedTitle.trim() || undefined
      });
      
      // Update local state
      onPageUpdated(updatedPage);
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating page title:', error);
      alert('Failed to update block title. Please try again.');
    }
  };

  const handleAddQuestion = async () => {
    try {
      // Calculate the next sequential question number across ALL questions in the survey
      const existingQuestionNumbers = allQuestions
        .map(q => {
          const match = q.variableName.match(/^Q(\d+)$/);
          return match ? parseInt(match[1] || '0', 10) : 0;
        })
        .filter(num => num > 0);
      
      const nextQuestionNumber = existingQuestionNumbers.length > 0 
        ? Math.max(...existingQuestionNumbers) + 1 
        : 1;
      
      const sequentialVariableName = `Q${nextQuestionNumber}`;
      
      const newQuestion = await questionsAPI.createQuestion(surveyId, {
        pageId: page.id,
        type: 'SINGLE_CHOICE' as QuestionType,
        titleTemplate: 'New Question',
        helpTextTemplate: '',
        required: false,
        variableName: sequentialVariableName
      });
      onQuestionCreated(newQuestion);
    } catch (error) {
      console.error('Error adding question:', error);
      // Show user-friendly error message
      alert('Failed to add question. Please try again.');
    }
  };

  const handleAddGroup = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${page.id}/groups`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          pageId: page.id,
          titleTemplate: `Group ${groups.length + 1}`,
          innerOrderMode: 'SEQUENTIAL'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create group: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      onGroupCreated(result.group);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleAddQuestionToGroup = async (groupId: string) => {
    try {
      // Calculate the next sequential question number across ALL questions in the survey
      const existingQuestionNumbers = allQuestions
        .map(q => {
          const match = q.variableName.match(/^Q(\d+)$/);
          return match ? parseInt(match[1] || '0', 10) : 0;
        })
        .filter(num => num > 0);
      
      const nextQuestionNumber = existingQuestionNumbers.length > 0 
        ? Math.max(...existingQuestionNumbers) + 1 
        : 1;
      
      const sequentialVariableName = `Q${nextQuestionNumber}`;
      
      const newQuestion = await questionsAPI.createQuestion(surveyId, {
        pageId: page.id,
        groupId: groupId,
        type: 'SINGLE_CHOICE' as QuestionType,
        titleTemplate: 'New Question',
        helpTextTemplate: '',
        required: false,
        variableName: sequentialVariableName
      });
      onQuestionCreated(newQuestion);
    } catch (error) {
      console.error('Error adding question to group:', error);
      alert('Failed to add question to group. Please try again.');
    }
  };

  const isSelected = selectedPageId === page.id;

  return (
    <div 
      className={`border rounded-lg bg-white shadow-sm transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onBlockSelect();
      }}
    >
      {/* Block Header */}
      <div className={`border-b px-4 py-3 rounded-t-lg ${
        isSelected ? 'bg-blue-100 border-blue-200' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between group">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-700"
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${
                  isExpanded ? 'rotate-90' : 'rotate-0'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">
                Block {pageIndex + 1}
              </h3>
              {isEditingTitle ? (
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xs text-blue-700 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter block title"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTitle();
                      } else if (e.key === 'Escape') {
                        handleCancelEditing();
                      }
                    }}
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
                    title="Save"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCancelEditing}
                    className="p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Cancel"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-blue-700">
                    {page.titleTemplate || 'Untitled Block'}
                  </p>
                  <button
                    onClick={handleStartEditing}
                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit title"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddGroup}
              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
              title="Add Group"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </button>

            <button
              onClick={handleAddQuestion}
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
              title="Add Question"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
              title="Block Options"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            <button
              onClick={handleDeletePage}
              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-100 rounded"
              title="Delete Block"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Loop Battery Indicator */}
        {loopInfo && (
          <div className="mt-3">
            <LoopBatteryIndicator
              battery={loopInfo.battery}
              pageIndex={pageIndex}
              isStartPage={loopInfo.isStartPage}
              isEndPage={loopInfo.isEndPage}
              isInsideLoop={loopInfo.isInsideLoop}
              onEdit={() => {
                // TODO: Open edit modal
                console.log('Edit loop battery:', loopInfo.battery.id);
              }}
              onDelete={() => {
                // TODO: Handle delete
                console.log('Delete loop battery:', loopInfo.battery.id);
              }}
            />
          </div>
        )}
      </div>

      {/* Block Content */}
      {isExpanded && (
        <div className="p-6">
          {groups.length === 0 && questions.filter(q => !q.groupId).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No content yet</h4>
              <p className="text-gray-500 mb-4">
                Add groups or questions to organize your survey
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleAddGroup}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Add Group
                </button>
                <button
                  onClick={handleAddQuestion}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Question
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Groups */}
              {groups.map((group, groupIndex) => {
                const groupQuestions = questions.filter(q => q.groupId === group.id);
                return (
                  <div key={group.id} className="border border-green-200 rounded-lg bg-green-50">
                    {/* Group Header */}
                    <div className="flex items-center justify-between p-3 border-b border-green-200 bg-green-100 rounded-t-lg">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-xs font-medium">
                          {groupIndex + 1}
                        </div>
                        <h4 className="text-sm font-medium text-green-900">
                          {group.titleTemplate || 'Untitled Group'}
                        </h4>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800">
                          {groupQuestions.length} questions
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleAddQuestionToGroup(group.id)}
                          className="p-1 text-green-600 hover:text-green-700 hover:bg-green-200 rounded"
                          title="Add Question to Group"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onGroupDeleted(group.id)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-200 rounded"
                          title="Delete Group"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Group Questions */}
                    <div className="p-3">
                      {groupQuestions.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-green-600 mb-2">No questions in this group yet</p>
                          <button
                            onClick={() => handleAddQuestionToGroup(group.id)}
                            className="text-xs text-green-600 hover:text-green-700 underline"
                          >
                            + Add question to group
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {groupQuestions.map((question, questionIndex) => (
                            <div key={question.id} className="ml-4">
                              <QuestionBlock
                                question={question}
                                questionIndex={questionIndex}
                                isSelected={selectedQuestionId === question.id}
                                onSelect={() => onQuestionSelect(question)}
                                onDeselect={() => onQuestionSelect({ id: null } as any)}
                                onQuestionUpdated={onQuestionUpdated}
                                onQuestionDeleted={onQuestionDeleted}
                                surveyId={surveyId}
                                allQuestions={allQuestions}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Ungrouped Questions */}
              {questions.filter(q => !q.groupId).length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-gray-50">
                  <div className="p-3 border-b border-gray-200 bg-gray-100 rounded-t-lg">
                    <h4 className="text-sm font-medium text-gray-900">Ungrouped Questions</h4>
                  </div>
                  <div className="p-3 space-y-2">
                    {questions.filter(q => !q.groupId).map((question, questionIndex) => (
                      <QuestionBlock
                        key={question.id}
                        question={question}
                        questionIndex={questionIndex}
                        isSelected={selectedQuestionId === question.id}
                        onSelect={() => onQuestionSelect(question)}
                        onDeselect={() => onQuestionSelect({ id: null } as any)}
                        onQuestionUpdated={onQuestionUpdated}
                        onQuestionDeleted={onQuestionDeleted}
                        surveyId={surveyId}
                        allQuestions={allQuestions}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Add Content Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={handleAddGroup}
                    className="text-green-600 hover:text-green-700 text-sm"
                  >
                    + Add group
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={handleAddQuestion}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    + Add question
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
