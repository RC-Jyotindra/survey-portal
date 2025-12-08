"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';

interface QuestionQuotaAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionWithDetails;
  surveyId: string;
  onQuotaAssigned: (question: QuestionWithDetails) => void;
}

interface QuotaAssignment {
  optionId: string;
  optionLabel: string;
  targetN: number;
  maxOverfill: number;
}

interface SurveyTarget {
  totalN: number;
  softCloseN: number;
  hardClose: boolean;
}

export default function QuestionQuotaAssignmentModal({
  isOpen,
  onClose,
  question,
  surveyId,
  onQuotaAssigned
}: QuestionQuotaAssignmentModalProps) {
  const [assignments, setAssignments] = useState<QuotaAssignment[]>([]);
  const [surveyTarget, setSurveyTarget] = useState<SurveyTarget | null>(null);
  const [existingQuotas, setExistingQuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize assignments from question options
  useEffect(() => {
    if (question && question.options) {
      const initialAssignments = question.options.map(option => ({
        optionId: option.id,
        optionLabel: option.labelTemplate,
        targetN: 0,
        maxOverfill: 0
      }));
      setAssignments(initialAssignments);
    }
  }, [question]);

  // Load survey target and existing quotas for validation
  useEffect(() => {
    if (isOpen) {
      loadSurveyTarget();
      loadExistingQuotas();
    }
  }, [isOpen, surveyId, question.id]);

  const loadSurveyTarget = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/target`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSurveyTarget(data.target);
      }
    } catch (error) {
      console.error('Error loading survey target:', error);
    }
  };

  const loadExistingQuotas = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        // Filter quotas that are related to this question
        const questionRelatedQuotas = data.quotaPlans?.filter((plan: any) => 
          plan.buckets?.some((bucket: any) => bucket.questionId === question.id)
        ) || [];
        
        // Flatten all buckets for this question
        const allBuckets = questionRelatedQuotas.flatMap((plan: any) => 
          plan.buckets?.filter((bucket: any) => bucket.questionId === question.id) || []
        );
        
        setExistingQuotas(allBuckets);
      }
    } catch (error) {
      console.error('Error loading existing quotas:', error);
    }
  };

  const handleAssignmentChange = (optionId: string, field: 'targetN' | 'maxOverfill', value: number) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.optionId === optionId 
        ? { ...assignment, [field]: value }
        : assignment
    ));
  };

  const getTotalAssignedQuota = () => {
    return assignments.reduce((total, assignment) => total + assignment.targetN, 0);
  };

  const getRemainingQuota = () => {
    if (!surveyTarget) return 0;
    return surveyTarget.totalN - getTotalAssignedQuota();
  };

  const validateAssignments = () => {
    if (!surveyTarget) {
      setError('Survey target not found. Please set a survey target first.');
      return false;
    }

    // Check if quotas already exist for this question
    if (existingQuotas.length > 0) {
      setError('Quotas have already been assigned to this question. Please edit existing quotas instead of creating new ones.');
      return false;
    }

    const totalAssigned = getTotalAssignedQuota();
    if (totalAssigned > surveyTarget.totalN) {
      setError(`Total assigned quota (${totalAssigned}) cannot exceed survey target (${surveyTarget.totalN})`);
      return false;
    }

    // Check for negative values
    for (const assignment of assignments) {
      if (assignment.targetN < 0 || assignment.maxOverfill < 0) {
        setError('Quota values cannot be negative');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateAssignments()) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Create quota plan for this question
      const quotaPlanData = {
        name: `Quota for ${question.titleTemplate}`,
        strategy: 'MANUAL',
        totalN: getTotalAssignedQuota(),
        state: 'OPEN'
      };

      // Create the quota plan
      const planResponse = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(quotaPlanData)
      });

      if (!planResponse.ok) {
        const errorData = await planResponse.json();
        throw new Error(errorData.error || 'Failed to create quota plan');
      }

      const planData = await planResponse.json();
      const quotaPlanId = planData.quotaPlan.id;

      // Create quota buckets for each option
      console.log('Creating buckets for assignments:', assignments);
      for (const assignment of assignments) {
        if (assignment.targetN > 0) {
          console.log('Creating bucket for assignment:', assignment);
          const bucketPayload = {
            planId: quotaPlanId,
            label: assignment.optionLabel,
            targetN: assignment.targetN,
            maxOverfill: assignment.maxOverfill,
            questionId: question.id,
            optionValue: assignment.optionLabel
          };

          const bucketResponse = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/quotas/${quotaPlanId}/buckets`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify(bucketPayload)
          });

          if (!bucketResponse.ok) {
            const errorData = await bucketResponse.json();
            console.error('Bucket creation failed:', errorData);
            throw new Error(errorData.error || 'Failed to create quota bucket');
          }
          
          const bucketResponseData = await bucketResponse.json();
          console.log('Bucket created successfully:', bucketResponseData);
        }
      }

      setSuccess('Quota assignments saved successfully!');
      
      // Update the question with quota assignments
      const updatedQuestion = {
        ...question,
        quotaAssignments: assignments.filter(a => a.targetN > 0)
      };
      onQuotaAssigned(updatedQuestion);

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to save quota assignments');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assign Quota to Question</h2>
            <p className="text-sm text-gray-500 mt-1">{question.titleTemplate}</p>
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
        <div className="p-6">
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

          {/* Existing Quotas Warning */}
          {existingQuotas.length > 0 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-900 mb-2">Existing Quotas</h3>
              <p className="text-sm text-yellow-700 mb-3">
                This question already has quotas assigned. You cannot create new quotas for the same question.
              </p>
              <div className="space-y-1">
                {existingQuotas.map((quota: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-yellow-800">{quota.label}:</span>
                    <span className="font-medium text-yellow-900">{quota.targetN} target</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Survey Target Info */}
          {surveyTarget && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Survey Target</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-blue-600 font-medium">{surveyTarget.totalN}</div>
                  <div className="text-blue-500">Total Target</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">{getTotalAssignedQuota()}</div>
                  <div className="text-blue-500">Assigned</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">{getRemainingQuota()}</div>
                  <div className="text-blue-500">Remaining</div>
                </div>
              </div>
            </div>
          )}

          {/* Quota Assignments */}
          {existingQuotas.length === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Quota Assignments</h3>
              
              {assignments.map((assignment) => (
                <div key={assignment.optionId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">{assignment.optionLabel}</h4>
                    <div className="text-xs text-gray-500">Option</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Target N</label>
                      <input
                        type="number"
                        min="0"
                        max={surveyTarget?.totalN || undefined}
                        value={assignment.targetN || ''}
                        onChange={(e) => handleAssignmentChange(assignment.optionId, 'targetN', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Overfill</label>
                      <input
                        type="number"
                        min="0"
                        value={assignment.maxOverfill || ''}
                        onChange={(e) => handleAssignmentChange(assignment.optionId, 'maxOverfill', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Validation Warning */}
          {surveyTarget && getTotalAssignedQuota() > surveyTarget.totalN && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Total assigned quota exceeds survey target
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || existingQuotas.length > 0 || (surveyTarget ? getTotalAssignedQuota() > surveyTarget.totalN : false)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : existingQuotas.length > 0 ? 'Quotas Already Exist' : 'Save Quota Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}
