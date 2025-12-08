"use client";

import { useState } from 'react';
import { Survey } from '@/lib/api/survey-api';
import GeneralSettings from './general-settings';
import ResponsesSettings from './responses-settings';
import SecuritySettings from './security-settings';
import PostSurveySettings from './post-survey-settings';

interface SettingsTabsProps {
  survey: Survey;
  onSurveyUpdated: (survey: Survey) => void;
}

type TabType = 'general' | 'responses' | 'security' | 'post-survey';

const tabs = [
  { id: 'general' as TabType, label: 'General Settings', icon: '📄' },
  { id: 'responses' as TabType, label: 'Responses', icon: '📊' },
  { id: 'security' as TabType, label: 'Security', icon: '🔒' },
  { id: 'post-survey' as TabType, label: 'Post Survey', icon: '📧' }
];

export default function SettingsTabs({ survey, onSurveyUpdated }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings survey={survey} onSurveyUpdated={onSurveyUpdated} />;
      case 'responses':
        return <ResponsesSettings survey={survey} onSurveyUpdated={onSurveyUpdated} />;
      case 'security':
        return <SecuritySettings survey={survey} onSurveyUpdated={onSurveyUpdated} />;
      case 'post-survey':
        return <PostSurveySettings survey={survey} onSurveyUpdated={onSurveyUpdated} />;
      default:
        return <GeneralSettings survey={survey} onSurveyUpdated={onSurveyUpdated} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Settings Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}
