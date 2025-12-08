"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import QuestionGroup from './question-group';
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
  questions?: QuestionWithDetails[];
}

interface QuestionGroupManagerProps {
  pageId: string;
  surveyId: string;
  allQuestions: QuestionWithDetails[];
  onQuestionsUpdated: (questions: QuestionWithDetails[]) => void;
  onGroupCreated: (group: QuestionGroup) => void;
  onGroupUpdated: (group: QuestionGroup) => void;
  onGroupDeleted: (groupId: string) => void;
}

export default function QuestionGroupManager({
  pageId,
  surveyId,
  allQuestions,
  onQuestionsUpdated,
  onGroupCreated,
  onGroupUpdated,
  onGroupDeleted
}: QuestionGroupManagerProps) {
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [ungroupedQuestions, setUngroupedQuestions] = useState<QuestionWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Load groups and organize questions
  useEffect(() => {
    loadGroups();
  }, [pageId, surveyId]);

  useEffect(() => {
    organizeQuestions();
  }, [groups, allQuestions]);

  const loadGroups = async () => {
    if (!pageId || !surveyId) {
      console.log('Skipping loadGroups: pageId or surveyId is undefined', { pageId, surveyId });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${pageId}/groups`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        // Expand all groups by default
        setExpandedGroups(new Set(data.groups?.map((g: QuestionGroup) => g.id) || []));
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setError('Failed to load question groups');
    } finally {
      setLoading(false);
    }
  };

  const organizeQuestions = () => {
    const pageQuestions = allQuestions.filter(q => q.pageId === pageId);
    const groupedQuestions = new Set<string>();
    
    // Collect all questions that are in groups
    groups.forEach(group => {
      const questionsInGroup = allQuestions.filter(q => q.groupId === group.id);
      questionsInGroup.forEach(question => {
        groupedQuestions.add(question.id);
      });
    });

    // Find ungrouped questions
    const ungrouped = pageQuestions.filter(q => !groupedQuestions.has(q.id));
    setUngroupedQuestions(ungrouped);
  };

  const createGroup = async () => {
    if (!pageId || !surveyId) {
      setError('Page ID or Survey ID is missing');
      return;
    }

    try {
      setLoading(true);
      const requestBody = {
        pageId: pageId,
        titleTemplate: `Group ${groups.length + 1}`,
        innerOrderMode: 'SEQUENTIAL'
      };
      
      console.log('Creating group with:', {
        url: `${config.api.surveyService}/api/surveys/${surveyId}/pages/${pageId}/groups`,
        body: requestBody,
        stringifiedBody: JSON.stringify(requestBody)
      });
      
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${pageId}/groups`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Create group error response:', errorData);
        throw new Error(`Failed to create group: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      const newGroup = result.group;
      setGroups(prev => [...prev, newGroup]);
      setExpandedGroups(prev => new Set([...prev, newGroup.id]));
      onGroupCreated(newGroup);
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupUpdated = (updatedGroup: QuestionGroup) => {
    setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    onGroupUpdated(updatedGroup);
  };

  const handleGroupDeleted = async (groupId: string) => {
    if (!pageId || !surveyId) {
      setError('Page ID or Survey ID is missing');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${pageId}/groups/${groupId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      setGroups(prev => prev.filter(g => g.id !== groupId));
      setExpandedGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
      onGroupDeleted(groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
      setError('Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionMoved = async (questionId: string, fromGroupId: string | null, toGroupId: string | null) => {
    if (!pageId || !surveyId) {
      setError('Page ID or Survey ID is missing');
      return;
    }

    try {
      if (toGroupId) {
        // Move to group
        const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${pageId}/groups/${toGroupId}/questions`, {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({ questionId })
        });

        if (!response.ok) {
          throw new Error('Failed to move question to group');
        }
      } else {
        // Move to ungrouped (remove from group)
        if (fromGroupId) {
          const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${pageId}/groups/${fromGroupId}/questions/${questionId}`, {
            method: 'DELETE',
            headers: getApiHeaders()
          });

          if (!response.ok) {
            throw new Error('Failed to remove question from group');
          }
        }
      }

      // Reload groups to get updated data
      await loadGroups();
    } catch (error) {
      console.error('Error moving question:', error);
      setError('Failed to move question');
    }
  };

  const handleAddQuestionToGroup = (groupId: string) => {
    // This will be handled by the parent component
    // For now, we'll just show a message
    alert(`Add question to group ${groupId} - This will be implemented with the question creation flow`);
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (!pageId || !surveyId) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Please select a page to manage question groups</div>
      </div>
    );
  }

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading question groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Add Group Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Question Groups</h3>
        <button
          onClick={createGroup}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Creating...' : '+ Add Group'}
        </button>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {groups.map((group) => {
          const questionsInGroup = allQuestions.filter(q => q.groupId === group.id);
          return (
            <QuestionGroup
              key={group.id}
              group={group}
              questionsInGroup={questionsInGroup}
              surveyId={surveyId}
              onGroupUpdated={handleGroupUpdated}
              onQuestionMoved={handleQuestionMoved}
              onAddQuestionToGroup={handleAddQuestionToGroup}
              onEditGroup={(group) => {
                // This will be handled by the parent component
                console.log('Edit group:', group);
              }}
              onDeleteGroup={handleGroupDeleted}
              isExpanded={expandedGroups.has(group.id)}
              onToggleExpanded={() => toggleGroupExpanded(group.id)}
            />
          );
        })}
      </div>

      {/* Ungrouped Questions */}
      {ungroupedQuestions.length > 0 && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-1">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-900">Ungrouped Questions</h4>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {ungroupedQuestions.length} questions
                </span>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-2">
              {ungroupedQuestions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-white hover:border-gray-300 hover:shadow-sm"
                >
                  {/* Drag Handle */}
                  <div className="p-1 text-gray-400 cursor-move">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>

                  {/* Question Info */}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {question.variableName}: {question.titleTemplate}
                    </div>
                    <div className="text-xs text-gray-500">
                      {question.type}
                    </div>
                  </div>

                  {/* Move to Group Actions */}
                  <div className="flex items-center space-x-1">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => handleQuestionMoved(question.id, null, group.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title={`Move to ${group.titleTemplate || `Group ${group.index + 1}`}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {groups.length === 0 && ungroupedQuestions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
          <p className="text-gray-500 mb-4">Create groups and add questions to organize your survey</p>
          <button
            onClick={createGroup}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create First Group
          </button>
        </div>
      )}
    </div>
  );
}
