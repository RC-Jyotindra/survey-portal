"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
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

interface QuestionGroupProps {
  group: QuestionGroup;
  questionsInGroup: QuestionWithDetails[];
  surveyId: string;
  onGroupUpdated: (group: QuestionGroup) => void;
  onQuestionMoved: (questionId: string, fromGroupId: string | null, toGroupId: string | null) => void;
  onAddQuestionToGroup: (groupId: string) => void;
  onEditGroup: (group: QuestionGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export default function QuestionGroup({
  group,
  questionsInGroup,
  surveyId,
  onGroupUpdated,
  onQuestionMoved,
  onAddQuestionToGroup,
  onEditGroup,
  onDeleteGroup,
  isExpanded,
  onToggleExpanded
}: QuestionGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(group.titleTemplate || '');

  const handleTitleEdit = async () => {
    if (editedTitle.trim() === group.titleTemplate) {
      setIsEditing(false);
      return;
    }

    if (!surveyId || !group.pageId || !group.id) {
      console.error('Missing required IDs for group update');
      return;
    }

    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/pages/${group.pageId}/groups/${group.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({
          titleTemplate: editedTitle.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update group title');
      }

      const result = await response.json();
      onGroupUpdated(result.group);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating group title:', error);
      alert('Failed to update group title. Please try again.');
      setEditedTitle(group.titleTemplate || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleEdit();
    } else if (e.key === 'Escape') {
      setEditedTitle(group.titleTemplate || '');
      setIsEditing(false);
    }
  };

  const getShuffleIcon = () => {
    switch (group.innerOrderMode) {
      case 'RANDOM':
        return '🔀';
      case 'GROUP_RANDOM':
        return '🎲';
      case 'WEIGHTED':
        return '⚖️';
      default:
        return '➡️';
    }
  };

  const getShuffleTooltip = () => {
    switch (group.innerOrderMode) {
      case 'RANDOM':
        return 'Questions randomized individually';
      case 'GROUP_RANDOM':
        return 'Groups shuffled, questions in order';
      case 'WEIGHTED':
        return 'Weighted randomization';
      default:
        return 'Sequential order';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Group Header */}
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center space-x-3 flex-1">
          {/* Expand/Collapse Icon */}
          <div className="p-1">
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Group Title */}
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleTitleEdit}
                className="text-sm font-medium text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div 
                className="text-sm font-medium text-gray-900 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {group.titleTemplate || `Group ${group.index + 1}`}
              </div>
            )}
          </div>

          {/* Group Info */}
          <div className="flex items-center space-x-2">
            {/* Question Count */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {questionsInGroup.length} questions
            </span>

            {/* Shuffle Mode Icon */}
            <div 
              className="p-1 rounded hover:bg-gray-200"
              title={getShuffleTooltip()}
            >
              <span className="text-sm">{getShuffleIcon()}</span>
            </div>
          </div>
        </div>

        {/* Group Actions */}
        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEditGroup(group)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Edit group settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this group? All questions will be moved to ungrouped.')) {
                onDeleteGroup(group.id);
              }
            }}
            className="p-1 text-gray-400 hover:text-red-600 rounded"
            title="Delete group"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Group Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Group Description */}
          {group.descriptionTemplate && (
            <div className="text-sm text-gray-600 mb-4 p-2 bg-gray-50 rounded">
              {group.descriptionTemplate}
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-2 mb-4">
            {questionsInGroup.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-sm">No questions in this group yet</p>
                <p className="text-xs text-gray-400">Add questions to get started</p>
              </div>
            ) : (
              questionsInGroup.map((question, index) => (
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
                      {question.type} • Position {index + 1} in group
                    </div>
                  </div>

                  {/* Question Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onQuestionMoved(question.id, group.id, null)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      title="Move to ungrouped"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Question Button */}
          <button
            onClick={() => onAddQuestionToGroup(group.id)}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">Add Question to Group</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
