'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SurveyRuntime from './components/SurveyRuntime';
import { config } from '@/lib/config';

interface SessionStatus {
  sessionId: string;
  status: string;
  startedAt: string;
  finalizedAt?: string;
  collector: {
    name: string;
    type: string;
  };
}

export default function SurveySessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionStatus = async () => {
      try {
        const response = await fetch(`${config.api.surveyService}/api/runtime/${sessionId}/status`, {
          headers: {
            'ngrok-skip-browser-warning': 'true', // Skip ngrok warning page
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load session');
          return;
        }

        const data: SessionStatus = await response.json();
        setSessionStatus(data);
        
        if (data.status === 'COMPLETED') {
          // Redirect to thank you page
          window.location.href = '/thank-you';
          return;
        }
        
        if (data.status === 'TERMINATED') {
          setError('Thank you for your participation! We have collected all the information we need for this survey.');
          return;
        }
        
      } catch (err) {
        console.error('Failed to fetch session status:', err);
        setError('Failed to load survey session');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionStatus();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Survey</h2>
          <p className="text-gray-600">Please wait while we load your survey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Survey Done</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          {/* <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button> */}
        </div>
      </div>
    );
  }

  if (!sessionStatus) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SurveyRuntime sessionId={sessionId} />
    </div>
  );
}
