"use client";

import { Survey } from '@/lib/api/survey-api';

interface SurveyHeaderProps {
  survey: Survey;
}

export default function SurveyHeader({ survey }: SurveyHeaderProps) {
  return (
    <div 
      className="text-white p-8"
      style={{
        background: `linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)`
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h1 
          className="text-3xl font-bold mb-4"
          style={{
            fontFamily: 'var(--theme-heading-font)',
            fontSize: 'var(--theme-font-size-3xl)',
            color: 'white'
          }}
        >
          {survey.title}
        </h1>
        {survey.description && (
          <p 
            className="text-lg leading-relaxed"
            style={{ color: 'rgba(255, 255, 255, 0.9)' }}
          >
            {survey.description}
          </p>
        )}
        
        {/* Survey Info */}
        <div 
          className="mt-6 flex flex-wrap gap-4 text-sm"
          style={{ color: 'rgba(255, 255, 255, 0.9)' }}
        >
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span>Estimated time: 5-10 minutes</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>All responses are anonymous</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            {/* <span>{survey._count.questions} questions</span> */}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4">
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: survey.status === 'PUBLISHED' 
                ? 'var(--theme-success)' 
                : survey.status === 'DRAFT'
                ? 'var(--theme-warning)'
                : 'var(--theme-text-secondary)',
              color: 'white',
              borderRadius: 'var(--theme-radius-lg)'
            }}
          >
            {survey.status === 'PUBLISHED' && '🟢 Published'}
            {survey.status === 'DRAFT' && '🟡 Draft'}
            {survey.status === 'CLOSED' && '🔴 Closed'}
            {survey.status === 'ARCHIVED' && '⚫ Archived'}
          </span>
        </div>
      </div>
    </div>
  );
}
