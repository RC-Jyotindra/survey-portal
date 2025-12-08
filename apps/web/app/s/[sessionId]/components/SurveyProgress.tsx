'use client';

import { ResolvedPage } from './types';

interface SurveyProgressProps {
  currentPage: ResolvedPage;
  pageHistory?: string[];
  totalPages?: number;
  isResumed?: boolean;
  currentPageNumber?: number;
}

export default function SurveyProgress({ 
  currentPage, 
  pageHistory = [], 
  totalPages, 
  isResumed = false,
  currentPageNumber = 1
}: SurveyProgressProps) {
  // Calculate progress more accurately
  // Progress should be based on completed pages, not current page
  const completedPages = pageHistory.length;
  
  // If we have total pages, use that; otherwise estimate conservatively
  let estimatedTotal = totalPages;
  if (!estimatedTotal) {
    // Estimate based on completed pages + current page + buffer for remaining pages
    estimatedTotal = Math.max(completedPages + 2, 5); // At least 2 more pages expected
  }
  
  // Progress should be completed pages / total pages, not current page / total pages
  const progressPercentage = Math.round((completedPages / estimatedTotal) * 100);
  
  // Debug logging
  console.log('Progress Debug:', {
    completedPages,
    currentPageNumber,
    totalPages,
    estimatedTotal,
    progressPercentage,
    pageHistory: pageHistory.length
  });
  
  return (
    <div className="w-full bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${Math.max(progressPercentage, 5)}%` }}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>
          
          {/* Progress percentage */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs font-medium text-gray-500">
              {isResumed ? 'Resuming...' : 'Progress'}
            </span>
            <span className="text-xs font-semibold text-gray-700">
              {completedPages} of {estimatedTotal} pages • {progressPercentage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
