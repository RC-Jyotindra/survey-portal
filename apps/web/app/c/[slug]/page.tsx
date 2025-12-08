'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { config } from '../../../lib/config';

interface StartSessionResponse {
  sessionId: string;
  firstPageId: string;
  closingSoon: boolean;
}

interface ErrorResponse {
  error: string;
  reason?: string;
  vpnStatus?: {
    blocked: boolean;
    riskScore?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    action?: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
    reasons?: string[];
  };
}

interface SurveySettings {
  surveyId: string;
  title: string;
  description?: string;
  security: {
    passwordProtected: boolean;
    referralWebsite: boolean;
    surveyAccess: string;
  };
  responses: {
    surveyAvailability: string;
    surveyStartDate?: string;
    surveyStartTime?: string;
    surveyEndDate?: string;
    surveyEndTime?: string;
    backButton: boolean;
    allowFinishLater: boolean;
    customErrorMessages: boolean;
    customErrorMessageText?: string;
  };
  ui: {
    progressBar: boolean;
    showQuestionNumbers: boolean;
    showPageNumbers: boolean;
    theme: string;
  };
  postSurvey: {
    redirectUrl?: string;
    thankYouEmail: boolean;
    completionMessage?: string;
    showResults: boolean;
  };
  collector: {
    id: string;
    type: string;
    opensAt?: string;
    closesAt?: string;
  };
}

