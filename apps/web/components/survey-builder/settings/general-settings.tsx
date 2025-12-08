"use client";

import { useState, useEffect, useCallback } from 'react';
import { surveyApi, Survey } from '@/lib/api/survey-api';

interface GeneralSettingsProps {
  survey: Survey;
  onSurveyUpdated: (survey: Survey) => void;
}

export default function GeneralSettings({ survey, onSurveyUpdated }: GeneralSettingsProps) {
  const [formData, setFormData] = useState({
    title: survey.title,
    description: survey.description || '',
    slug: survey.slug || '',
    defaultLanguage: survey.defaultLanguage || 'en'
  });

  const [settings, setSettings] = useState({
    showQuestionNumbers: survey.settings?.showQuestionNumbers ?? true,
    newSurveyExperience: survey.settings?.newSurveyExperience ?? false
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if there are any changes from the original values
  const checkForChanges = useCallback(() => {
    const originalFormData = {
      title: survey.title,
      description: survey.description || '',
      slug: survey.slug || '',
      defaultLanguage: survey.defaultLanguage || 'en'
    };

    const originalSettings = {
      showQuestionNumbers: survey.settings?.showQuestionNumbers ?? true,
      newSurveyExperience: survey.settings?.newSurveyExperience ?? false
    };

    const formDataChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData);
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    
    setHasChanges(formDataChanged || settingsChanged);
  }, [formData, settings, survey]);

  useEffect(() => {
    checkForChanges();
  }, [checkForChanges]);

  // Update form data when survey prop changes
  useEffect(() => {
    setFormData({
      title: survey.title,
      description: survey.description || '',
      slug: survey.slug || '',
      defaultLanguage: survey.defaultLanguage || 'en'
    });

    setSettings({
      showQuestionNumbers: survey.settings?.showQuestionNumbers ?? true,
      newSurveyExperience: survey.settings?.newSurveyExperience ?? false
    });
  }, [survey]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      setError('Survey title is required');
      return;
    }

    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      setError('Survey URL can only contain lowercase letters, numbers, and hyphens');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Prepare the update data
      const updateData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        slug: formData.slug?.trim() || undefined,
        defaultLanguage: formData.defaultLanguage,
        settings: {
          ...survey.settings,
          showQuestionNumbers: settings.showQuestionNumbers,
          newSurveyExperience: settings.newSurveyExperience
        }
      };

      // Make API call to update the survey
      const response = await surveyApi.updateSurvey(survey.id, updateData);
      
      // Update the parent component with the new survey data
      onSurveyUpdated(response.survey);
      setHasChanges(false);
      setSuccess('Survey settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating survey:', err);
      setError(err.message || 'Failed to update survey settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData(prev => ({ ...prev, slug }));
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

      {/* Survey Information */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Survey Information</h2>
        
        <div className="space-y-6">
          {/* Survey Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Survey Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter survey title"
            />
          </div>

          {/* Survey Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Survey Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter survey description"
            />
          </div>

          {/* Survey Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Survey URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleFieldChange('slug', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="survey-url"
              />
              <button
                type="button"
                onClick={generateSlug}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This will be used in your survey URL: /s/{formData.slug || 'survey-url'}
            </p>
          </div>

          {/* Language Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Default Language
            </label>
            <select
              value={formData.defaultLanguage}
              onChange={(e) => handleFieldChange('defaultLanguage', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
            </select>
          </div>
        </div>
      </div>

      {/* Survey Behavior */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Survey Behavior</h2>
        
        <div className="space-y-6">
          {/* Show Question Numbers */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Show question numbers</h3>
              <p className="text-sm text-gray-500">Display question numbers to respondents</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showQuestionNumbers}
                onChange={(e) => handleSettingChange('showQuestionNumbers', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* New Survey Experience */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">New survey taking experience</h3>
              <p className="text-sm text-gray-500">Enable the enhanced survey interface</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.newSurveyExperience}
                onChange={(e) => handleSettingChange('newSurveyExperience', e.target.checked)}
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
