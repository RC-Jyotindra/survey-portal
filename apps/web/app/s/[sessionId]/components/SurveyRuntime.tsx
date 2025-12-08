'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { ResolvedPage, ResolvedQuestion, ResolvedOption } from './types';
import QuestionRenderer from './QuestionRenderer';
import SurveyProgress from './SurveyProgress';
import SurveyNavigation from './SurveyNavigation';
import { config } from '@/lib/config';

interface SurveyRuntimeProps {
  sessionId: string;
}

interface ValidationViolation {
  questionId: string;
  code: string;
  message: string;
  field?: string;
}

interface SubmitResponse {
  next?: {
    pageId: string;
    questionId?: string;
  };
  complete?: boolean;
  terminated?: boolean;
  reason?: string;
  violations?: ValidationViolation[];
}

export default function SurveyRuntime({ sessionId }: SurveyRuntimeProps) {
  const [currentPage, setCurrentPage] = useState<ResolvedPage | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [violations, setViolations] = useState<ValidationViolation[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);
  const [isResumed, setIsResumed] = useState(false);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  // Load initial page or resume session
  useEffect(() => {
    const loadSession = async () => {
      try {
        // First, try to resume the session
        try {
          const resumeData: any = await api.get(`/api/runtime/${sessionId}/resume`, {
            headers: {
              'ngrok-skip-browser-warning': 'true',
            },
          });
          
          if (resumeData.canResume && resumeData.currentPageId) {
            // Resume from where user left off
            setCurrentPage(resumeData.pageData);
            setIsResumed(true);
            
            // Set page history for progress tracking
            if (resumeData.progressData?.pageHistory) {
              setPageHistory(resumeData.progressData.pageHistory);
              // Set current page number based on history length + 1 (current page)
              setCurrentPageNumber(resumeData.progressData.pageHistory.length + 1);
            }
            
            // Restore saved answers if any
            if (resumeData.progressData?.currentAnswers) {
              const savedAnswers: Record<string, any> = {};
              resumeData.progressData.currentAnswers.forEach((answer: any) => {
                savedAnswers[answer.questionId] = {
                  choices: answer.choices,
                  textValue: answer.textValue,
                  numericValue: answer.numericValue,
                  booleanValue: answer.booleanValue,
                  emailValue: answer.emailValue,
                  phoneValue: answer.phoneValue,
                  urlValue: answer.urlValue,
                  dateValue: answer.dateValue,
                  timeValue: answer.timeValue,
                  matrixValue: answer.matrixValue,
                  jsonValue: answer.jsonValue
                };
              });
              setAnswers(savedAnswers);
            }
            
            return; // Successfully resumed
          }
        } catch (resumeError) {
          // If resume fails, fall back to normal session start
          console.log('Resume failed, starting fresh session:', resumeError);
        }
        
        // Fallback: Get session status to find first page
        const statusData: any = await api.get(`/api/runtime/${sessionId}/status`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        });
        
        if (!statusData.firstPageId) {
          throw new Error('No pages found for this survey');
        }
        
        // Set total pages if available
        if (statusData.totalPages) {
          setTotalPages(statusData.totalPages);
        }
        
        await loadPage(statusData.firstPageId);
      } catch (err) {
        console.error('Failed to load session:', err);
        setError('Failed to load survey');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const loadPage = async (pageId: string) => {
    try {
      setLoading(true);
      setError(null);
      setViolations([]);

      const pageData: ResolvedPage = await api.get(`/api/runtime/${sessionId}/pages/${pageId}/layout`);
      setCurrentPage(pageData);
      
    } catch (err) {
      console.error('Failed to load page:', err);
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear violations for this question
    setViolations(prev => prev.filter(v => v.questionId !== questionId));
  };

  const handleSubmit = async () => {
    if (!currentPage) return;

    try {
      setSubmitting(true);
      setError(null);
      setViolations([]);

      // Get all visible questions on the current page
      const allQuestions = currentPage.groups
        .filter(group => group.isVisible)
        .flatMap(group => group.questions.filter(question => question.isVisible));

      // Filter out MESSAGE type questions from answers since they don't need answers
      const answerData = Object.entries(answers)
        .filter(([questionId, value]) => {
          const question = allQuestions.find(q => q.id === questionId);
          return question && question.type !== 'MESSAGE';
        })
        .map(([questionId, value]) => ({
          questionId,
          ...value
        }));

      const result: SubmitResponse = await api.post(`/api/runtime/${sessionId}/answers`, {
        pageId: currentPage.pageId,
        answers: answerData
      });

      if (result.terminated) {
        setIsTerminated(true);
        setTerminationReason(result.reason || 'Survey terminated');
        return;
      }

      if (result.complete) {
        setIsComplete(true);
        // Redirect to thank you page
        window.location.href = '/thank-you';
        return;
      }

      if (result.next?.pageId) {
        // Add current page to history
        setPageHistory(prev => [...prev, currentPage.pageId]);
        setCurrentPageNumber(prev => prev + 1);
        
        // Clear current answers and load next page
        setAnswers({});
        await loadPage(result.next.pageId);
      }

    } catch (err) {
      console.error('Failed to submit answers:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit answers');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    // For now, we'll implement basic back navigation
    // In a full implementation, this would track page history
    window.history.back();
  };

  const handleTerminate = async () => {
    try {
      await fetch(`${config.api.surveyService}/api/runtime/${sessionId}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'User terminated'
        })
      });
      
      // Redirect to exit page
      window.location.href = '/survey-exit';
    } catch (err) {
      console.error('Failed to terminate session:', err);
    }
  };

  const hasAnswersForCurrentPage = () => {
    if (!currentPage) return false;
    
    // If there are answers provided, allow navigation
    if (Object.keys(answers).length > 0) {
      return true;
    }
    
    // Check if the current page only contains MESSAGE type questions
    const allQuestions = currentPage.groups
      .filter(group => group.isVisible)
      .flatMap(group => group.questions.filter(question => question.isVisible));
    
    // If there are no questions at all, allow navigation
    if (allQuestions.length === 0) {
      return true;
    }
    
    // If all questions are MESSAGE type, allow navigation
    const hasOnlyMessageQuestions = allQuestions.every(question => question.type === 'MESSAGE');
    
    return hasOnlyMessageQuestions;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Survey</h2>
          <p className="text-gray-600">Please wait while we load the next page...</p>
        </div>
      </div>
    );
  }

  if (isTerminated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Survey Complete</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your participation! We have collected all the information we need for this survey.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Your responses are valuable to us and help improve our research. We appreciate the time you've taken to share your thoughts.
          </p>
          {/* <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Return to Home
          </button> */}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Survey Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleTerminate}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Exit Survey
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Survey Progress - Full Width */}
      {/* <SurveyProgress 
        currentPage={currentPage} 
        pageHistory={pageHistory}
        isResumed={isResumed}
        currentPageNumber={currentPageNumber}
        totalPages={totalPages}
      /> */}
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Questions */}
        <div className="space-y-8">
          {currentPage.groups
            .filter(group => group.isVisible) // Only show visible groups
            .map((group) => (
            <div key={group.id}>
              {/* Only show group title/description if they exist and are meaningful */}
              {group.title && !group.title.toLowerCase().includes('block') && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {group.title}
                  </h2>
                  {group.description && (
                    <p className="text-gray-600 text-lg">{group.description}</p>
                  )}
                </div>
              )}
              
              <div className="space-y-8">
                {group.questions
                  .filter(question => question.isVisible) // Only show visible questions
                  .map((question) => (
                  <div key={question.id}>
                    <QuestionRenderer
                      question={question}
                      value={answers[question.id]}
                      onChange={(value) => handleAnswerChange(question.id, value)}
                      violation={violations.find(v => v.questionId === question.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation - Sticky Bottom */}
      <SurveyNavigation
        onSubmit={handleSubmit}
        onPrevious={handlePrevious}
        onTerminate={handleTerminate}
        submitting={submitting}
        hasAnswers={hasAnswersForCurrentPage()}
      />
    </div>
  );
}
