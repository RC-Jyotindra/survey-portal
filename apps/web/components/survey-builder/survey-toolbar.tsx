"use client";

import { useState } from 'react';
import { Survey, surveyApi } from '@/lib/api/survey-api';
import { useRouter } from 'next/navigation';

interface SurveyWithCounts extends Survey {
  _count: {
    pages: number;
    questions: number;
    sessions: number;
  };
}

interface SurveyToolbarProps {
  survey: SurveyWithCounts;
  onSurveyUpdated: (survey: SurveyWithCounts) => void;
}

export default function SurveyToolbar({ survey, onSurveyUpdated }: SurveyToolbarProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Title editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(survey.title);
  
  // Description editing states
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(survey.description || '');

  const handlePreview = () => {
    router.push(`/survey-builder/preview/${survey.id}`);
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      // TODO: Implement publish API call
      console.log('Publishing survey:', survey.id);
    } catch (error) {
      console.error('Error publishing survey:', error);
    } finally {
      setSaving(false);
    }
  };

  // Title editing functions
  const handleStartEditingTitle = () => {
    setIsEditingTitle(true);
    setEditedTitle(survey.title);
  };

  const handleCancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle(survey.title);
  };

  const handleSaveTitle = async () => {
    try {
      if (editedTitle.trim() === survey.title) {
        setIsEditingTitle(false);
        return;
      }

      setSaving(true);
      const updatedSurvey = await surveyApi.updateSurvey(survey.id, {
        title: editedTitle.trim()
      });
      
      onSurveyUpdated(updatedSurvey.survey as SurveyWithCounts);
      setIsEditingTitle(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error updating survey title:', error);
      alert('Failed to update survey title. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Description editing functions
  const handleStartEditingDescription = () => {
    setIsEditingDescription(true);
    setEditedDescription(survey.description || '');
  };

  const handleCancelEditingDescription = () => {
    setIsEditingDescription(false);
    setEditedDescription(survey.description || '');
  };

  const handleSaveDescription = async () => {
    try {
      if (editedDescription.trim() === (survey.description || '')) {
        setIsEditingDescription(false);
        return;
      }

      setSaving(true);
      const updatedSurvey = await surveyApi.updateSurvey(survey.id, {
        description: editedDescription.trim() || undefined
      });
      
      onSurveyUpdated(updatedSurvey.survey as SurveyWithCounts);
      setIsEditingDescription(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error updating survey description:', error);
      alert('Failed to update survey description. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section - Title and Save Status */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/survey-builder/dashboard')}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1">
            {/* Survey Title */}
            {isEditingTitle ? (
              <div className="flex items-center space-x-2 mb-1">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter survey title"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      handleCancelEditingTitle();
                    }
                  }}
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
                  title="Save title"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCancelEditingTitle}
                  className="p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 mb-1 group">
                <h1 className="text-lg font-medium text-gray-900">{survey.title}</h1>
                <button
                  onClick={handleStartEditingTitle}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit title"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Survey Description */}
            {isEditingDescription ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="text-sm text-gray-500 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter survey description"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveDescription();
                    } else if (e.key === 'Escape') {
                      handleCancelEditingDescription();
                    }
                  }}
                />
                <button
                  onClick={handleSaveDescription}
                  className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
                  title="Save description"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCancelEditingDescription}
                  className="p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="Cancel"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 group">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Draft</span>
                  {lastSaved && (
                    <>
                      <span className="text-green-500 text-xl">•</span>
                      <span>Saved at {formatTime(lastSaved)}</span>
                    </>
                  )}
                  {saving && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600">Saving...</span>
                    </>
                  )}
                </div>
                {survey.description && (
                  <>
                    <span>•</span>
                    <span className="text-sm text-gray-500">{survey.description}</span>
                  </>
                )}
                <button
                  onClick={handleStartEditingDescription}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit description"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center Section - Tools */}
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <div className="h-6 w-px bg-gray-300" />

          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </button>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePreview}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Preview
          </button>
          
          <button
            onClick={handlePublish}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
