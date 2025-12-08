"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { surveyApi, Survey } from '@/lib/api/survey-api';
import { pagesAPI, PageWithQuestions } from '@/lib/api/pages-api';
import { questionsAPI, QuestionWithDetails } from '@/lib/api/questions-api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import SurveyCanvas from '@/components/survey-builder/survey-canvas';

interface SurveyWithCounts extends Survey {
  _count: {
    pages: number;
    questions: number;
    sessions: number;
  };
}

export default function SurveyEditPage() {
  const params = useParams();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<SurveyWithCounts | null>(null);
  const [pages, setPages] = useState<PageWithQuestions[]>([]);
  const [questions, setQuestions] = useState<QuestionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSurveyData();
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
        // Calculate counts from actual data
        const calculatedSurvey: SurveyWithCounts = {
          ...surveyData.survey,
          _count: {
            pages: pagesData.length,
            questions: questionsData.length,
            sessions: surveyData.survey._count?.sessions || 0
          }
        };
        setSurvey(calculatedSurvey);
      }

      setPages(pagesData);
      setQuestions(questionsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load survey data');
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyUpdated = (updatedSurvey: SurveyWithCounts) => {
    setSurvey(updatedSurvey);
  };

  const handlePageCreated = (newPage: PageWithQuestions) => {
    setPages(prev => [...prev, newPage]);
    setSurvey(prev => prev ? {
      ...prev,
      _count: { ...prev._count, pages: prev._count.pages + 1 }
    } : null);
  };

  const handlePageUpdated = (updatedPage: PageWithQuestions) => {
    setPages(prev => prev.map(page => 
      page.id === updatedPage.id ? updatedPage : page
    ));
  };

  const handlePageDeleted = (pageId: string) => {
    setPages(prev => prev.filter(page => page.id !== pageId));
    // Also remove questions from the deleted page
    setQuestions(prev => prev.filter(question => question.pageId !== pageId));
    setSurvey(prev => prev ? {
      ...prev,
      _count: { 
        ...prev._count, 
        pages: prev._count.pages - 1,
        questions: prev._count.questions - questions.filter(q => q.pageId === pageId).length
      }
    } : null);
  };

  const handleQuestionCreated = (newQuestion: QuestionWithDetails) => {
    setQuestions(prev => [...prev, newQuestion]);
    setSurvey(prev => prev ? {
      ...prev,
      _count: { ...prev._count, questions: prev._count.questions + 1 }
    } : null);
  };

  const handleQuestionUpdated = (updatedQuestion: QuestionWithDetails) => {
    setQuestions(prev => prev.map(question => 
      question.id === updatedQuestion.id ? updatedQuestion : question
    ));
  };

  const handleQuestionDeleted = (questionId: string) => {
    setQuestions(prev => prev.filter(question => question.id !== questionId));
    setSurvey(prev => prev ? {
      ...prev,
      _count: { ...prev._count, questions: prev._count.questions - 1 }
    } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadSurveyData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Survey not found</div>
      </div>
    );
  }

  return (
    <SurveyCanvas
      survey={survey}
      pages={pages}
      questions={questions}
      onSurveyUpdated={handleSurveyUpdated}
      onPageCreated={handlePageCreated}
      onPageUpdated={handlePageUpdated}
      onPageDeleted={handlePageDeleted}
      onQuestionCreated={handleQuestionCreated}
      onQuestionUpdated={handleQuestionUpdated}
      onQuestionDeleted={handleQuestionDeleted}
    />
  );
}
