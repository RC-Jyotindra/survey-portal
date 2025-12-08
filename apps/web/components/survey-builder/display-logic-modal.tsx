"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';

interface DisplayLogicModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionWithDetails;
  surveyId: string;
  allQuestions: QuestionWithDetails[];
  onLogicUpdated: (expressionId: string | null) => void;
}

interface Condition {
  id: string;
  questionId: string;
  operator: string;
  value: string | string[];
  logicalOperator?: 'AND' | 'OR';
}

interface Expression {
  id?: string;
  dsl: string;
  description?: string;
}

export default function DisplayLogicModal({
  isOpen,
  onClose,
  question,
  surveyId,
  allQuestions,
  onLogicUpdated
}: DisplayLogicModalProps) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [expression, setExpression] = useState<Expression>({ dsl: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; error?: string } | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // Available operators based on question type
  const getOperators = (questionType: string) => {
    switch (questionType) {
      case 'SINGLE_CHOICE':
      case 'MULTIPLE_CHOICE':
      case 'DROPDOWN':
        return [
          { value: 'equals', label: 'is equal to' },
          { value: 'notEquals', label: 'is not equal to' },
          { value: 'anySelected', label: 'any of the following' },
          { value: 'allSelected', label: 'all of the following' },
          { value: 'noneSelected', label: 'none of the following' }
        ];
      case 'TEXT':
      case 'TEXTAREA':
        return [
          { value: 'equals', label: 'is equal to' },
          { value: 'notEquals', label: 'is not equal to' },
          { value: 'contains', label: 'contains' },
          { value: 'startsWith', label: 'starts with' }
        ];
      case 'NUMBER':
      case 'SLIDER':
        return [
          { value: 'equals', label: 'is equal to' },
          { value: 'notEquals', label: 'is not equal to' },
          { value: 'greaterThan', label: 'is greater than' },
          { value: 'lessThan', label: 'is less than' }
        ];
      default:
        return [
          { value: 'equals', label: 'is equal to' },
          { value: 'notEquals', label: 'is not equal to' }
        ];
    }
  };

  // Get available questions (excluding current question and questions after it)
  const getAvailableQuestions = () => {
    const currentQuestionIndex = allQuestions.findIndex(q => q.id === question.id);
    return allQuestions.slice(0, currentQuestionIndex);
  };

  // Load existing expression and parse it into conditions
  const loadExistingExpression = async () => {
    if (!question.visibleIfExpressionId) return;

    setIsLoadingExisting(true);
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/expressions/${question.visibleIfExpressionId}`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        const existingExpression = result.expression;
        
        setExpression({
          id: existingExpression.id,
          dsl: existingExpression.dsl,
          description: existingExpression.description
        });

        // Parse DSL back into conditions
        const parsedConditions = parseDSLToConditions(existingExpression.dsl);
        setConditions(parsedConditions);
      }
    } catch (error) {
      console.error('Error loading existing expression:', error);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // Parse DSL back into conditions (simplified parser)
  const parseDSLToConditions = (dsl: string): Condition[] => {
    if (!dsl.trim()) return [];

    const conditions: Condition[] = [];
    
    try {
      // Handle simple cases first
      // Pattern: equals(answer('Q1'), 'Yes')
      const equalsMatch = dsl.match(/equals\(answer\('([^']+)'\),\s*'([^']+)'\)/);
      if (equalsMatch) {
        const [, questionVar, value] = equalsMatch;
        if (questionVar && value) {
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'equals',
              value: value
            });
          }
        }
        return conditions;
      }

      // Pattern: notEquals(answer('Q1'), 'No')
      const notEqualsMatch = dsl.match(/notEquals\(answer\('([^']+)'\),\s*'([^']+)'\)/);
      if (notEqualsMatch) {
        const [, questionVar, value] = notEqualsMatch;
        if (questionVar && value) {
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'notEquals',
              value: value
            });
          }
        }
        return conditions;
      }

      // Pattern: greaterThan(answer('Q2'), 18)
      const greaterThanMatch = dsl.match(/greaterThan\(answer\('([^']+)'\),\s*(\d+)\)/);
      if (greaterThanMatch) {
        const [, questionVar, value] = greaterThanMatch;
        if (questionVar && value) {
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'greaterThan',
              value: value
            });
          }
        }
        return conditions;
      }

      // Pattern: lessThan(answer('Q2'), 65)
      const lessThanMatch = dsl.match(/lessThan\(answer\('([^']+)'\),\s*(\d+)\)/);
      if (lessThanMatch) {
        const [, questionVar, value] = lessThanMatch;
        if (questionVar && value) {
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'lessThan',
              value: value
            });
          }
        }
        return conditions;
      }

      // Pattern: contains(answer('Q3'), 'email')
      const containsMatch = dsl.match(/contains\(answer\('([^']+)'\),\s*'([^']+)'\)/);
      if (containsMatch) {
        const [, questionVar, value] = containsMatch;
        if (questionVar && value) {
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'contains',
              value: value
            });
          }
        }
        return conditions;
      }

      // Pattern: startsWith(answer('Q3'), 'Mr.')
      const startsWithMatch = dsl.match(/startsWith\(answer\('([^']+)'\),\s*'([^']+)'\)/);
      if (startsWithMatch) {
        const [, questionVar, value] = startsWithMatch;
        if (questionVar && value) {
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'startsWith',
              value: value
            });
          }
        }
        return conditions;
      }

      // Pattern: anySelected('Q1', ['Apple', 'Banana'])
      const anySelectedMatch = dsl.match(/anySelected\('([^']+)',\s*\[([^\]]+)\]\)/);
      if (anySelectedMatch) {
        const [, questionVar, valuesStr] = anySelectedMatch;
        if (questionVar && valuesStr) {
          const values = valuesStr.split(',').map(v => v.trim().replace(/'/g, ''));
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'anySelected',
              value: values
            });
          }
        }
        return conditions;
      }

      // Pattern: allSelected('Q1', ['Apple', 'Banana'])
      const allSelectedMatch = dsl.match(/allSelected\('([^']+)',\s*\[([^\]]+)\]\)/);
      if (allSelectedMatch) {
        const [, questionVar, valuesStr] = allSelectedMatch;
        if (questionVar && valuesStr) {
          const values = valuesStr.split(',').map(v => v.trim().replace(/'/g, ''));
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'allSelected',
              value: values
            });
          }
        }
        return conditions;
      }

      // Pattern: noneSelected('Q1', ['Apple', 'Banana'])
      const noneSelectedMatch = dsl.match(/noneSelected\('([^']+)',\s*\[([^\]]+)\]\)/);
      if (noneSelectedMatch) {
        const [, questionVar, valuesStr] = noneSelectedMatch;
        if (questionVar && valuesStr) {
          const values = valuesStr.split(',').map(v => v.trim().replace(/'/g, ''));
          const question = allQuestions.find(q => q.variableName === questionVar);
          if (question) {
            conditions.push({
              id: `condition_${Date.now()}`,
              questionId: question.id,
              operator: 'noneSelected',
              value: values
            });
          }
        }
        return conditions;
      }

      // Handle complex expressions with logical operators
      // For now, we'll handle simple AND/OR cases
      if (dsl.includes('&&')) {
        const parts = dsl.split('&&').map(p => p.trim());
        const parsedParts = parts.map(part => parseDSLToConditions(part)).flat();
        parsedParts.forEach((condition, index) => {
          if (index > 0) {
            condition.logicalOperator = 'AND';
          }
        });
        return parsedParts;
      }

      if (dsl.includes('||')) {
        const parts = dsl.split('||').map(p => p.trim());
        const parsedParts = parts.map(part => parseDSLToConditions(part)).flat();
        parsedParts.forEach((condition, index) => {
          if (index > 0) {
            condition.logicalOperator = 'OR';
          }
        });
        return parsedParts;
      }

    } catch (error) {
      console.error('Error parsing DSL:', error);
    }

    return conditions;
  };

  // Add a new condition
  const addCondition = () => {
    const availableQuestions = getAvailableQuestions();
    if (availableQuestions.length === 0) return;

    const newCondition: Condition = {
      id: `condition_${Date.now()}`,
      questionId: availableQuestions[0]?.id || '',
      operator: 'equals',
      value: '',
      logicalOperator: conditions.length > 0 ? 'AND' : undefined
    };

    setConditions([...conditions, newCondition]);
  };

  // Update a condition
  const updateCondition = (conditionId: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(condition => 
      condition.id === conditionId ? { ...condition, ...updates } : condition
    ));
  };

  // Remove a condition
  const removeCondition = (conditionId: string) => {
    const newConditions = conditions.filter(c => c.id !== conditionId);
    if (newConditions.length > 0 && newConditions[0]) {
      newConditions[0].logicalOperator = undefined;
    }
    setConditions(newConditions);
  };

  // Generate DSL from conditions
  const generateDSL = (): string => {
    if (conditions.length === 0) return '';

    const dslParts = conditions.map(condition => {
      const targetQuestion = allQuestions.find(q => q.id === condition.questionId);
      if (!targetQuestion) return '';

      const questionVar = targetQuestion.variableName || `Q${targetQuestion.id.slice(-4)}`;
      
      switch (condition.operator) {
        case 'equals':
          return `equals(answer('${questionVar}'), '${condition.value}')`;
        case 'notEquals':
          return `notEquals(answer('${questionVar}'), '${condition.value}')`;
        case 'greaterThan':
          return `greaterThan(answer('${questionVar}'), ${condition.value})`;
        case 'lessThan':
          return `lessThan(answer('${questionVar}'), ${condition.value})`;
        case 'contains':
          return `contains(answer('${questionVar}'), '${condition.value}')`;
        case 'startsWith':
          return `startsWith(answer('${questionVar}'), '${condition.value}')`;
        case 'anySelected':
          const anyValues = Array.isArray(condition.value) ? condition.value : [condition.value];
          return `anySelected('${questionVar}', [${anyValues.map(v => `'${v}'`).join(', ')}])`;
        case 'allSelected':
          const allValues = Array.isArray(condition.value) ? condition.value : [condition.value];
          return `allSelected('${questionVar}', [${allValues.map(v => `'${v}'`).join(', ')}])`;
        case 'noneSelected':
          const noneValues = Array.isArray(condition.value) ? condition.value : [condition.value];
          return `noneSelected('${questionVar}', [${noneValues.map(v => `'${v}'`).join(', ')}])`;
        default:
          return '';
      }
    });

    // Combine with logical operators
    let result = dslParts[0];
    for (let i = 1; i < dslParts.length; i++) {
      const logicalOp = conditions[i]?.logicalOperator;
      const operator = logicalOp === 'OR' ? '||' : '&&';
      result += ` ${operator} ${dslParts[i]}`;
    }

    return result || '';
  };

  // Validate DSL expression
  const validateExpression = async () => {
    if (!expression.dsl.trim()) {
      setValidationResult({ isValid: false, error: 'Expression cannot be empty' });
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/expressions/validate`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          dsl: expression.dsl,
          testAnswers: testAnswers
        })
      });

      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      setValidationResult({ isValid: false, error: 'Validation failed' });
    } finally {
      setIsValidating(false);
    }
  };

  // Test expression with sample data
  const testExpression = async () => {
    if (!expression.dsl.trim()) return;

    setIsValidating(true);
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/expressions/validate`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          dsl: expression.dsl,
          testAnswers: testAnswers
        })
      });

      const result = await response.json();
      setTestResult(result.result);
    } catch (error) {
      setTestResult(false);
    } finally {
      setIsValidating(false);
    }
  };

  // Save expression
  const saveExpression = async () => {
    if (!expression.dsl.trim()) return;

    setIsLoading(true);
    try {
      let expressionId = expression.id;

      if (expressionId) {
        // Update existing expression
        const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/expressions/${expressionId}`, {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({
            dsl: expression.dsl,
            description: expression.description || `Display logic for ${question.titleTemplate}`
          })
        });

        if (response.ok) {
          const result = await response.json();
          expressionId = result.expression.id;
        }
      } else {
        // Create new expression
        const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/expressions`, {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            dsl: expression.dsl,
            description: expression.description || `Display logic for ${question.titleTemplate}`
          })
        });

        if (response.ok) {
          const result = await response.json();
          expressionId = result.expression.id;
        }
      }

      if (expressionId) {
        // Update question with expression ID
        const updateResponse = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}`, {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({
            visibleIfExpressionId: expressionId
          })
        });

        if (updateResponse.ok) {
          onLogicUpdated(expressionId);
          onClose();
        }
      }
    } catch (error) {
      console.error('Error saving expression:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove expression
  const removeExpression = async () => {
    if (!question.visibleIfExpressionId) return;

    setIsLoading(true);
    try {
      // Remove expression ID from question
      const updateResponse = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({
          visibleIfExpressionId: null
        })
      });

      if (updateResponse.ok) {
        onLogicUpdated(null);
        onClose();
      }
    } catch (error) {
      console.error('Error removing expression:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing expression when modal opens
  useEffect(() => {
    if (isOpen && question.visibleIfExpressionId) {
      loadExistingExpression();
    } else if (isOpen && !question.visibleIfExpressionId) {
      // Reset state when opening modal for new logic
      setConditions([]);
      setExpression({ dsl: '', description: '' });
      setValidationResult(null);
      setTestResult(null);
    }
  }, [isOpen, question.visibleIfExpressionId]);

  // Update DSL when conditions change
  useEffect(() => {
    const dsl = generateDSL();
    setExpression(prev => ({ ...prev, dsl }));
  }, [conditions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Display Logic</h2>
            <p className="text-sm text-gray-600 mt-1">
              Set conditions for when this question should be shown
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoadingExisting ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Loading existing logic...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Question Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-1">Question</h3>
                <p className="text-sm text-blue-800">{question.titleTemplate}</p>
              </div>

            {/* Conditions Builder */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Conditions</h3>
                <button
                  onClick={addCondition}
                  disabled={getAvailableQuestions().length === 0}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Condition
                </button>
              </div>

              {conditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No conditions set. Add a condition to control when this question is shown.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conditions.map((condition, index) => {
                    const targetQuestion = allQuestions.find(q => q.id === condition.questionId);
                    const operators = targetQuestion ? getOperators(targetQuestion.type) : [];

                    return (
                      <div key={condition.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {index > 0 && (
                              <select
                                value={condition.logicalOperator || 'AND'}
                                onChange={(e) => updateCondition(condition.id, { logicalOperator: e.target.value as 'AND' | 'OR' })}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            )}
                            <span className="text-sm font-medium text-gray-700">If</span>
                          </div>
                          <button
                            onClick={() => removeCondition(condition.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Question Selector */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Question</label>
                            <select
                              value={condition.questionId}
                              onChange={(e) => updateCondition(condition.id, { questionId: e.target.value, operator: 'equals', value: '' })}
                              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                            >
                              {getAvailableQuestions().map(q => (
                                <option key={q.id} value={q.id}>
                                  {q.titleTemplate}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Operator Selector */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Operator</label>
                            <select
                              value={condition.operator}
                              onChange={(e) => updateCondition(condition.id, { operator: e.target.value, value: '' })}
                              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                            >
                              {operators.map(op => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Value Input */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                            {targetQuestion && (targetQuestion.type === 'SINGLE_CHOICE' || targetQuestion.type === 'MULTIPLE_CHOICE' || targetQuestion.type === 'DROPDOWN') ? (
                              <select
                                value={Array.isArray(condition.value) ? condition.value[0] : condition.value}
                                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                              >
                                <option value="">Select option</option>
                                {targetQuestion.options?.map(option => (
                                  <option key={option.id} value={option.value}>
                                    {option.labelTemplate}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
                                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                                placeholder="Enter value"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Generated DSL */}
            {expression.dsl && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Expression</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <code className="text-sm text-gray-800">{expression.dsl}</code>
                </div>
              </div>
            )}

            {/* Validation */}
            {expression.dsl && (
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <button
                    onClick={validateExpression}
                    disabled={isValidating}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isValidating ? 'Validating...' : 'Validate'}
                  </button>
                  <button
                    onClick={testExpression}
                    disabled={isValidating}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isValidating ? 'Testing...' : 'Test'}
                  </button>
                </div>

                {validationResult && (
                  <div className={`p-3 rounded-lg ${validationResult.isValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {validationResult.isValid ? '✅ Expression is valid' : `❌ ${validationResult.error}`}
                  </div>
                )}

                {testResult !== null && (
                  <div className={`p-3 rounded-lg ${testResult ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {testResult ? '✅ Test result: TRUE (question will be shown)' : '❌ Test result: FALSE (question will be hidden)'}
                  </div>
                )}
              </div>
            )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {question.visibleIfExpressionId && (
              <button
                onClick={removeExpression}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                Remove Logic
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveExpression}
              disabled={isLoading || !expression.dsl.trim() || (validationResult !== null && validationResult.isValid === false)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Logic'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
