"use client";

import { useState, useEffect, useCallback } from 'react';
import { surveyApi, Survey } from '@/lib/api/survey-api';

interface SecuritySettingsProps {
  survey: Survey;
  onSurveyUpdated: (survey: Survey) => void;
}

export default function SecuritySettings({ survey, onSurveyUpdated }: SecuritySettingsProps) {
  const [settings, setSettings] = useState({
    surveyAccess: 'PUBLIC', // 'PUBLIC' or 'SINGLE_USE'
    passwordProtected: false,
    surveyPassword: '',
    referralWebsite: false,
    referralWebsiteURL: '',
    onGoingSurveyPreventMultipleSubmissions: false,
    onGoingSurveyMultipleSubmissionsResponse: '',
    postSurveyPreventMultipleSubmissions: false,
    preventIndexing: true,
    uploadedFilesAccess: 'permission_required', // 'permission_required' or 'anyone_with_link'
    anonymizeResponses: false,
    // VPN Detection Settings
    vpnDetection: {
      enabled: false,
      blockThreshold: 85,
      challengeThreshold: 60,
      allowPrivateIPs: true,
      blockVPN: true,
      blockProxy: true,
      blockTor: true,
      blockHosting: false,
      customMessage: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if there are any changes from the original values
  const checkForChanges = useCallback(() => {
    const originalSettings = {
      surveyAccess: survey.settings?.security?.surveyAccess ?? 'PUBLIC',
      passwordProtected: survey.settings?.security?.passwordProtected ?? false,
      surveyPassword: survey.settings?.security?.surveyPassword ?? '',
      referralWebsite: survey.settings?.security?.referralWebsite ?? false,
      referralWebsiteURL: survey.settings?.security?.referralWebsiteURL ?? '',
      onGoingSurveyPreventMultipleSubmissions: survey.settings?.security?.onGoingSurveyPreventMultipleSubmissions ?? false,
      onGoingSurveyMultipleSubmissionsResponse: survey.settings?.security?.onGoingSurveyMultipleSubmissionsResponse ?? '',
      postSurveyPreventMultipleSubmissions: survey.settings?.security?.postSurveyPreventMultipleSubmissions ?? false,
      preventIndexing: survey.settings?.security?.preventIndexing ?? true,
      uploadedFilesAccess: survey.settings?.security?.uploadedFilesAccess ?? 'permission_required',
      anonymizeResponses: survey.settings?.security?.anonymizeResponses ?? false,
      vpnDetection: {
        enabled: survey.settings?.security?.vpnDetection?.enabled ?? false,
        blockThreshold: survey.settings?.security?.vpnDetection?.blockThreshold ?? 85,
        challengeThreshold: survey.settings?.security?.vpnDetection?.challengeThreshold ?? 60,
        allowPrivateIPs: survey.settings?.security?.vpnDetection?.allowPrivateIPs ?? true,
        blockVPN: survey.settings?.security?.vpnDetection?.blockVPN ?? true,
        blockProxy: survey.settings?.security?.vpnDetection?.blockProxy ?? true,
        blockTor: survey.settings?.security?.vpnDetection?.blockTor ?? true,
        blockHosting: survey.settings?.security?.vpnDetection?.blockHosting ?? false,
        customMessage: survey.settings?.security?.vpnDetection?.customMessage ?? ''
      }
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
      surveyAccess: survey.settings?.security?.surveyAccess ?? 'PUBLIC',
      passwordProtected: survey.settings?.security?.passwordProtected ?? false,
      surveyPassword: survey.settings?.security?.surveyPassword ?? '',
      referralWebsite: survey.settings?.security?.referralWebsite ?? false,
      referralWebsiteURL: survey.settings?.security?.referralWebsiteURL ?? '',
      onGoingSurveyPreventMultipleSubmissions: survey.settings?.security?.onGoingSurveyPreventMultipleSubmissions ?? false,
      onGoingSurveyMultipleSubmissionsResponse: survey.settings?.security?.onGoingSurveyMultipleSubmissionsResponse ?? '',
      postSurveyPreventMultipleSubmissions: survey.settings?.security?.postSurveyPreventMultipleSubmissions ?? false,
      preventIndexing: survey.settings?.security?.preventIndexing ?? true,
      uploadedFilesAccess: survey.settings?.security?.uploadedFilesAccess ?? 'permission_required',
      anonymizeResponses: survey.settings?.security?.anonymizeResponses ?? false,
      vpnDetection: {
        enabled: survey.settings?.security?.vpnDetection?.enabled ?? false,
        blockThreshold: survey.settings?.security?.vpnDetection?.blockThreshold ?? 85,
        challengeThreshold: survey.settings?.security?.vpnDetection?.challengeThreshold ?? 60,
        allowPrivateIPs: survey.settings?.security?.vpnDetection?.allowPrivateIPs ?? true,
        blockVPN: survey.settings?.security?.vpnDetection?.blockVPN ?? true,
        blockProxy: survey.settings?.security?.vpnDetection?.blockProxy ?? true,
        blockTor: survey.settings?.security?.vpnDetection?.blockTor ?? true,
        blockHosting: survey.settings?.security?.vpnDetection?.blockHosting ?? false,
        customMessage: survey.settings?.security?.vpnDetection?.customMessage ?? ''
      }
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
          security: settings
        }
      };

      // Make API call to update the survey
      const response = await surveyApi.updateSurvey(survey.id, updateData);
      
      // Update the parent component with the new survey data
      onSurveyUpdated(response.survey);
      setHasChanges(false);
      setSuccess('Security settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating survey:', err);
      setError(err.message || 'Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleVpnSettingChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      vpnDetection: {
        ...prev.vpnDetection,
        [field]: value
      }
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

      {/* Survey Access */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Survey access</h3>
        <p className="text-sm text-gray-500 mb-4">
          Indicate if your survey can be taken by anyone or only people with personal invites.
        </p>
        
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="surveyAccess"
              value="PUBLIC"
              checked={settings.surveyAccess === 'PUBLIC'}
              onChange={(e) => handleSettingChange('surveyAccess', e.target.value)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900">Public - Available to anyone</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="surveyAccess"
              value="SINGLE_USE"
              checked={settings.surveyAccess === 'SINGLE_USE'}
              onChange={(e) => handleSettingChange('surveyAccess', e.target.value)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900">Single Use - Invitation only</span>
          </label>
        </div>
      </div>

      {/* Password Protection */}
      <div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Password protection</h3>
              <p className="text-sm text-gray-500">
                Require respondents to enter a password before they can take your survey.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.passwordProtected}
                onChange={(e) => handleSettingChange('passwordProtected', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {settings.passwordProtected && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Survey Password
              </label>
              <input
                type="password"
                value={settings.surveyPassword}
                onChange={(e) => handleSettingChange('surveyPassword', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter survey password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Respondents will need to enter this password to access the survey
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Referral Website */}
      <div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Add a referral website URL</h3>
              <p className="text-sm text-gray-500">
                Allow people to take your survey only if they select a survey link included on a specific website.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.referralWebsite}
                onChange={(e) => handleSettingChange('referralWebsite', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {settings.referralWebsite && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Referral Website URL
              </label>
              <input
                type="url"
                value={settings.referralWebsiteURL}
                onChange={(e) => handleSettingChange('referralWebsiteURL', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only allow access from this specific website URL
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Prevent Multiple Submissions - In Survey */}
      <div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">In Survey: Prevent multiple submissions</h3>
              <p className="text-sm text-gray-500">
                If a duplicate respondent is detected at the beginning of your survey, prevent respondents from taking your survey multiple times. 
                You can choose to end the survey, redirect them to a website or flag the response.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.onGoingSurveyPreventMultipleSubmissions}
                onChange={(e) => handleSettingChange('onGoingSurveyPreventMultipleSubmissions', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {settings.onGoingSurveyPreventMultipleSubmissions && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Multiple Submissions Response Message
              </label>
              <textarea
                value={settings.onGoingSurveyMultipleSubmissionsResponse}
                onChange={(e) => handleSettingChange('onGoingSurveyMultipleSubmissionsResponse', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="You have already started this survey. Please complete your existing response or contact support if you need assistance."
              />
              <p className="text-xs text-gray-500 mt-1">
                Message shown to respondents who try to start the survey multiple times
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Post-Survey Duplicate Detection */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">Post-survey: Prevent multiple submissions with Duplicate Detection</h3>
            <p className="text-sm text-gray-500">
              After a response is submitted, analyze device and browser metadata to identify respondents attempting to take your survey multiple times.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.postSurveyPreventMultipleSubmissions}
              onChange={(e) => handleSettingChange('postSurveyPreventMultipleSubmissions', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Prevent Indexing */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">Prevent indexing</h3>
            <p className="text-sm text-gray-500">
              Block search engines from including your survey in their search results.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.preventIndexing}
              onChange={(e) => handleSettingChange('preventIndexing', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Uploaded Files Access */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Uploaded files access</h3>
        <p className="text-sm text-gray-500 mb-4">
          Indicate who should be able to view files uploaded by respondents
        </p>
        
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="uploadedFilesAccess"
              value="permission_required"
              checked={settings.uploadedFilesAccess === 'permission_required'}
              onChange={(e) => handleSettingChange('uploadedFilesAccess', e.target.value)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900">Only users with permission to view responses</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="uploadedFilesAccess"
              value="anyone_with_link"
              checked={settings.uploadedFilesAccess === 'anyone_with_link'}
              onChange={(e) => handleSettingChange('uploadedFilesAccess', e.target.value)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900">Anyone with the link to the file</span>
          </label>
        </div>
      </div>

      {/* Anonymize Responses */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">Anonymize responses</h3>
            <p className="text-sm text-gray-500">
              Don't record respondents' IP Address, location data, and contact info.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.anonymizeResponses}
              onChange={(e) => handleSettingChange('anonymizeResponses', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* VPN/Proxy Detection */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">VPN and Proxy Detection</h3>
        <p className="text-sm text-gray-500 mb-4">
          Block or challenge users accessing your survey through VPN, proxy, or Tor networks to prevent duplicate responses and ensure data quality.
        </p>
        
        {/* Master Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-sm font-medium text-gray-900">Enable VPN/Proxy Detection</label>
            <p className="text-sm text-gray-500">Automatically detect and block suspicious network connections</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.vpnDetection?.enabled || false}
              onChange={(e) => handleVpnSettingChange('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Advanced Settings (only show when enabled) */}
        {settings.vpnDetection?.enabled && (
          <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4">
            {/* Blocking Threshold */}
            <div>
              <label className="text-sm font-medium text-gray-900">Blocking Threshold</label>
              <p className="text-sm text-gray-500 mb-2">Risk score (0-100) above which users are blocked</p>
              <input
                type="range"
                min="50"
                max="100"
                value={settings.vpnDetection?.blockThreshold || 85}
                onChange={(e) => handleVpnSettingChange('blockThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Lenient (50)</span>
                <span className="font-medium">{settings.vpnDetection?.blockThreshold || 85}</span>
                <span>Strict (100)</span>
              </div>
            </div>

            {/* Detection Types */}
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2">Block These Connection Types</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.vpnDetection?.blockVPN || false}
                    onChange={(e) => handleVpnSettingChange('blockVPN', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">VPN connections</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.vpnDetection?.blockProxy || false}
                    onChange={(e) => handleVpnSettingChange('blockProxy', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">Proxy connections</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.vpnDetection?.blockTor || false}
                    onChange={(e) => handleVpnSettingChange('blockTor', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">Tor connections</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.vpnDetection?.blockHosting || false}
                    onChange={(e) => handleVpnSettingChange('blockHosting', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">Hosting provider IPs</span>
                </label>
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="text-sm font-medium text-gray-900">Custom Blocking Message</label>
              <p className="text-sm text-gray-500 mb-2">Message shown to blocked users (optional)</p>
              <textarea
                value={settings.vpnDetection?.customMessage || ''}
                onChange={(e) => handleVpnSettingChange('customMessage', e.target.value)}
                placeholder="Sorry, this survey cannot be accessed using VPN, proxy, or Tor networks. Please use a regular internet connection to participate."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        )}
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
