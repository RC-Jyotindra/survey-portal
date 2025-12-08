'use client';

import { useState, useEffect } from 'react';
import { api, apiRequest } from '@/lib/api-client';
import MatrixAnswerDisplay from './MatrixAnswerDisplay';

const isMatrixLikeQuestion = (questionType: string) =>
  questionType?.includes('MATRIX') || questionType === 'LIKERT_SCALE';

interface IndividualResponse {
  sessionId: string;
  status: string;
  startedAt: string;
  finalizedAt: string | null;
  duration: number;
  device: string;
  answers: Array<{
    questionId: string;
    questionText: string;
    questionType: string;
    pageTitle: string;
    pageOrder: number;
    answer: string;
    rawData: any;
    choices: string[];
    textValue: string | null;
    numericValue: number | null;
    booleanValue: boolean | null;
    jsonValue: any;
    createdAt: string;
    questionItems?: Array<{ id: string; label: string }>;
    questionScales?: Array<{ id: string; label: string; value?: string | number | null }>;
  }>;
  answersCount: number;
}

interface SurveyAnalytics {
  overview: {
    totalSessions: number;
    completedSessions: number;
    terminatedSessions: number;
    inProgressSessions: number;
    completionRate: number;
    averageCompletionTime: number;
    responseRate: number;
  };
  quotaStatus: Array<{
    planId: string;
    planName: string;
    bucketId: string;
    bucketLabel: string;
    targetN: number;
    filledN: number;
    reservedN: number;
    maxOverfill: number;
    totalUsed: number;
    maxCapacity: number;
    percentage: number;
    isFull: boolean;
    isNearFull: boolean;
  }>;
  sessionAnalytics: Array<{
    date: string;
    sessions: number;
    completed: number;
    terminated: number;
  }>;
  answerAnalytics: Array<{
    questionId: string;
    questionText: string;
    questionType: string;
    totalAnswers: number;
    items?: Array<{ id: string; label: string }>;
    scales?: Array<{ id: string; label: string }>;
    answerDistribution: Array<{
      value: string;
      count: number;
      percentage: number;
    }>;
  }>;
  dropOffPoints: Array<{
    pageId: string;
    pageTitle: string;
    sessionsReached: number;
    sessionsDropped: number;
    dropOffRate: number;
  }>;
  deviceAnalytics: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };
  timeAnalytics: {
    hourlyDistribution: Array<{
      hour: number;
      sessions: number;
    }>;
    averageSessionDuration: number;
    medianSessionDuration: number;
  };
  individualResponses: IndividualResponse[];
}

interface AnalyticsDashboardProps {
  surveyId: string;
  collectorId: string;
}