export default function CollectorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingSoon, setClosingSoon] = useState(false);
  const [surveySettings, setSurveySettings] = useState<SurveySettings | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const slug = params.slug as string;
  const token = searchParams.get('t');

  // First, fetch survey settings
  useEffect(() => {
    const fetchSurveySettings = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔧 [COLLECTOR] Fetching survey settings for slug:', slug);

        const response = await fetch(`${config.api.surveyService}/api/survey-settings/${slug}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [COLLECTOR] Failed to fetch survey settings:', response.status, errorText);
          setError('Survey not found or not available');
          return;
        }

        const settings: SurveySettings = await response.json();
        console.log('✅ [COLLECTOR] Survey settings loaded:', {
          title: settings.title,
          passwordProtected: settings.security.passwordProtected,
          surveyAccess: settings.security.surveyAccess
        });

        setSurveySettings(settings);

        // Check if password protection is required
        if (settings.security.passwordProtected) {
          console.log('🔧 [COLLECTOR] Password protection required');
          setShowPasswordForm(true);
        } else {
          // No password required, start session directly
          await startSession(settings);
        }

      } catch (err) {
        console.error('❌ [COLLECTOR] Error fetching survey settings:', err);
        setError('Failed to load survey. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchSurveySettings();
    }
  }, [slug]);

  // Function to start the session
  const startSession = async (settings?: SurveySettings) => {
    try {
      setLoading(true);
      setError(null);
      setPasswordError(null);

      // Build the start URL
      const startUrl = new URL(`${config.api.surveyService}/api/runtime/start`, window.location.origin);
      startUrl.searchParams.set('slug', slug);
      if (token) {
        startUrl.searchParams.set('t', token);
      }

      console.log('🔧 [COLLECTOR] Starting session with URL:', startUrl.toString());

      const response = await fetch(startUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!response.ok) {
        console.error('❌ [COLLECTOR] Session start failed:', response.status, response.statusText);
        const responseText = await response.text();
        console.error('Response Body:', responseText);
        
        try {
          const errorData: ErrorResponse = JSON.parse(responseText);
          
          // Handle different error types
          if (errorData.reason === 'PASSWORD_REQUIRED' || errorData.reason === 'INVALID_PASSWORD') {
            setPasswordError(errorData.error || 'Invalid password');
            setShowPasswordForm(true);
            return;
          } else if (errorData.reason === 'VPN_BLOCKED' || errorData.reason === 'VPN_CHALLENGE') {
            setError(errorData.error || 'Access denied due to security restrictions');
          } else if (errorData.reason === 'REFERRAL_BLOCKED') {
            setError(errorData.error || 'Access denied: Referral website does not match configured URL');
          } else if (errorData.reason === 'SURVEY_NOT_AVAILABLE') {
            setError(errorData.error || 'Survey is not available at this time');
          } else {
            setError(errorData.error || 'Failed to start survey');
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          setError(`API Error: ${response.status} - ${response.statusText}`);
        }
        return;
      }

      const data: StartSessionResponse = await response.json();
      console.log('✅ [COLLECTOR] Session started successfully:', data.sessionId);
      
      if (data.closingSoon) {
        setClosingSoon(true);
      }

      // Redirect to the survey session
      router.push(`/s/${data.sessionId}`);
      
    } catch (err) {
      console.error('❌ [COLLECTOR] Failed to start session:', err);
      setError('Failed to start survey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }
    
    // For now, we'll pass the password in the URL params
    // In a real implementation, you might want to send it in the request body
    const url = new URL(window.location.href);
    url.searchParams.set('password', password);
    window.history.replaceState({}, '', url.toString());
    
    await startSession(surveySettings || undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Survey</h2>
          <p className="text-gray-600">Please wait while we prepare your survey...</p>
        </div>
      </div>
    );
  }

  // Show password form if required
  if (showPasswordForm && surveySettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Survey Access Required</h2>
            <p className="text-gray-600 mb-2">{surveySettings.title}</p>
            {surveySettings.description && (
              <p className="text-sm text-gray-500">{surveySettings.description}</p>
            )}
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Survey Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
                required
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Access Survey'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    const isVpnError = error.includes('VPN') || error.includes('proxy') || error.includes('Tor') || error.includes('security restrictions');
    const isReferralError = error.includes('Referral website') || error.includes('referral');
    const isPasswordError = error.includes('password') || error.includes('Password');
    const isSurveyUnavailable = error.includes('not available') || error.includes('expired') || error.includes('not yet available');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className={`w-16 h-16 ${
            isVpnError ? 'bg-orange-100' : 
            isReferralError ? 'bg-yellow-100' :
            isPasswordError ? 'bg-red-100' :
            isSurveyUnavailable ? 'bg-gray-100' : 'bg-red-100'
          } rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isVpnError ? (
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : isReferralError ? (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            ) : isPasswordError ? (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : isSurveyUnavailable ? (
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isVpnError ? 'Access Restricted' : 
             isReferralError ? 'Access Denied' :
             isPasswordError ? 'Authentication Required' :
             isSurveyUnavailable ? 'Survey Unavailable' : 'Survey Unavailable'}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          
          {isVpnError && (
            <div className="text-sm text-gray-500 mb-4">
              <p>To participate in this survey, please:</p>
              <ul className="list-disc list-inside mt-2 text-left">
                <li>Disconnect from VPN or proxy services</li>
                <li>Use a regular internet connection</li>
                <li>Try accessing from a different network</li>
              </ul>
            </div>
          )}
          
          {isReferralError && (
            <div className="text-sm text-gray-500 mb-4">
              <p>This survey can only be accessed from specific websites. Please:</p>
              <ul className="list-disc list-inside mt-2 text-left">
                <li>Access the survey from the correct referral website</li>
                <li>Check the survey link you received</li>
                <li>Contact the survey administrator if you believe this is an error</li>
              </ul>
            </div>
          )}
          
          {isPasswordError && (
            <div className="text-sm text-gray-500 mb-4">
              <p>This survey requires a password to access. Please:</p>
              <ul className="list-disc list-inside mt-2 text-left">
                <li>Enter the correct survey password</li>
                <li>Check with the survey administrator for the password</li>
                <li>Make sure you're using the correct survey link</li>
              </ul>
            </div>
          )}
          
          {isSurveyUnavailable && (
            <div className="text-sm text-gray-500 mb-4">
              <p>This survey may be:</p>
              <ul className="list-disc list-inside mt-2 text-left">
                <li>Scheduled for a future date</li>
                <li>Already expired</li>
                <li>Temporarily unavailable</li>
              </ul>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null; // This should not render as we redirect on success
}
