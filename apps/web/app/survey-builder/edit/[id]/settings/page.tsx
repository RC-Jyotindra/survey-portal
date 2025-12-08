"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { surveyApi, Survey } from '@/lib/api/survey-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import SettingsTabs from '@/components/survey-builder/settings/settings-tabs';
import Header from '@/components/navigation/header';

interface SurveyWithCounts extends Survey {
  _count: {
    pages: number;
    questions: number;
    sessions: number;
  };
}

export default function SurveySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<SurveyWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSurveyData();
  }, [surveyId]);

  const loadSurveyData = async () => {
    try {
      setLoading(true);
      setError('');

      const surveyData = await surveyApi.getSurvey(surveyId);

      if (surveyData.survey) {
        const surveyWithCounts: SurveyWithCounts = {
          ...surveyData.survey,
          _count: surveyData.survey._count || {
            pages: 0,
            questions: 0,
            sessions: 0
          }
        };
        setSurvey(surveyWithCounts);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load survey data');
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyUpdated = (updatedSurvey: Survey) => {
    // Convert Survey to SurveyWithCounts by ensuring _count is defined
    const surveyWithCounts: SurveyWithCounts = {
      ...updatedSurvey,
      _count: updatedSurvey._count || {
        pages: 0,
        questions: 0,
        sessions: 0
      }
    };
    setSurvey(surveyWithCounts);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/survey-builder/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">Survey not found</div>
          <button
            onClick={() => router.push('/survey-builder/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        surveyTitle={survey.title}
        surveyId={surveyId}
        showSurveyActions={true}
      />
      
      <SettingsTabs
        survey={survey}
        onSurveyUpdated={handleSurveyUpdated}
      />
    </div>
  );
}