export default function AnalyticsDashboard({ surveyId, collectorId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quota' | 'responses' | 'sessions' | 'answers' | 'individual'>('overview');
  const [selectedResponse, setSelectedResponse] = useState<IndividualResponse | null>(null);
  const [responseFilter, setResponseFilter] = useState<'all' | 'completed' | 'terminated' | 'in_progress'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportingSummary, setExportingSummary] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingIndividualPdf, setExportingIndividualPdf] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [surveyId, collectorId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const data: SurveyAnalytics = await api.get(`/api/authoring/collectors/${collectorId}/analytics`);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  const exportResponses = async () => {
    try {
      setExporting(true);
      const response = await apiRequest(`/api/authoring/collectors/${collectorId}/responses/export`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `collector-${collectorId}-responses-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export responses:', err);
      setError(err instanceof Error ? err.message : 'Failed to export responses');
    } finally {
      setExporting(false);
    }
  };

  const exportSummary = async () => {
    try {
      setExportingSummary(true);
      const response = await apiRequest(`/api/authoring/collectors/${collectorId}/summary/export`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `collector-${collectorId}-summary-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to export summary');
    } finally {
      setExportingSummary(false);
    }
  };

  const exportSummaryPdf = async () => {
    try {
      setExportingPdf(true);
      const response = await apiRequest(`/api/authoring/collectors/${collectorId}/summary/export-pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `collector-${collectorId}-summary-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export summary PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to export summary PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportIndividualResponsesPdf = async () => {
    try {
      setExportingIndividualPdf(true);
      const response = await apiRequest(`/api/authoring/collectors/${collectorId}/responses/export-pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `collector-${collectorId}-individual-responses-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export individual responses PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to export individual responses PDF');
    } finally {
      setExportingIndividualPdf(false);
    }
  };

  // Filter and search responses
  const filteredResponses = analytics?.individualResponses.filter(response => {
    // Status filter - compare both in lowercase
    if (responseFilter !== 'all' && response.status.toLowerCase() !== responseFilter.toLowerCase()) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        response.sessionId.toLowerCase().includes(searchLower) ||
        response.answers.some(answer => 
          answer.questionText.toLowerCase().includes(searchLower) ||
          answer.answer.toLowerCase().includes(searchLower) ||
          answer.pageTitle.toLowerCase().includes(searchLower)
        )
      );
    }
    
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'quota', label: 'Quota Status', icon: '🎯' },
            { id: 'responses', label: 'Response Analytics', icon: '📈' },
            { id: 'sessions', label: 'Session Analytics', icon: '⏱️' },
            { id: 'answers', label: 'Answer Details', icon: '📝' },
            { id: 'individual', label: 'Individual Responses', icon: '👥' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Responses</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.overview.totalSessions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.overview.completedSessions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatPercentage(analytics.overview.completionRate)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Terminated</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.overview.terminatedSessions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Duration</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatDuration(analytics.overview.averageCompletionTime)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Session Analytics Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Timeline</h3>
            <div className="h-64 flex items-end space-x-2">
              {analytics.sessionAnalytics.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gray-200 rounded-t">
                    <div 
                      className="bg-blue-500 rounded-t"
                      style={{ height: `${(day.sessions / Math.max(...analytics.sessionAnalytics.map(d => d.sessions))) * 200}px` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{day.date}</div>
                  <div className="text-xs font-medium text-gray-900">{day.sessions}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Distribution</h3>
              <div className="space-y-3">
                {Object.entries(analytics.deviceAnalytics).map(([device, count]) => (
                  <div key={device} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 capitalize">{device}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / analytics.overview.totalSessions) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Drop-off Points</h3>
              <div className="space-y-3">
                {analytics.dropOffPoints.slice(0, 5).map((point, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 truncate">{point.pageTitle}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${point.dropOffRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12">{formatPercentage(point.dropOffRate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quota Status Tab */}
      {activeTab === 'quota' && (
        <div className="space-y-6">
          {analytics.quotaStatus.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No quota plans configured for this survey</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.quotaStatus.map((quota, index) => (
                <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{quota.planName}</h3>
                      <p className="text-sm text-gray-600">{quota.bucketLabel}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      quota.isFull 
                        ? 'bg-red-100 text-red-800' 
                        : quota.isNearFull 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {quota.isFull ? 'Full' : quota.isNearFull ? 'Near Full' : 'Available'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Target</p>
                      <p className="text-lg font-semibold text-gray-900">{quota.targetN}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Filled</p>
                      <p className="text-lg font-semibold text-green-600">{quota.filledN}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reserved</p>
                      <p className="text-lg font-semibold text-yellow-600">{quota.reservedN}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Max Capacity</p>
                      <p className="text-lg font-semibold text-gray-900">{quota.maxCapacity}</p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        quota.percentage >= 100 
                          ? 'bg-red-500' 
                          : quota.percentage >= 90 
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(quota.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{formatPercentage(quota.percentage)} filled</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Response Analytics Tab */}
      {activeTab === 'responses' && (
        <div className="space-y-6">
          {analytics.answerAnalytics.map((question, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{question.questionText}</h3>
                <p className="text-sm text-gray-600">{question.questionType} • {question.totalAnswers} responses</p>
              </div>
              
              <div className="space-y-3">
                {question.answerDistribution.map((answer, answerIndex) => (
                  <div key={answerIndex}>
                    {/* Special handling for matrix questions */}
                    {isMatrixLikeQuestion(question.questionType) ? (
                      <MatrixAnswerDisplay
                        answerValue={answer.value}
                        questionType={question.questionType}
                        totalAnswers={answer.count}
                        questionData={{
                          items: question.items,
                          scales: question.scales
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 flex-1 truncate">{answer.value}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${answer.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12">{answer.count}</span>
                          <span className="text-sm text-gray-500 w-12">{formatPercentage(answer.percentage)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Analytics Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Duration</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Duration</span>
                  <span className="text-sm font-medium text-gray-900">{formatDuration(analytics.timeAnalytics.averageSessionDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Median Duration</span>
                  <span className="text-sm font-medium text-gray-900">{formatDuration(analytics.timeAnalytics.medianSessionDuration)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Distribution</h3>
              <div className="h-32 flex items-end space-x-1">
                {analytics.timeAnalytics.hourlyDistribution.map((hour, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(hour.sessions / Math.max(...analytics.timeAnalytics.hourlyDistribution.map(h => h.sessions))) * 100}px` }}
                    ></div>
                    <div className="text-xs text-gray-500 mt-1">{hour.hour}:00</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Answer Details Tab */}
      {activeTab === 'answers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Answer Data</h3>
              <p className="text-sm text-gray-600">Export this data for further analysis</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={exportResponses}
                  disabled={exporting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export All Responses (CSV)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={exportSummary}
                  disabled={exportingSummary}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {exportingSummary ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Export Summary (CSV)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={exportSummaryPdf}
                  disabled={exportingPdf}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {exportingPdf ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Export Summary (PDF)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={exportResponses}
                  disabled={exporting}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export Session Data (CSV)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Responses Tab */}
      {activeTab === 'individual' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Individual Response Analytics</h3>
              <p className="text-sm text-gray-600">View and analyze individual survey responses</p>
            </div>
            <div className="p-6">
              {/* Export Buttons */}
              <div className="mb-6 flex justify-end gap-3">
                <button
                  onClick={exportResponses}
                  disabled={exporting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export All Responses (CSV)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={exportIndividualResponsesPdf}
                  disabled={exportingIndividualPdf}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {exportingIndividualPdf ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export Individual Responses (PDF)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Filters and Search */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                      Search Responses
                    </label>
                    <input
                      type="text"
                      id="search"
                      placeholder="Search by session ID, question, answer, or page..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <div className="sm:w-48">
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Status
                    </label>
                    <select
                      id="status-filter"
                      value={responseFilter}
                      onChange={(e) => setResponseFilter(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Responses</option>
                      <option value="completed">Completed</option>
                      <option value="terminated">Terminated</option>
                      <option value="in_progress">In Progress</option>
                    </select>
                  </div>
                </div>
                
                {/* Results Summary */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Showing {filteredResponses.length} of {analytics?.individualResponses.length || 0} responses
                  </span>
                  {(responseFilter !== 'all' || searchTerm) && (
                    <button
                      onClick={() => {
                        setResponseFilter('all');
                        setSearchTerm('');
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {analytics?.individualResponses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No individual responses available</p>
                </div>
              ) : filteredResponses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No responses match your filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredResponses.map((response) => (
                    <div key={response.sessionId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">Session {response.sessionId.slice(0, 8)}</h4>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  response.status === 'COMPLETED' 
                                    ? 'bg-green-100 text-green-800'
                                    : response.status === 'TERMINATED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {response.status.toLowerCase()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(response.startedAt).toLocaleDateString()}, {new Date(response.startedAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Duration</div>
                            <div className="font-medium">{response.duration}m</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Device</div>
                            <div className="font-medium capitalize">{response.device}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Answers</div>
                            <div className="font-medium">{response.answersCount}</div>
                          </div>
                          <button
                            onClick={() => setSelectedResponse(response)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                      
                      {/* Quick Answer Preview */}
                      <div className="mt-3">
                        <div className="text-sm text-gray-600 mb-2">Quick Answers Preview:</div>
                        <div className="flex flex-wrap gap-2">
                          {response.answers.slice(0, 3).map((answer, index) => (
                            <div key={index} className="bg-white px-3 py-1 rounded-full border border-gray-200">
                              <span className="text-xs text-gray-600">{answer.pageTitle}:</span>
                              <span className="text-xs font-medium text-gray-900 ml-1">
                                {answer.questionType === 'CONTACT_FORM' && answer.jsonValue ? (
                                  <span className="text-blue-600">Contact Form Data</span>
                                ) : isMatrixLikeQuestion(answer.questionType) && answer.jsonValue ? (
                                  <span className="text-purple-600">Matrix Response</span>
                                ) : answer.jsonValue ? (
                                  <span className="text-green-600">JSON Data</span>
                                ) : (
                                  answer.answer || 'No answer'
                                )}
                              </span>
                            </div>
                          ))}
                          {response.answers.length > 3 && (
                            <div className="bg-gray-200 px-3 py-1 rounded-full">
                              <span className="text-xs text-gray-600">+{response.answers.length - 3} more</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Response Details Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Response Details</h3>
              <button
                onClick={() => setSelectedResponse(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Session Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Session ID</div>
                    <div className="font-medium">{selectedResponse.sessionId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <div className={`font-medium ${
                      selectedResponse.status === 'COMPLETED' 
                        ? 'text-green-600'
                        : selectedResponse.status === 'TERMINATED'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {selectedResponse.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Duration</div>
                    <div className="font-medium">{selectedResponse.duration}m</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Device</div>
                    <div className="font-medium capitalize">{selectedResponse.device}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Started</div>
                    <div className="font-medium">{new Date(selectedResponse.startedAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Ended</div>
                    <div className="font-medium">
                      {selectedResponse.finalizedAt 
                        ? new Date(selectedResponse.finalizedAt).toLocaleString()
                        : 'Not completed'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Answers */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Answers ({selectedResponse.answers.length})</h4>
                <div className="space-y-4">
                  {selectedResponse.answers.map((answer, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{answer.questionText}</h5>
                          <p className="text-sm text-gray-600">{answer.pageTitle}</p>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {answer.questionType}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm text-gray-600">Answer:</div>
                        <div className="font-medium text-gray-900 mt-1">
                          {answer.questionType === 'CONTACT_FORM' && answer.jsonValue ? (
                            <div className="bg-gray-50 p-3 rounded border">
                              <pre className="text-sm whitespace-pre-wrap">
                                {JSON.stringify(answer.jsonValue, null, 2)}
                              </pre>
                            </div>
                          ) : isMatrixLikeQuestion(answer.questionType) && answer.jsonValue ? (
                            <div className="space-y-2">
                              <MatrixAnswerDisplay
                                answerValue={JSON.stringify(answer.jsonValue)}
                                questionType={answer.questionType}
                                totalAnswers={1}
                                questionData={{
                                  items: answer.questionItems,
                                  scales: answer.questionScales
                                }}
                              />
                            </div>
                          ) : answer.jsonValue ? (
                            <div className="bg-gray-50 p-3 rounded border">
                              <pre className="text-sm whitespace-pre-wrap">
                                {JSON.stringify(answer.jsonValue, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <span className={answer.answer ? '' : 'text-gray-400 italic'}>
                              {answer.answer || 'No answer provided'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

