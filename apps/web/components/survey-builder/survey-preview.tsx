"use client";

import { useState, useEffect, useMemo } from 'react';
import { Survey } from '@/lib/api/survey-api';
import { PageWithQuestions } from '@/lib/api/pages-api';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import SurveyHeader from './preview/survey-header';
import SurveyPage from './preview/survey-page';
import SurveyNavigation from './preview/survey-navigation';
import SurveyProgress from './preview/survey-progress';
import ThemeProvider from './preview/theme-provider';
import { generateMockResponses, generateMockEmbeddedData, generateMockGeoIPData } from '../../lib/piping-utils';
import { PreviewLogicEngine, JumpDestination } from '../../lib/preview-logic-engine';
import './preview/preview.css';

interface SurveyPreviewProps {
  survey: Survey;
  pages: PageWithQuestions[];
  questions: QuestionWithDetails[];
}

export default function SurveyPreview({
  survey,
  pages,
  questions
}: SurveyPreviewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jumpPending, setJumpPending] = useState<JumpDestination | null>(null);
  
  // Generate mock data for piping demonstration
  const mockQuestionResponses = generateMockResponses(questions);
  const mockEmbeddedData = generateMockEmbeddedData();
  const mockGeoIPData = generateMockGeoIPData();

  // Create logic engine (stable instance)
  const logicEngine = useMemo(() => {
    return new PreviewLogicEngine({
      questionResponses: {},
      embeddedData: mockEmbeddedData,
      allQuestions: questions,
      allPages: pages,
      currentPageIndex: 0
    });
  }, [questions.length, pages.length]); // Only recreate if questions/pages structure changes

  // Update logic engine context when responses change
  useEffect(() => {
    const updatedResponses = { ...mockQuestionResponses, ...responses };
    logicEngine.updateContext({
      questionResponses: updatedResponses,
      currentPageIndex
    });
  }, [logicEngine, mockQuestionResponses, responses, currentPageIndex]);

  // Get visible pages based on logic
  const visiblePages = useMemo(() => {
    return logicEngine.getVisiblePages();
  }, [logicEngine]);

  // Current page from visible pages
  const currentPage = visiblePages[currentPageIndex];

  // Get base questions for current page (without response-dependent filtering)
  const basePageQuestions = useMemo(() => {
    if (!currentPage) return [];
    
    // Get all questions for this page (without visibility filtering that depends on responses)
    const allPageQuestions = questions
      .filter(q => q.pageId === currentPage.id)
      .sort((a, b) => a.index - b.index);
    
    // Apply stable randomization (this should only happen once per page)
    return logicEngine.applyQuestionRandomization(allPageQuestions, currentPage);
  }, [currentPage?.id, questions, logicEngine]);

  // Get visible questions from the stable randomized list
  const pageQuestions = useMemo(() => {
    // Apply visibility filtering to the stable randomized questions
    return basePageQuestions.filter(question => logicEngine.isQuestionVisible(question));
  }, [basePageQuestions, responses, mockQuestionResponses]); // This can depend on responses for visibility

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Check for jump logic after response change
    setTimeout(() => {
      // Update logic engine context first
      const updatedResponses = { ...mockQuestionResponses, ...responses, [questionId]: value };
      logicEngine.updateContext({
        questionResponses: updatedResponses,
        currentPageIndex
      });
      
      const jumpDestination = logicEngine.evaluateJumpLogic(questionId);
      if (jumpDestination) {
        setJumpPending(jumpDestination);
        executeJump(jumpDestination);
      }
    }, 150); // Small delay to ensure state update
  };

  const executeJump = (destination: JumpDestination) => {
    switch (destination.type) {
      case 'page':
        if (destination.pageIndex !== undefined) {
          setCurrentPageIndex(destination.pageIndex);
        }
        break;
      case 'question':
        // Find the page containing the target question
        const targetQuestion = questions.find(q => q.id === destination.id);
        if (targetQuestion) {
          const targetPageIndex = visiblePages.findIndex(p => p.id === targetQuestion.pageId);
          if (targetPageIndex !== -1) {
            setCurrentPageIndex(targetPageIndex);
          }
        }
        break;
      case 'end':
        // Jump to end (submit)
        handleSubmit();
        break;
    }
    setJumpPending(null);
  };

  const handleNextPage = () => {
    if (currentPageIndex < visiblePages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Here you would submit the responses to your API
      console.log('Survey responses:', responses);
      alert('Survey submitted successfully! (This is a preview)');
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Error submitting survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastPage = currentPageIndex === visiblePages.length - 1;
  const isFirstPage = currentPageIndex === 0;

  // Get theme from survey settings
  const themeName = (survey as any)?.settings?.theme || 'default';

  return (
    <ThemeProvider themeName={themeName}>
      <div className="survey-preview bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Survey Header */}
        <div className="survey-header">
          <SurveyHeader survey={survey} />
        </div>

        {/* Progress Bar */}
        <div className="survey-progress">
          <SurveyProgress
            currentPage={currentPageIndex + 1}
            totalPages={visiblePages.length}
          />
        </div>

        {/* Current Page */}
        <div className="survey-content">
          {currentPage && (
            <SurveyPage
              page={currentPage}
              questions={pageQuestions}
              responses={responses}
              onResponseChange={handleResponseChange}
              surveyId={survey.id}
              questionResponses={{ ...mockQuestionResponses, ...responses }}
              embeddedData={mockEmbeddedData}
              allQuestions={questions}
              logicEngine={logicEngine}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="survey-navigation">
          <SurveyNavigation
            isFirstPage={isFirstPage}
            isLastPage={isLastPage}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            currentPageIndex={currentPageIndex}
            totalPages={visiblePages.length}
            jumpPending={jumpPending}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}
