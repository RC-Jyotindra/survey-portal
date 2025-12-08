"use client";

import { useState, useEffect, useCallback } from 'react';
import { surveyApi, Survey } from '@/lib/api/survey-api';
import { config } from '@/lib/config';
import { getApiHeaders } from '@/lib/api-headers';

interface ResponsesSettingsProps {
  survey: Survey;
  onSurveyUpdated: (survey: Survey) => void;
}

export default function ResponsesSettings({ survey, onSurveyUpdated }: ResponsesSettingsProps) {
  const [settings, setSettings] = useState({
    backButton: false,
    allowFinishLater: true,
    customErrorMessages: false,
    customErrorMessageText: '',
    incompleteResponses: 'record', // 'record' or 'delete'
    incompleteTimeLimit: '1_week', // '1_week', '2_weeks', '1_month', etc.
    incompleteTimerStart: 'last_edit', // 'survey_start' or 'last_edit'
    automaticClosure: false,
    automaticClosureMessage: '',
    surveyAvailability: 'open', // 'open' or 'scheduled'
    surveyStartDate: '',
    surveyStartTime: '',
    surveyEndDate: '',
    surveyEndTime: '',
    inactiveMessageType: 'default', // 'default' or 'custom'
    customInactiveMessage: ''
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [collector, setCollector] = useState<any>(null);

  // Check if there are any changes from the original values
  const checkForChanges = useCallback(() => {
    const originalSettings = {
      backButton: survey.settings?.responses?.backButton ?? false,
      allowFinishLater: survey.settings?.responses?.allowFinishLater ?? true,
      customErrorMessages: survey.settings?.responses?.customErrorMessages ?? false,
      customErrorMessageText: survey.settings?.responses?.customErrorMessageText ?? '',
      incompleteResponses: survey.settings?.responses?.incompleteResponses ?? 'record',
      incompleteTimeLimit: survey.settings?.responses?.incompleteTimeLimit ?? '1_week',
      incompleteTimerStart: survey.settings?.responses?.incompleteTimerStart ?? 'last_edit',
      automaticClosure: survey.settings?.responses?.automaticClosure ?? false,
      automaticClosureMessage: survey.settings?.responses?.automaticClosureMessage ?? '',
      surveyAvailability: survey.settings?.responses?.surveyAvailability ?? 'open',
      surveyStartDate: survey.settings?.responses?.surveyStartDate ?? '',
      surveyStartTime: survey.settings?.responses?.surveyStartTime ?? '',
      surveyEndDate: survey.settings?.responses?.surveyEndDate ?? '',
      surveyEndTime: survey.settings?.responses?.surveyEndTime ?? '',
      inactiveMessageType: survey.settings?.responses?.inactiveMessageType ?? 'default',
      customInactiveMessage: survey.settings?.responses?.customInactiveMessage ?? ''
    };

    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(settingsChanged);
  }, [settings, survey]);

  useEffect(() => {
    checkForChanges();
  }, [checkForChanges]);

  // Load collector data and initialize form data when survey prop changes
  useEffect(() => {
    const loadCollectorData = async () => {
      try {
        // Fetch collector data for this survey
        const response = await fetch(`${config.api.surveyService}/api/authoring/surveys/${survey.id}/collectors`, {
          headers: getApiHeaders()
        });
        
        if (response.ok) {
          const collectors = await response.json();
          if (collectors.length > 0) {
            const collectorData = collectors[0];
            setCollector(collectorData); // Get the first (and only) collector
            
            // If collector has opensAt/closesAt, populate the date/time fields
            if (collectorData.opensAt || collectorData.closesAt) {
              setSettings(prev => ({
                ...prev,
                surveyAvailability: 'scheduled',
                surveyStartDate: collectorData.opensAt ? new Date(collectorData.opensAt).toISOString().split('T')[0] || '' : '',
                surveyStartTime: collectorData.opensAt ? new Date(collectorData.opensAt).toTimeString().slice(0, 5) || '' : '',
                surveyEndDate: collectorData.closesAt ? new Date(collectorData.closesAt).toISOString().split('T')[0] || '' : '',
                surveyEndTime: collectorData.closesAt ? new Date(collectorData.closesAt).toTimeString().slice(0, 5) || '' : ''
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error loading collector data:', err);
      }
    };

    loadCollectorData();

    // Initialize form data from survey settings
    setSettings({
      backButton: survey.settings?.responses?.backButton ?? false,
      allowFinishLater: survey.settings?.responses?.allowFinishLater ?? true,
      customErrorMessages: survey.settings?.responses?.customErrorMessages ?? false,
      customErrorMessageText: survey.settings?.responses?.customErrorMessageText ?? '',
      incompleteResponses: survey.settings?.responses?.incompleteResponses ?? 'record',
      incompleteTimeLimit: survey.settings?.responses?.incompleteTimeLimit ?? '1_week',
      incompleteTimerStart: survey.settings?.responses?.incompleteTimerStart ?? 'last_edit',
      automaticClosure: survey.settings?.responses?.automaticClosure ?? false,
      automaticClosureMessage: survey.settings?.responses?.automaticClosureMessage ?? '',
      surveyAvailability: survey.settings?.responses?.surveyAvailability ?? 'open',
      surveyStartDate: survey.settings?.responses?.surveyStartDate ?? '',
      surveyStartTime: survey.settings?.responses?.surveyStartTime ?? '',
      surveyEndDate: survey.settings?.responses?.surveyEndDate ?? '',
      surveyEndTime: survey.settings?.responses?.surveyEndTime ?? '',
      inactiveMessageType: survey.settings?.responses?.inactiveMessageType ?? 'default',
      customInactiveMessage: survey.settings?.responses?.customInactiveMessage ?? ''
    });
  }, [survey]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');


      // Prepare the update data for survey settings
      const updateData = {
        settings: {
          ...survey.settings,
          responses: settings
        }
      };

      // Make API call to update the survey
      const response = await surveyApi.updateSurvey(survey.id, updateData);
      
      // Update collector times if survey availability is scheduled
      if (settings.surveyAvailability === 'scheduled' && collector) {
        const opensAt = new Date(`${settings.surveyStartDate}T${settings.surveyStartTime}`);
        const closesAt = new Date(`${settings.surveyEndDate}T${settings.surveyEndTime}`);
        
        // Update collector times
        await fetch(`${config.api.surveyService}/api/authoring/collectors/${collector.id}`, {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({
            opensAt: opensAt.toISOString(),
            closesAt: closesAt.toISOString()
          })
        });
      }
      
      // Update the parent component with the new survey data
      onSurveyUpdated(response.survey);
      setHasChanges(false);
      setSuccess('Responses settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating survey:', err);
      setError(err.message || 'Failed to update responses settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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

      {/* Back Button */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">Back button</h3>
            <p className="text-sm text-gray-500">
              Add a back button to your survey to allow people to change their responses. 
              The back button won't appear when you have survey flow elements between survey blocks.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.backButton}
              onChange={(e) => handleSettingChange('backButton', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Allow Finish Later */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">Allow respondents to finish later</h3>
            <p className="text-sm text-gray-500">
              Let respondents coming from an anonymous link leave your survey and re-enter to finish it later. 
              Respondents with a personalized link will still be able to stop and continue at a later time, even when this option is off.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowFinishLater}
              onChange={(e) => handleSettingChange('allowFinishLater', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Custom Error Messages */}
      <div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Custom error messages</h3>
              <p className="text-sm text-gray-500">
                Show a custom message to respondents when they skip a required question or provide an invalid response.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.customErrorMessages}
                onChange={(e) => handleSettingChange('customErrorMessages', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {settings.customErrorMessages && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Custom Error Message
              </label>
              <textarea
                value={settings.customErrorMessageText}
                onChange={(e) => handleSettingChange('customErrorMessageText', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide a valid response to continue."
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be shown when respondents skip required questions or provide invalid responses
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Incomplete Survey Responses */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Incomplete survey responses</h3>
        <p className="text-sm text-gray-500 mb-4">
          Select what to do with incomplete responses and indicate when they should be considered incomplete.
        </p>
        
        <div className="space-y-4">
          {/* What to do with incomplete responses */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              What should be done with incomplete survey responses?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="incompleteResponses"
                  value="record"
                  checked={settings.incompleteResponses === 'record'}
                  onChange={(e) => handleSettingChange('incompleteResponses', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">Record</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="incompleteResponses"
                  value="delete"
                  checked={settings.incompleteResponses === 'delete'}
                  onChange={(e) => handleSettingChange('incompleteResponses', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">Delete</span>
              </label>
            </div>
          </div>

          {/* Time limit */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              How much time should pass before they're considered incomplete?
            </label>
            <select
              value={settings.incompleteTimeLimit}
              onChange={(e) => handleSettingChange('incompleteTimeLimit', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1_week">1 Week</option>
              <option value="2_weeks">2 Weeks</option>
              <option value="1_month">1 Month</option>
              <option value="3_months">3 Months</option>
            </select>
          </div>

          {/* Timer start */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Which respondent activity determines when to start the timer?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="incompleteTimerStart"
                  value="survey_start"
                  checked={settings.incompleteTimerStart === 'survey_start'}
                  onChange={(e) => handleSettingChange('incompleteTimerStart', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">Survey start time</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="incompleteTimerStart"
                  value="last_edit"
                  checked={settings.incompleteTimerStart === 'last_edit'}
                  onChange={(e) => handleSettingChange('incompleteTimerStart', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">Last time they edited a response</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Automatic Survey Closure */}
      <div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Automatic survey closure</h3>
              <p className="text-sm text-gray-500">
                Collect incomplete survey responses and close survey access after any applicable survey expiry dates 
                (Survey availability expiration, personalized link expiration, etc.)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Once responses are recorded or deleted, respondents won't be able to revisit the survey.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.automaticClosure}
                onChange={(e) => handleSettingChange('automaticClosure', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {settings.automaticClosure && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Automatic Closure Message
              </label>
              <textarea
                value={settings.automaticClosureMessage}
                onChange={(e) => handleSettingChange('automaticClosureMessage', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="This survey has been closed. Thank you for your participation."
              />
              <p className="text-xs text-gray-500 mt-1">
                Message shown to respondents when the survey is automatically closed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Survey Availability */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Survey availability</h3>
        <p className="text-sm text-gray-500 mb-4">
          You can leave your survey open for responses indefinitely or set a specific start and expiration time.
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="surveyAvailability"
                value="open"
                checked={settings.surveyAvailability === 'open'}
                onChange={(e) => handleSettingChange('surveyAvailability', e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">Leave survey open to collect responses</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="surveyAvailability"
                value="scheduled"
                checked={settings.surveyAvailability === 'scheduled'}
                onChange={(e) => handleSettingChange('surveyAvailability', e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">Set specific start and expiration date</span>
            </label>
          </div>

          {settings.surveyAvailability === 'scheduled' && (
            <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Survey start</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={settings.surveyStartDate}
                      onChange={(e) => handleSettingChange('surveyStartDate', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={settings.surveyStartTime}
                      onChange={(e) => handleSettingChange('surveyStartTime', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Survey expiration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={settings.surveyEndDate}
                      onChange={(e) => handleSettingChange('surveyEndDate', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={settings.surveyEndTime}
                      onChange={(e) => handleSettingChange('surveyEndTime', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Time Zone Information */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  UTC +05:30 — Chennai, Kolkata, Mumbai, New Delhi, Sri Jayawardenepura
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Time zone is based on your account settings
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inactive Survey Message */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Inactive survey message</h3>
        <p className="text-sm text-gray-500 mb-4">
          Show a message to people who visit your survey after it expires or after you've made it inactive.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Message type</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="inactiveMessageType"
                  value="default"
                  checked={settings.inactiveMessageType === 'default'}
                  onChange={(e) => handleSettingChange('inactiveMessageType', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">Default</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="inactiveMessageType"
                  value="custom"
                  checked={settings.inactiveMessageType === 'custom'}
                  onChange={(e) => handleSettingChange('inactiveMessageType', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">Custom</span>
              </label>
            </div>
          </div>

          {settings.inactiveMessageType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Custom Inactive Message
              </label>
              <textarea
                value={settings.customInactiveMessage}
                onChange={(e) => handleSettingChange('customInactiveMessage', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="This survey is no longer active. Thank you for your interest."
              />
              <p className="text-xs text-gray-500 mt-1">
                Message shown to respondents when they visit an inactive or expired survey
              </p>
            </div>
          )}
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
