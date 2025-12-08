"use client";

interface SurveyNavigationProps {
  isFirstPage: boolean;
  isLastPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  currentPageIndex: number;
  totalPages: number;
  jumpPending?: any;
}

export default function SurveyNavigation({
  isFirstPage,
  isLastPage,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting,
  currentPageIndex,
  totalPages,
  jumpPending
}: SurveyNavigationProps) {
  return (
    <div 
      className="px-8 py-6 border-t relative"
      style={{ 
        backgroundColor: 'var(--theme-surface)',
        borderTopColor: 'var(--theme-border)'
      }}
    >
      {/* Jump Logic Indicator */}
      {jumpPending && (
        <div className="absolute -top-8 left-0 right-0 bg-blue-50 border-b border-blue-200 px-4 py-2 z-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-blue-800 text-sm font-medium">
              🔀 Jump logic triggered - automatically navigating...
            </span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Previous Button */}
          <div>
            {!isFirstPage && (
              <button
                onClick={onPrevious}
                disabled={jumpPending}
                className="btn-secondary inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--theme-text)',
                  backgroundColor: 'var(--theme-background)',
                  borderColor: 'var(--theme-border)',
                  borderRadius: 'var(--theme-radius-md)',
                  border: '1px solid var(--theme-border)'
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
            )}
          </div>

          {/* Page Info */}
          <div className="text-center">
            <span 
              className="text-sm"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              Page {currentPageIndex + 1} of {totalPages}
            </span>
          </div>

          {/* Next/Submit Button */}
          <div>
            {isLastPage ? (
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="btn-primary inline-flex items-center px-6 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--theme-success)',
                  borderRadius: 'var(--theme-radius-md)'
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Survey
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onNext}
                disabled={jumpPending}
                className="btn-primary inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  borderRadius: 'var(--theme-radius-md)'
                }}
              >
                Next
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p 
            className="text-xs"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            Your responses are automatically saved as you progress through the survey.
          </p>
        </div>
      </div>
    </div>
  );
}
