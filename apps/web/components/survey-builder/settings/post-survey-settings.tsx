"use client";

import { useState, useEffect, useCallback } from 'react';
import { surveyApi, Survey } from '@/lib/api/survey-api';

interface PostSurveySettingsProps {
  survey: Survey;
  onSurveyUpdated: (survey: Survey) => void;
}

interface ContactListWorkflow {
  id: string;
  name: string;
  conditions: any[];
  actions: any[];
}

export default function PostSurveySettings({ survey, onSurveyUpdated }: PostSurveySettingsProps) {
  const [settings, setSettings] = useState({
    thankYouEmail: false,
    thankYouEmailMessage: '',
    completedSurveyMessage: false,
    completedSurveyMessageText: '',
    redirectUrl: '',
    completionMessage: '',
    showResults: false,
    contactListWorkflows: [] as ContactListWorkflow[]
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if there are any changes from the original values
  const checkForChanges = useCallback(() => {
    const originalSettings = {
      thankYouEmail: survey.settings?.postSurvey?.thankYouEmail ?? false,
      thankYouEmailMessage: survey.settings?.postSurvey?.thankYouEmailMessage ?? '',
      completedSurveyMessage: survey.settings?.postSurvey?.completedSurveyMessage ?? false,
      completedSurveyMessageText: survey.settings?.postSurvey?.completedSurveyMessageText ?? '',
      redirectUrl: survey.settings?.postSurvey?.redirectUrl ?? '',
      completionMessage: survey.settings?.postSurvey?.completionMessage ?? '',
      showResults: survey.settings?.postSurvey?.showResults ?? false,
      contactListWorkflows: (survey.settings?.postSurvey?.contactListWorkflows ?? []) as ContactListWorkflow[]
    };

    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(settingsChanged);
  }, [settings, survey]);

  useEffect(() => {
    checkForChanges();
  }, [checkForChanges]);

  // Update form data when survey prop changes
  useEffect(() => {
    setSettings({
      thankYouEmail: survey.settings?.postSurvey?.thankYouEmail ?? false,
      thankYouEmailMessage: survey.settings?.postSurvey?.thankYouEmailMessage ?? '',
      completedSurveyMessage: survey.settings?.postSurvey?.completedSurveyMessage ?? false,
      completedSurveyMessageText: survey.settings?.postSurvey?.completedSurveyMessageText ?? '',
      redirectUrl: survey.settings?.postSurvey?.redirectUrl ?? '',
      completionMessage: survey.settings?.postSurvey?.completionMessage ?? '',
      showResults: survey.settings?.postSurvey?.showResults ?? false,
      contactListWorkflows: (survey.settings?.postSurvey?.contactListWorkflows ?? []) as ContactListWorkflow[]
    });
  }, [survey]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Prepare the update data
      const updateData = {
        settings: {
          ...survey.settings,
          postSurvey: settings
        }
      };

      // Make API call to update the survey
      const response = await surveyApi.updateSurvey(survey.id, updateData);
      
      // Update the parent component with the new survey data
      onSurveyUpdated(response.survey);
      setHasChanges(false);
      setSuccess('Post-survey settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating survey:', err);
      setError(err.message || 'Failed to update post-survey settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const addContactListWorkflow = () => {
    const newWorkflow = {
      id: Date.now().toString(),
      name: 'New Workflow',
      conditions: [],
      actions: []
    };
    
    setSettings(prev => ({
      ...prev,
      contactListWorkflows: [...prev.contactListWorkflows, newWorkflow]
    }));
  };

  const removeContactListWorkflow = (workflowId: string) => {
    setSettings(prev => ({
      ...prev,
      contactListWorkflows: prev.contactListWorkflows.filter(w => w.id !== workflowId)
    }));
  };

  return (
    <div className="space-y-8">
      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Thank You Email */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Send a thank you email</h3>
        <p className="text-sm text-gray-500 mb-4">
          Select a message from your library to send to respondents after they finish your survey.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.thankYouEmail}
                onChange={(e) => handleSettingChange('thankYouEmail', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-700">Enable thank you email</span>
          </div>
          
          {settings.thankYouEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Thank you email message
              </label>
              <textarea
                value={settings.thankYouEmailMessage}
                onChange={(e) => handleSettingChange('thankYouEmailMessage', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Thank you for completing our survey! Your responses have been recorded and will help us improve our services."
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be sent to respondents after they complete the survey
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Message for Revisiting Completed Survey */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Message for revisiting a completed survey</h3>
        <p className="text-sm text-gray-500 mb-4">
          Add a message for respondents that select a personalized link to a survey they've already completed.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.completedSurveyMessage}
                onChange={(e) => handleSettingChange('completedSurveyMessage', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-700">Enable completed survey message</span>
          </div>
          
          {settings.completedSurveyMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Completed survey message
              </label>
              <textarea
                value={settings.completedSurveyMessageText}
                onChange={(e) => handleSettingChange('completedSurveyMessageText', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="You have already completed this survey. Thank you for your participation!"
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be shown to respondents who try to access a survey they've already completed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact List Workflows */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Manage contact list workflows</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set conditions for managing a contact when they've completed a survey.
        </p>
        
        <div className="space-y-4">
          {settings.contactListWorkflows.length > 0 ? (
            settings.contactListWorkflows.map((workflow: any) => (
              <div key={workflow.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{workflow.name}</h4>
                  <button
                    onClick={() => removeContactListWorkflow(workflow.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Workflow configuration will be available here
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No contact list workflows configured</p>
            </div>
          )}
          
          <button
            onClick={addContactListWorkflow}
            className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add a contact list workflow
          </button>
        </div>
      </div>

      {/* Additional Post-Survey Options */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Additional Options</h3>
        
        <div className="space-y-4">
          {/* Redirect after completion */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Redirect URL after completion
            </label>
            <input
              type="url"
              value={settings.redirectUrl}
              onChange={(e) => handleSettingChange('redirectUrl', e.target.value)}
              placeholder="https://example.com/thank-you"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Redirect respondents to a specific URL after they complete the survey
            </p>
          </div>

          {/* Completion message */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Completion message
            </label>
            <textarea
              rows={3}
              value={settings.completionMessage}
              onChange={(e) => handleSettingChange('completionMessage', e.target.value)}
              placeholder="Thank you for completing our survey! Your responses have been recorded."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom message shown to respondents after they complete the survey
            </p>
          </div>

          {/* Show results */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Show results to respondents</h4>
              <p className="text-sm text-gray-500">
                Display survey results or summary to respondents after completion
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showResults}
                onChange={(e) => handleSettingChange('showResults', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-6 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={loading || !hasChanges}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2 ${
            hasChanges
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-gray-700 bg-gray-100 border border-gray-300'
          }`}
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>{loading ? 'Saving...' : 'Save changes'}</span>
        </button>
      </div>
    </div>
  );
}
