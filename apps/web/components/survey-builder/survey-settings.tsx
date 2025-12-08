"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { surveyApi, Survey } from '../../lib/api/survey-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ThemePreview from './theme-preview';

interface SurveySettingsProps {
  survey: Survey;
  onSurveyUpdated: (survey: Survey) => void;
}

export default function SurveySettings({
  survey,
  onSurveyUpdated
}: SurveySettingsProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: survey.title,
    description: survey.description || '',
    slug: survey.slug || '',
    defaultLanguage: 'en'
  });

  const [settings, setSettings] = useState({
    progressBar: true,
    allowBack: true,
    showPageNumbers: true,
    randomizeQuestions: false,
    theme: 'default'
  });


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Check if there are any changes from the original values
  const checkForChanges = () => {
    const originalFormData = {
      title: survey.title,
      description: survey.description || '',
      slug: survey.slug || '',
      defaultLanguage: 'en'
    };

    const originalSettings = {
      progressBar: true,
      allowBack: true,
      showPageNumbers: true,
      randomizeQuestions: false,
      theme: 'default'
    };

    const formDataChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData);
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    
    setHasChanges(formDataChanged || settingsChanged);
  };

  // Check for changes when component mounts or survey data changes
  useEffect(() => {
    checkForChanges();
  }, [survey, formData, settings]);


  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const updatedSurvey = await surveyApi.updateSurvey(survey.id, {
        title: formData.title,
        description: formData.description || undefined,
        slug: formData.slug || undefined,
        defaultLanguage: formData.defaultLanguage,
        settings: settings
      });

      onSurveyUpdated(updatedSurvey.survey as Survey);
      setSuccess('Survey settings updated successfully!');
      setHasChanges(false); // Reset changes flag after successful save
    } catch (err: any) {
      setError(err.message || 'Failed to update survey settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Check for changes after a short delay to ensure state is updated
    setTimeout(checkForChanges, 0);
  };

  const handleSettingChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Check for changes after a short delay to ensure state is updated
    setTimeout(checkForChanges, 0);
  };


  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData(prev => ({ ...prev, slug }));
    // Check for changes after a short delay to ensure state is updated
    setTimeout(checkForChanges, 0);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">General</h2>
            
            <div className="space-y-6">
              {/* Language Setting */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Language</h3>
                  <p className="text-sm text-gray-500">Choose the default language for your survey</p>
                </div>
                <div className="w-48">
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

              {/* Progress Bar Setting */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Progress bar</h3>
                  <p className="text-sm text-gray-500">Show a progress indicator to respondents</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.progressBar}
                    onChange={(e) => handleSettingChange('progressBar', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Allow Back Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Allow back navigation</h3>
                  <p className="text-sm text-gray-500">Let respondents go back to previous pages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowBack}
                    onChange={(e) => handleSettingChange('allowBack', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Show Page Numbers */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Show page numbers</h3>
                  <p className="text-sm text-gray-500">Display page numbers to respondents</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showPageNumbers}
                    onChange={(e) => handleSettingChange('showPageNumbers', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Randomize Questions */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Randomize questions</h3>
                  <p className="text-sm text-gray-500">Randomize question order within pages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.randomizeQuestions}
                    onChange={(e) => handleSettingChange('randomizeQuestions', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Theme Setting */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Theme</h3>
                  <p className="text-sm text-gray-500">Choose a visual theme for your survey</p>
                </div>
                <div className="w-48">
                  <select
                    value={settings.theme}
                    onChange={(e) => handleSettingChange('theme', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="default">Default</option>
                    <option value="modern">Modern</option>
                    <option value="minimal">Minimal</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
          {/* Theme Preview Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Theme Preview</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <ThemePreview
                selectedTheme={settings.theme}
                onThemeChange={(theme) => handleSettingChange('theme', theme)}
              />
            </div>
          </div>
        </form>

        {/* Bottom Actions */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                  hasChanges
                    ? 'text-white bg-blue-600 hover:bg-blue-700 border border-blue-600'
                    : 'text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {loading ? (
                  'Saving...'
                ) : (
                  <span className="flex items-center">
                    Save changes
                  </span>
                )}
              </button>
              <button
                type="button"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg 
                  className="w-4 h-4 mr-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
                Learn about settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
