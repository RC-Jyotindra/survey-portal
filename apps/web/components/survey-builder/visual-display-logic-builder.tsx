"use client";

import { useState, useEffect, useCallback } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { expressionsAPI, Expression } from '@/lib/api/expressions-api';

interface VisualDisplayLogicBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  option?: any;
  question?: QuestionWithDetails;
  item?: any; // QuestionItem
  scale?: any; // QuestionScale
  surveyId: string;
  allQuestions: QuestionWithDetails[];
  onLogicUpdated?: (expressionId: string | null) => void;
  onSave?: (expressionId: string | null) => void;
  onCancel?: () => void;
  mode?: 'display' | 'termination';
}

interface LogicRule {
  id: string;
  questionId: string;
  operator: 'equals' | 'not_equals' | 'any_selected' | 'all_selected' | 'none_selected';
  values: string[];
}

interface VisualLogic {
  description: string;
  rules: LogicRule[];
  operator: 'AND' | 'OR';
}

export default function VisualDisplayLogicBuilder({
  isOpen,
  onClose,
  option,
  question,
  item,
  scale,
  surveyId,
  allQuestions,
  onLogicUpdated,
  onSave,
  onCancel,
  mode = 'display'
}: VisualDisplayLogicBuilderProps) {
  const [logic, setLogic] = useState<VisualLogic>({
    description: '',
    rules: [],
    operator: 'AND'
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Helper function to parse DSL back into VisualLogic structure
  const parseDSLToVisualLogic = useCallback((dsl: string, description: string | null): VisualLogic => {
    const newLogic: VisualLogic = {
      description: description || '',
      rules: [],
      operator: 'AND',
    };

    if (!dsl || dsl.trim() === '') {
      return newLogic;
    }

    const cleanedDsl = dsl.trim();

    // Handle complex expressions with AND/OR
    if (cleanedDsl.startsWith('(') && cleanedDsl.endsWith(')')) {
      const innerDsl = cleanedDsl.substring(1, cleanedDsl.length - 1);
      
      if (innerDsl.includes(' AND ')) {
        newLogic.operator = 'AND';
        const ruleStrings = innerDsl.split(' AND ');
        ruleStrings.forEach(ruleStr => {
          const rule = parseSingleRule(ruleStr.trim());
          if (rule) newLogic.rules.push(rule);
        });
      } else if (innerDsl.includes(' OR ')) {
        newLogic.operator = 'OR';
        const ruleStrings = innerDsl.split(' OR ');
        ruleStrings.forEach(ruleStr => {
          const rule = parseSingleRule(ruleStr.trim());
          if (rule) newLogic.rules.push(rule);
        });
      } else {
        // Single rule wrapped in parentheses
        const rule = parseSingleRule(innerDsl);
        if (rule) newLogic.rules.push(rule);
      }
    } else {
      // Single rule not wrapped
      const rule = parseSingleRule(cleanedDsl);
      if (rule) {
        newLogic.rules.push(rule);
      }
    }

    return newLogic;
  }, []);

  // Helper function to parse a single DSL rule
  const parseSingleRule = (ruleStr: string): LogicRule | null => {
    if (!ruleStr) return null;

    const rule: LogicRule = {
      id: `rule_${Date.now()}_${Math.random()}`,
      questionId: '',
      operator: 'equals',
      values: [],
    };

    // Parse different DSL patterns
    const equalsMatch = ruleStr.match(/equals\(answer\('([^']+)'\), '([^']+)'\)/);
    const notEqualsMatch = ruleStr.match(/not\(equals\(answer\('([^']+)'\), '([^']+)'\)\)/);
    const anySelectedMatch = ruleStr.match(/anySelected\('([^']+)', \[(.*?)\]\)/);
    const allSelectedMatch = ruleStr.match(/allSelected\('([^']+)', \[(.*?)\]\)/);
    const noneSelectedMatch = ruleStr.match(/noneSelected\('([^']+)', \[(.*?)\]\)/);

    if (equalsMatch && equalsMatch[1] && equalsMatch[2]) {
      const variableName = equalsMatch[1];
      const foundQuestion = findQuestionByVariableName(variableName);
      rule.questionId = foundQuestion ? foundQuestion.id : variableName; // Fallback to variable name if not found
      rule.operator = 'equals';
      rule.values = [equalsMatch[2]];
    } else if (notEqualsMatch && notEqualsMatch[1] && notEqualsMatch[2]) {
      const variableName = notEqualsMatch[1];
      const foundQuestion = findQuestionByVariableName(variableName);
      rule.questionId = foundQuestion ? foundQuestion.id : variableName; // Fallback to variable name if not found
      rule.operator = 'not_equals';
      rule.values = [notEqualsMatch[2]];
    } else if (anySelectedMatch && anySelectedMatch[1] && anySelectedMatch[2]) {
      const variableName = anySelectedMatch[1];
      const foundQuestion = findQuestionByVariableName(variableName);
      rule.questionId = foundQuestion ? foundQuestion.id : variableName; // Fallback to variable name if not found
      rule.operator = 'any_selected';
      rule.values = anySelectedMatch[2]
        .split(',')
        .map(v => v.trim().replace(/^'|'$/g, ''));
    } else if (allSelectedMatch && allSelectedMatch[1] && allSelectedMatch[2]) {
      const variableName = allSelectedMatch[1];
      const foundQuestion = findQuestionByVariableName(variableName);
      rule.questionId = foundQuestion ? foundQuestion.id : variableName; // Fallback to variable name if not found
      rule.operator = 'all_selected';
      rule.values = allSelectedMatch[2]
        .split(',')
        .map(v => v.trim().replace(/^'|'$/g, ''));
    } else if (noneSelectedMatch && noneSelectedMatch[1] && noneSelectedMatch[2]) {
      const variableName = noneSelectedMatch[1];
      const foundQuestion = findQuestionByVariableName(variableName);
      rule.questionId = foundQuestion ? foundQuestion.id : variableName; // Fallback to variable name if not found
      rule.operator = 'none_selected';
      rule.values = noneSelectedMatch[2]
        .split(',')
        .map(v => v.trim().replace(/^'|'$/g, ''));
    } else {
      console.warn('Could not parse DSL rule:', ruleStr);
      return null;
    }

    return rule;
  };

  // Get questions that are available for display logic
  const currentQuestion = mode === 'termination' 
    ? question 
    : allQuestions.find(q => q.id === option?.questionId || q.id === item?.questionId || q.id === scale?.questionId);
  
  // Get questions referenced in existing logic (for editing existing expressions)
  const referencedQuestionIds = logic.rules.map(rule => rule.questionId).filter(Boolean);
  
  // Helper function to find a question by variable name or index
  const findQuestionByVariableName = (variableName: string) => {
    // First try to find by exact variableName match
    let found = allQuestions.find(q => q.variableName === variableName);
    
    // If not found, try to find by index (e.g., Q20 -> index 20)
    if (!found && variableName.startsWith('Q')) {
      const index = parseInt(variableName.substring(1));
      if (!isNaN(index)) {
        found = allQuestions.find(q => q.index === index);
      }
    }
    
    // If still not found, try to find by title containing the variable name
    if (!found) {
      found = allQuestions.find(q => 
        q.titleTemplate?.toLowerCase().includes(variableName.toLowerCase()) ||
        q.variableName?.toLowerCase().includes(variableName.toLowerCase())
      );
    }
    
    return found;
  };
  
  const availableQuestions = allQuestions
    .filter(q => {
      if (mode === 'termination') {
        // For termination mode, only include the current question
        // because termination logic is based on the current question's own answer
        return q.id === currentQuestion?.id;
      } else {
        // For display mode, show ALL questions from ANY page
        // Option/Item/Scale display logic can reference any question in the survey
        // Only exclude the current question itself to avoid circular references
        if (q.id === option?.questionId || q.id === item?.questionId || q.id === scale?.questionId) {
          return false; // Don't show the current question
        }
        
        // Include questions that are referenced in existing logic (for editing)
        // Check if this question matches any of the referenced question IDs
        if (referencedQuestionIds.some(refId => {
          const foundQuestion = findQuestionByVariableName(refId);
          return foundQuestion && foundQuestion.id === q.id;
        })) {
          return true;
        }
        
        // Show all other questions
        return true;
      }
    })
    .filter(q => ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'].includes(q.type))
    .sort((a, b) => a.index - b.index); // Sort by index for consistent ordering

  // Debug logging for available questions
  console.log('Current question:', currentQuestion);
  console.log('Available questions:', availableQuestions.map(q => ({ id: q.id, variableName: q.variableName, title: q.titleTemplate })));
  console.log('All questions:', allQuestions.map(q => ({ id: q.id, variableName: q.variableName, title: q.titleTemplate, pageId: q.pageId, index: q.index })));

  useEffect(() => {
    if (!isOpen) {
      // Reset logic when modal closes
      setLogic({
        description: '',
        rules: [],
        operator: 'AND'
      });
      setPreview('');
      setLoadingExisting(false);
      return;
    }

    // Load existing expression if option/question/item/scale has one
    const expressionId = mode === 'termination' 
      ? (question as any)?.terminateIfExpressionId 
      : option?.visibleIfExpressionId || item?.visibleIfExpressionId || scale?.visibleIfExpressionId;
    if (expressionId) {
      setLoadingExisting(true);
      expressionsAPI.getExpression(surveyId, expressionId)
        .then(({ expression }) => {
          const parsedLogic = parseDSLToVisualLogic(expression.dsl, expression.description || null);
          setLogic(parsedLogic);
        })
        .catch(error => {
          console.error('Error loading existing expression:', error);
          // Fallback to empty logic if loading fails
          setLogic({
            description: '',
            rules: [],
            operator: 'AND'
          });
        })
        .finally(() => {
          setLoadingExisting(false);
        });
    } else {
      // No existing expression, start with empty logic
      setLogic({
        description: '',
        rules: [],
        operator: 'AND'
      });
    }
  }, [isOpen, mode, option?.visibleIfExpressionId, item?.visibleIfExpressionId, scale?.visibleIfExpressionId, (question as any)?.terminateIfExpressionId, surveyId, parseDSLToVisualLogic]);

  useEffect(() => {
    // Generate preview text
    if (logic.rules.length === 0) {
      const targetName = option?.labelTemplate || item?.label || scale?.label || 'element';
      setPreview(`This ${option ? 'option' : item ? 'item' : scale ? 'scale' : 'element'} will always be visible`);
      return;
    }

    const ruleTexts = logic.rules.map(rule => {
      const question = availableQuestions.find(q => q.id === rule.questionId);
      if (!question) return '';

      const questionTitle = question.titleTemplate || `Question ${question.index}`;
      const selectedOptions = rule.values.map(value => {
        const option = question.options.find(opt => opt.value === value);
        return option?.labelTemplate || value;
      }).join(', ');

      switch (rule.operator) {
        case 'equals':
          return `respondent answers "${selectedOptions}" to "${questionTitle}"`;
        case 'not_equals':
          return `respondent does NOT answer "${selectedOptions}" to "${questionTitle}"`;
        case 'any_selected':
          return `respondent selects any of: ${selectedOptions} in "${questionTitle}"`;
        case 'all_selected':
          return `respondent selects all of: ${selectedOptions} in "${questionTitle}"`;
        case 'none_selected':
          return `respondent selects none of: ${selectedOptions} in "${questionTitle}"`;
        default:
          return '';
      }
    });

    const previewText = ruleTexts.length > 0 
      ? mode === 'termination'
        ? `Terminate survey when ${ruleTexts.join(` ${logic.operator.toLowerCase()} `)}`
        : `Show "${option?.labelTemplate || 'this option'}" when ${ruleTexts.join(` ${logic.operator.toLowerCase()} `)}`
      : mode === 'termination' 
        ? 'Survey will not be terminated'
        : 'This option will always be visible';

    setPreview(previewText);
  }, [logic, availableQuestions]);

  const addRule = () => {
    const newRule: LogicRule = {
      id: `rule_${Date.now()}`,
      questionId: availableQuestions[0]?.id || '',
      operator: 'equals',
      values: []
    };
    setLogic(prev => ({
      ...prev,
      rules: [...prev.rules, newRule]
    }));
  };

  const updateRule = (ruleId: string, updates: Partial<LogicRule>) => {
    setLogic(prev => ({
      ...prev,
      rules: prev.rules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  };

  const removeRule = (ruleId: string) => {
    setLogic(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
  };

  const getQuestionOptions = (questionId: string) => {
    const question = availableQuestions.find(q => q.id === questionId);
    return question?.options || [];
  };

  const toggleValue = (ruleId: string, value: string) => {
    const rule = logic.rules.find(r => r.id === ruleId);
    if (!rule) return;

    const newValues = rule.values.includes(value)
      ? rule.values.filter(v => v !== value)
      : [...rule.values, value];

    updateRule(ruleId, { values: newValues });
  };

  const convertToDSL = (): string => {
    if (logic.rules.length === 0) return '';

    const ruleExpressions = logic.rules.map(rule => {
      const question = availableQuestions.find(q => q.id === rule.questionId);
      if (!question || rule.values.length === 0) return '';

      const questionVariable = question.variableName || `Q${question.index}`;

      switch (rule.operator) {
        case 'equals':
          if (rule.values.length === 1) {
            return `equals(answer('${questionVariable}'), '${rule.values[0]}')`;
          } else {
            return `anySelected('${questionVariable}', [${rule.values.map(v => `'${v}'`).join(', ')}])`;
          }
        case 'not_equals':
          return `not(equals(answer('${questionVariable}'), '${rule.values[0]}'))`;
        case 'any_selected':
          return `anySelected('${questionVariable}', [${rule.values.map(v => `'${v}'`).join(', ')}])`;
        case 'all_selected':
          return `allSelected('${questionVariable}', [${rule.values.map(v => `'${v}'`).join(', ')}])`;
        case 'none_selected':
          return `not(anySelected('${questionVariable}', [${rule.values.map(v => `'${v}'`).join(', ')}]))`;
        default:
          return '';
      }
    }).filter(expr => expr !== '');

    if (ruleExpressions.length === 0) return '';
    if (ruleExpressions.length === 1) return ruleExpressions[0] || '';

    return `(${ruleExpressions.join(` ${logic.operator.toLowerCase()} `)})`;
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const dslExpression = convertToDSL();
      
      if (!dslExpression || dslExpression.trim() === '') {
        // Remove logic
        if (onLogicUpdated) {
          await onLogicUpdated(null);
        }
        if (onSave) {
          onSave(null);
        }
        onClose();
        return;
      }

      // Create a real Expression record in the database
      const description = mode === 'termination' 
        ? logic.description || `Termination logic for ${question?.titleTemplate}`
        : logic.description || `Display logic for ${option?.labelTemplate || item?.label || scale?.label}`;
        
      const { expression } = await expressionsAPI.createExpression(surveyId, {
        dsl: dslExpression,
        description
      });
      
      // Update with the real expression ID
      if (onLogicUpdated) {
        await onLogicUpdated(expression.id);
      }
      if (onSave) {
        onSave(expression.id);
      }
      onClose();
    } catch (error) {
      console.error('Error saving display logic:', error);
      alert('Failed to save display logic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Option Display Logic</h2>
            <p className="text-sm text-gray-600 mt-1">
              Set conditions for when this option should be visible
            </p>
            <p className="text-sm font-medium text-blue-600 mt-1">
              Option: {option?.labelTemplate}
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

        <div className="p-6 space-y-6">
          {/* Loading indicator for existing expressions */}
          {loadingExisting && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-blue-600">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading existing logic...</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={logic.description}
              onChange={(e) => setLogic(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Show for Hong Kong and Taiwan users"
              disabled={loadingExisting}
            />
          </div>

          {/* Logic Rules */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Display Conditions</h3>
              <button
                onClick={addRule}
                disabled={loadingExisting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Condition
              </button>
            </div>

            {logic.rules.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No conditions set</h3>
                <p className="mt-1 text-sm text-gray-500">This option will always be visible</p>
                <div className="mt-4">
                  <button
                    onClick={addRule}
                    disabled={loadingExisting}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add First Condition
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {logic.rules.map((rule, index) => (
                  <div key={rule.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Condition {index + 1}</h4>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Question Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          If this question
                        </label>
                        <select
                          value={rule.questionId}
                          onChange={(e) => updateRule(rule.id, { questionId: e.target.value, values: [] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">Select a question</option>
                          {availableQuestions.map(question => (
                            <option key={question.id} value={question.id}>
                              {question.variableName || `Q${question.index}`}: {question.titleTemplate?.substring(0, 50)}...
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operator Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Has answer
                        </label>
                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(rule.id, { operator: e.target.value as any, values: [] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="equals">equals</option>
                          <option value="not_equals">does not equal</option>
                          <option value="any_selected">includes any of</option>
                          <option value="all_selected">includes all of</option>
                          <option value="none_selected">includes none of</option>
                        </select>
                      </div>

                      {/* Values Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          These options
                        </label>
                        <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
                          {getQuestionOptions(rule.questionId).map(option => (
                            <label key={option.id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={rule.values.includes(option.value)}
                                onChange={() => toggleValue(rule.id, option.value)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-gray-700">{option.labelTemplate}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Logic Operator */}
                {logic.rules.length > 1 && (
                  <div className="flex items-center justify-center">
                    <select
                      value={logic.operator}
                      onChange={(e) => setLogic(prev => ({ ...prev, operator: e.target.value as 'AND' | 'OR' }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="AND">AND (all conditions must be true)</option>
                      <option value="OR">OR (any condition can be true)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Preview</h4>
            <p className="text-sm text-blue-800">{preview}</p>
            {logic.description && (
              <p className="text-xs text-blue-600 mt-2 italic">"{logic.description}"</p>
            )}
          </div>

          {/* Available Questions (for debugging) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Available Questions (Debug)</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Current Question:</strong> {currentQuestion?.variableName || `Q${currentQuestion?.index}`} - {currentQuestion?.titleTemplate}</p>
                <p><strong>Current Page:</strong> {currentQuestion?.pageId}</p>
                <p><strong>Available for Logic:</strong></p>
                <ul className="ml-4 space-y-1">
                  {availableQuestions.map(q => (
                    <li key={q.id}>• {q.variableName || `Q${q.index}`} - {q.titleTemplate} (Page: {q.pageId})</li>
                  ))}
                </ul>
              </div>
              <div className="mt-2">
                <h5 className="text-xs font-medium text-gray-700">Generated DSL:</h5>
                <code className="text-xs text-gray-600 font-mono">{convertToDSL() || 'No conditions'}</code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : mode === 'termination' ? 'Save Termination Logic' : 'Save Display Logic'}
          </button>
        </div>
      </div>
    </div>
  );
}
