'use client';

interface SurveyNavigationProps {
  onSubmit: () => void;
  onPrevious: () => void;
  onTerminate: () => void;
  submitting: boolean;
  hasAnswers: boolean;
}

export default function SurveyNavigation({ 
  onSubmit, 
  onPrevious, 
  onTerminate, 
  submitting, 
  hasAnswers 
}: SurveyNavigationProps) {
  return (
    <div className="w-full bg-white border-t border-gray-100 sticky bottom-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Left side - Previous and Exit */}
          <div className="flex items-center space-x-6">
            <button
              onClick={onPrevious}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Previous</span>
            </button>
            
            <button
              onClick={onTerminate}
              className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg transition-all duration-200"
            >
              Exit Survey
            </button>
          </div>
          
          {/* Right side - Next button */}
          <div className="flex items-center">
            <button
              onClick={onSubmit}
              disabled={submitting || !hasAnswers}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:transform-none"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span className="font-semibold">Submitting...</span>
                </>
              ) : (
                <>
                  <span className="font-semibold">Continue</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Warning message */}
        {!hasAnswers && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-amber-800 font-medium">
                Please answer the questions before proceeding.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
