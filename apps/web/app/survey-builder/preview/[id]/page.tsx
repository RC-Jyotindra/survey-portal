"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { surveyApi, Survey } from '@/lib/api/survey-api';
import { pagesAPI, PageWithQuestions } from '@/lib/api/pages-api';
import { questionsAPI, QuestionWithDetails } from '@/lib/api/questions-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import SurveyPreview from '@/components/survey-builder/survey-preview';
import Header from '@/components/navigation/header';

export default function SurveyPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [pages, setPages] = useState<PageWithQuestions[]>([]);
  const [questions, setQuestions] = useState<QuestionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (surveyId) {
      loadSurveyData();
    }
  }, [surveyId]);

  const loadSurveyData = async () => {
    try {
      setLoading(true);
      setError('');

      const [surveyData, pagesData, questionsData] = await Promise.all([
        surveyApi.getSurvey(surveyId),
        pagesAPI.getPages(surveyId),
        questionsAPI.getQuestions(surveyId)
      ]);

      if (surveyData.survey) {
        setSurvey({
          ...surveyData.survey,
          description: surveyData.survey.description || undefined,
          slug: surveyData.survey.slug || undefined,
          createdByUserId: surveyData.survey.createdByUserId || undefined,
          _count: surveyData.survey._count || { pages: 0, questions: 0, sessions: 0 }
        });
      }
      setPages(pagesData);
      setQuestions(questionsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load survey data');
    } finally {
      setLoading(false);
    }
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
          <div className="text-red-600 text-xl mb-4">Error loading survey</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/survey-builder/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <Header 
        surveyTitle={survey.title}
        surveyId={surveyId}
        showSurveyActions={true}
      />

      {/* Preview Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <SurveyPreview
          survey={survey}
          pages={pages}
          questions={questions}
        />
      </main>
    </div>
  );
}
