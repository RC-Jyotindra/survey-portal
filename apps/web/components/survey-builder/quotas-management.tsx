"use client";

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';
interface QuotaPlan {
  id: string;
  name: string;
  strategy: 'MANUAL' | 'EQUAL' | 'RANDOM';
  state: 'OPEN' | 'CLOSED';
  totalN: number;
  buckets: QuotaBucket[];
}

interface QuotaBucket {
  id: string;
  label: string;
  targetN: number;
  filledN: number;
  reservedN: number;
  maxOverfill: number;
  questionId?: string;
  optionValue?: string;
  bucketId?: string;
  available?: number;
  isFull?: boolean;
}

interface QuotaStats {
  planId: string;
  name: string;
  strategy: string;
  state: string;
  totalN: number;
  buckets: Array<{
    bucketId: string;
    label: string;
    targetN: number;
    filledN: number;
    reservedN: number;
    maxOverfill: number;
    available: number;
    isFull: boolean;
    questionId?: string;
    optionValue?: string;
  }>;
}

interface QuotasManagementProps {
  surveyId: string;
  onClose: () => void;
}

export default function QuotasManagement({ surveyId, onClose }: QuotasManagementProps) {
  const [quotaPlans, setQuotaPlans] = useState<QuotaPlan[]>([]);
  const [quotaStats, setQuotaStats] = useState<QuotaStats[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showGeneratePlan, setShowGeneratePlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<QuotaPlan | null>(null);

  // Load quota plans and stats
  useEffect(() => {
    loadQuotaPlans();
    loadQuotaStats();
    loadQuestions();
  }, [surveyId]);

  const loadQuotaPlans = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setQuotaPlans(data.quotaPlans || []);
      }
    } catch (error) {
      console.error('Error loading quota plans:', error);
    }
  };

  const loadQuotaStats = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas/stats`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setQuotaStats(data.stats || []);
      } else if (response.status === 404) {
        // No quota plans exist yet, this is normal
        setQuotaStats([]);
      } else {
        // Handle other errors gracefully
        console.warn('Could not load quota stats:', response.status);
        setQuotaStats([]);
      }
    } catch (error) {
      console.error('Error loading quota stats:', error);
      // Don't show error for missing quota plans
      setQuotaStats([]);
    }
  };

  const loadQuestions = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const getQuestionDetails = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    return question ? {
      title: question.titleTemplate,
      type: question.type,
      options: question.options || []
    } : null;
  };

  const handleCreatePlan = async (planData: any) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create quota plan');
      }

      setSuccess('Quota plan created successfully!');
      setShowCreatePlan(false);
      await loadQuotaPlans();
      await loadQuotaStats();
    } catch (err: any) {
      setError(err.message || 'Failed to create quota plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async (planData: any) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas/generate`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate quota plan');
      }

      setSuccess('Quota plan generated successfully!');
      setShowGeneratePlan(false);
      await loadQuotaPlans();
      await loadQuotaStats();
    } catch (err: any) {
      setError(err.message || 'Failed to generate quota plan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this quota plan? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas/${planId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete quota plan');
      }

      setSuccess('Quota plan deleted successfully!');
      await loadQuotaPlans();
      await loadQuotaStats();
    } catch (err: any) {
      setError(err.message || 'Failed to delete quota plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quota Management</h2>
            <p className="text-sm text-gray-500">Manage sample quotas and targets</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 mb-6">
            <button
              onClick={() => setShowCreatePlan(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Quota Plan
            </button>
            <button
              onClick={() => setShowGeneratePlan(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Generate from Question
            </button>
          </div>

          {/* Quota Plans Table */}
          {quotaPlans.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quota plans yet</h3>
              <p className="text-gray-500 mb-4">Create your first quota plan to manage sample distribution</p>
              <button
                onClick={() => setShowCreatePlan(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Quota Plan
              </button>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quota Plans & Buckets</h3>
                <p className="text-sm text-gray-500 mt-1">Manage your survey quotas and track progress</p>
              </div>

              {/* Table Content */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quota Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Question & Option
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotaPlans.map((plan) => {
                      const stats = quotaStats.find(s => s.planId === plan.id);
                      const buckets = stats?.buckets || plan.buckets || [];
                      
                      if (buckets.length === 0) {
                        // Show plan without buckets
                        return (
                          <tr key={plan.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                                <div className="text-sm text-gray-500">
                                  {plan.strategy} • {plan.state} • Total: {plan.totalN}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              No buckets assigned
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                plan.state === 'OPEN' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {plan.state}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setSelectedPlan(plan)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // Show each bucket as a separate row
                      return buckets.map((bucket, bucketIndex) => (
                        <tr key={`${plan.id}-${bucket.bucketId || bucketIndex}`} className="hover:bg-gray-50">
                          {bucketIndex === 0 && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap" rowSpan={buckets.length}>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {plan.strategy} • {plan.state}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    Total: {plan.totalN}
                                  </div>
                                </div>
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{bucket.label}</div>
                              <div className="text-xs text-gray-500">
                                {bucket.questionId ? (() => {
                                  const questionDetails = getQuestionDetails(bucket.questionId);
                                  if (questionDetails) {
                                    return (
                                      <div>
                                        <div className="font-medium text-gray-700">
                                          {questionDetails.title.length > 50 
                                            ? `${questionDetails.title.slice(0, 50)}...` 
                                            : questionDetails.title}
                                        </div>
                                        <div className="text-gray-500">
                                          {questionDetails.type} • Option: {bucket.optionValue}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return `Question ID: ${bucket.questionId.slice(0, 8)}... • Option: ${bucket.optionValue}`;
                                })() : 'Manual bucket'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{bucket.targetN}</div>
                            {bucket.maxOverfill > 0 && (
                              <div className="text-xs text-gray-500">+{bucket.maxOverfill} overfill</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 mr-3">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>{bucket.filledN || 0} filled</span>
                                  <span>{bucket.reservedN || 0} reserved</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      bucket.isFull ? 'bg-red-500' : 
                                      (bucket.filledN + bucket.reservedN) > bucket.targetN * 0.8 ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}
                                    style={{ 
                                      width: `${Math.min(((bucket.filledN + bucket.reservedN) / (bucket.targetN + bucket.maxOverfill)) * 100, 100)}%` 
                                    }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {bucket.available || (bucket.targetN - (bucket.filledN || 0) - (bucket.reservedN || 0))} available
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {bucket.isFull ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Full
                              </span>
                            ) : (bucket.filledN + bucket.reservedN) > bucket.targetN * 0.8 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Near Full
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Open
                              </span>
                            )}
                          </td>
                          {bucketIndex === 0 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" rowSpan={buckets.length}>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setSelectedPlan(plan)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Plan Modal */}
      {showCreatePlan && (
        <CreateQuotaPlanModal
          onClose={() => setShowCreatePlan(false)}
          onSubmit={handleCreatePlan}
          loading={loading}
        />
      )}

      {/* Generate Plan Modal */}
      {showGeneratePlan && (
        <GenerateQuotaPlanModal
          surveyId={surveyId}
          onClose={() => setShowGeneratePlan(false)}
          onSubmit={handleGeneratePlan}
          loading={loading}
        />
      )}
    </div>
  );
}

// Create Quota Plan Modal Component
function CreateQuotaPlanModal({ onClose, onSubmit, loading }: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    strategy: 'MANUAL' as 'MANUAL' | 'EQUAL' | 'RANDOM',
    totalN: 0,
    state: 'OPEN' as 'OPEN' | 'CLOSED'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Quota Plan</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Gender, Age Group"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strategy
              </label>
              <select
                value={formData.strategy}
                onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="MANUAL">Manual</option>
                <option value="EQUAL">Equal Distribution</option>
                <option value="RANDOM">Random Distribution</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Target
              </label>
              <input
                type="number"
                min="1"
                value={formData.totalN || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, totalN: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Generate Quota Plan Modal Component
function GenerateQuotaPlanModal({ surveyId, onClose, onSubmit, loading }: {
  surveyId: string;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    strategy: 'EQUAL' as 'EQUAL' | 'RANDOM',
    totalN: 0,
    questionId: ''
  });

  useEffect(() => {
    loadQuestions();
  }, [surveyId]);

  const loadQuestions = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        // Filter questions that have options (for quota generation)
        const questionsWithOptions = data.questions.filter((q: any) => 
          ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'].includes(q.type) && 
          q.options && q.options.length > 0
        );
        setQuestions(questionsWithOptions);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      source: {
        type: 'QUESTION_OPTIONS',
        questionId: formData.questionId
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Quota Plan</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Gender, Age Group"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Question
              </label>
              <select
                value={formData.questionId}
                onChange={(e) => setFormData(prev => ({ ...prev, questionId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a question</option>
                {questions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.titleTemplate} ({question.options.length} options)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strategy
              </label>
              <select
                value={formData.strategy}
                onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EQUAL">Equal Distribution</option>
                <option value="RANDOM">Random Distribution</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Target
              </label>
              <input
                type="number"
                min="1"
                value={formData.totalN || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, totalN: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
