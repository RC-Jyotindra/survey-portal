"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface HeaderProps {
  surveyTitle?: string;
  surveyId?: string;
  showSurveyActions?: boolean;
}

export default function Header({ 
  surveyTitle, 
  surveyId, 
  showSurveyActions = false 
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isSurveyBuilder = pathname.includes('/survey-builder');
  const isDashboard = pathname === '/survey-builder/dashboard';
  const isEdit = pathname.includes('/survey-builder/edit');
  const isPreview = pathname.includes('/survey-builder/preview');

  const handlePublish = async () => {
    if (surveyId) {
      try {
        // Add publish logic here
        console.log('Publishing survey:', surveyId);
        // You can add actual publish API call here
        alert('Survey published successfully!');
      } catch (error) {
        console.error('Error publishing survey:', error);
        alert('Error publishing survey');
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo and Breadcrumb */}
          <div className="flex items-center space-x-3">
            {/* Logo/Icon */}
            <Link href="/survey-builder/dashboard" className="flex items-center">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-gray-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
              </div>
            </Link>

            {/* Breadcrumb Separator */}
            {isSurveyBuilder && (
              <>
                <svg 
                  className="w-4 h-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
                
                {/* Breadcrumb Text */}
                <div className="flex items-center space-x-2">
                  {isDashboard && (
                    <span className="text-gray-600 font-medium">Dashboard</span>
                  )}
                  {isEdit && surveyTitle && (
                    <>
                      <Link 
                        href="/survey-builder/dashboard" 
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <svg 
                        className="w-4 h-4 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                      <span className="text-gray-600 font-medium truncate max-w-xs">
                        {surveyTitle}
                      </span>
                    </>
                  )}
                  {isPreview && surveyTitle && (
                    <>
                      <Link 
                        href="/survey-builder/dashboard" 
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <svg 
                        className="w-4 h-4 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                      <Link 
                        href={`/survey-builder/edit/${surveyId}`} 
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {surveyTitle}
                      </Link>
                      <svg 
                        className="w-4 h-4 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                      <span className="text-gray-600 font-medium">Preview</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-4">
            {showSurveyActions && surveyId && (
              <>
                {/* History/Version Icon */}
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Version History"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                </button>

                {/* Settings Icon */}
                <Link 
                  href={`/survey-builder/edit/${surveyId}/settings`}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Survey Settings"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                    />
                  </svg>
                </Link>

                {/* Customize Link */}
                <Link 
                  href={`/survey-builder/edit/${surveyId}`}
                  className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  Customize
                </Link>

                {/* Preview Link */}
                <Link 
                  href={`/survey-builder/preview/${surveyId}`}
                  className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  Preview
                </Link>

                {/* Publish Button */}
                <button
                  onClick={handlePublish}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Publish
                </button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                ) : (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-3">
              {showSurveyActions && surveyId && (
                <>
                  <Link 
                    href={`/survey-builder/edit/${surveyId}`}
                    className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Customize
                  </Link>
                  <Link 
                    href="/auth/signup"
                    className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                  <Link 
                    href={`/survey-builder/preview/${surveyId}`}
                    className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Preview
                  </Link>
                  <button
                    onClick={() => {
                      handlePublish();
                      setIsMenuOpen(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-left"
                  >
                    Publish
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
