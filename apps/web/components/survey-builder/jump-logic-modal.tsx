'use client';

import React, { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { PageWithQuestions } from '@/lib/api/pages-api';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';

interface JumpLogicModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionWithDetails;
  allQuestions: QuestionWithDetails[];
  allPages: PageWithQuestions[];
  surveyId: string;
  onJumpLogicUpdated: () => void;
}

interface JumpCondition {
  id: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'startsWith' | 'anySelected' | 'allSelected' | 'noneSelected';
  value: string | string[];
  logicalOperator?: 'AND' | 'OR';
}

interface JumpDestination {
  type: 'question' | 'page';
  id: string;
  name: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  testResult?: boolean;
}

const JumpLogicModal: React.FC<JumpLogicModalProps> = ({
  isOpen,
  onClose,
  question,
  allQuestions,
  allPages,
  surveyId,
  onJumpLogicUpdated
}) => {
  const [conditions, setConditions] = useState<JumpCondition[]>([]);
  const [destination, setDestination] = useState<JumpDestination | null>(null);
  const [priority, setPriority] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [existingJumpId, setExistingJumpId] = useState<string | null>(null);

  // Load existing jump logic when modal opens
  useEffect(() => {
    if (isOpen && question) {
      loadExistingJumpLogic();
    }
  }, [isOpen, question]);

  const loadExistingJumpLogic = async () => {
    try {
      setIsLoading(true);
      
      // Check if question has existing jump logic
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/question-jumps?fromQuestionId=${question.id}`, {
        headers: getApiHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        const existingJump = data.questionJumps?.find((jump: any) => 
          jump.fromQuestionId === question.id
        );
        
        if (existingJump) {
          setExistingJumpId(existingJump.id);
          setPriority(existingJump.priority || 0);
          
          // Set destination
          if (existingJump.toQuestionId) {
            const destQuestion = allQuestions.find(q => q.id === existingJump.toQuestionId);
            if (destQuestion) {
              setDestination({
                type: 'question',
                id: existingJump.toQuestionId,
                name: destQuestion.titleTemplate || `Q${destQuestion.variableName || destQuestion.id.slice(-4)}`
              });
            }
          } else if (existingJump.toPageId) {
            const destPage = allPages.find(p => p.id === existingJump.toPageId);
            if (destPage) {
              setDestination({
                type: 'page',
                id: existingJump.toPageId,
                name: destPage.titleTemplate || `Page ${destPage.index + 1}`
              });
            }
          }
          
          // Parse existing condition if available
          if (existingJump.condition?.dsl) {
            const parsedConditions = parseDSLToConditions(existingJump.condition.dsl);
            setConditions(parsedConditions);
          }
        } else {
          // Reset form for new jump logic
          setExistingJumpId(null);
          setConditions([]);
          setDestination(null);
          setPriority(0);
        }
      }
    } catch (error) {
      console.error('Error loading existing jump logic:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseDSLToConditions = (dsl: string): JumpCondition[] => {
    if (!dsl.trim()) return [];
    const conditions: JumpCondition[] = [];
    
    try {
      // Parse different DSL patterns
      const equalsMatch = dsl.match(/equals\(answer\('([^']+)'\),\s*'([^']+)'\)/);
      if (equalsMatch) {
        const [, questionVar, value] = equalsMatch;
        if (questionVar && value) {
          // Check if this matches the current question's variable
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'equals',
              value: value
            });
          }
        }
        return conditions;
      }

      const notEqualsMatch = dsl.match(/notEquals\(answer\('([^']+)'\),\s*'([^']+)'\)/);
      if (notEqualsMatch) {
        const [, questionVar, value] = notEqualsMatch;
        if (questionVar && value) {
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'notEquals',
              value: value
            });
          }
        }
        return conditions;
      }

      const greaterThanMatch = dsl.match(/greaterThan\(answer\('([^']+)'\),\s*(\d+)\)/);
      if (greaterThanMatch) {
        const [, questionVar, value] = greaterThanMatch;
        if (questionVar && value) {
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'greaterThan',
              value: value
            });
          }
        }
        return conditions;
      }

      const lessThanMatch = dsl.match(/lessThan\(answer\('([^']+)'\),\s*(\d+)\)/);
      if (lessThanMatch) {
        const [, questionVar, value] = lessThanMatch;
        if (questionVar && value) {
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'lessThan',
              value: value
            });
          }
        }
        return conditions;
      }

      const containsMatch = dsl.match(/contains\(answer\('([^']+)'\),\s*'([^']+)'\)/);
      if (containsMatch) {
        const [, questionVar, value] = containsMatch;
        if (questionVar && value) {
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'contains',
              value: value
            });
          }
        }
        return conditions;
      }

      const startsWithMatch = dsl.match(/startsWith\(answer\('([^']+)'\),\s*'([^']+)'\)/);
      if (startsWithMatch) {
        const [, questionVar, value] = startsWithMatch;
        if (questionVar && value) {
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'startsWith',
              value: value
            });
          }
        }
        return conditions;
      }

      const anySelectedMatch = dsl.match(/anySelected\('([^']+)',\s*\[([^\]]+)\]/);
      if (anySelectedMatch) {
        const [, questionVar, valuesStr] = anySelectedMatch;
        if (questionVar && valuesStr) {
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            const values = valuesStr.split(',').map(v => v.trim().replace(/['"]/g, ''));
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'anySelected',
              value: values
            });
          }
        }
        return conditions;
      }

      const allSelectedMatch = dsl.match(/allSelected\('([^']+)',\s*\[([^\]]+)\]/);
      if (allSelectedMatch) {
        const [, questionVar, valuesStr] = allSelectedMatch;
        if (questionVar && valuesStr) {
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            const values = valuesStr.split(',').map(v => v.trim().replace(/['"]/g, ''));
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'allSelected',
              value: values
            });
          }
        }
        return conditions;
      }

      const noneSelectedMatch = dsl.match(/noneSelected\('([^']+)',\s*\[([^\]]+)\]/);
      if (noneSelectedMatch) {
        const [, questionVar, valuesStr] = noneSelectedMatch;
        if (questionVar && valuesStr) {
          const currentQuestionVar = question.variableName || `Q${question.id.slice(-4)}`;
          if (questionVar === currentQuestionVar) {
            const values = valuesStr.split(',').map(v => v.trim().replace(/['"]/g, ''));
            conditions.push({
              id: `condition_${Date.now()}`,
              operator: 'noneSelected',
              value: values
            });
          }
        }
        return conditions;
      }
    } catch (error) {
      console.error('Error parsing DSL:', error);
    }
    
    return conditions;
  };

  const addCondition = () => {
    const newCondition: JumpCondition = {
      id: `condition_${Date.now()}`,
      operator: 'equals',
      value: '',
      logicalOperator: conditions.length > 0 ? 'AND' : undefined
    };
    setConditions([...conditions, newCondition]);
  };

  const updateCondition = (index: number, updates: Partial<JumpCondition>) => {
    const newConditions = [...conditions];
    if (newConditions[index]) {
      newConditions[index] = { ...newConditions[index], ...updates };
      setConditions(newConditions);
    }
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    if (newConditions.length > 0 && newConditions[0]) {
      newConditions[0].logicalOperator = undefined;
    }
    setConditions(newConditions);
  };

  const getCurrentQuestionOptions = () => {
    return question?.options || [];
  };

  const renderValueInput = (condition: JumpCondition, index: number) => {
    const options = getCurrentQuestionOptions();
    const isMultiSelect = ['anySelected', 'allSelected', 'noneSelected'].includes(condition.operator);
    
    if (options.length > 0 && !isMultiSelect) {
      // Render dropdown for single value selection
      return (
        <select
          value={Array.isArray(condition.value) ? condition.value[0] : condition.value}
          onChange={(e) => updateCondition(index, { value: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select Value</option>
          {options.map((option) => (
            <option key={option.id} value={option.value}>
              {option.labelTemplate}
            </option>
          ))}
        </select>
      );
    } else if (options.length > 0 && isMultiSelect) {
      // Render multi-select for array values
      return (
        <div className="space-y-2">
          <div className="text-xs text-gray-600">Select multiple options:</div>
          <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
            {options.map((option) => {
              const isSelected = Array.isArray(condition.value) && condition.value.includes(option.value);
              return (
                <label key={option.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const currentValues = Array.isArray(condition.value) ? condition.value : [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter(v => v !== option.value);
                      updateCondition(index, { value: newValues });
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>{option.labelTemplate}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    } else {
      // Render text input for questions without options
      return (
        <input
          type="text"
          value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
          onChange={(e) => {
            if (isMultiSelect) {
              updateCondition(index, { value: e.target.value.split(',').map(v => v.trim()) });
            } else {
              updateCondition(index, { value: e.target.value });
            }
          }}
          placeholder={isMultiSelect ? "Option1, Option2, Option3" : "Value"}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      );
    }
  };

  const generateDSL = (): string => {
    if (conditions.length === 0) return '';
    
    const questionVar = question.variableName || `Q${question.id.slice(-4)}`;
    
    const dslParts = conditions.map(condition => {
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
    }).filter(part => part !== '');
    
    // Combine with logical operators
    let result = dslParts[0] || '';
    for (let i = 1; i < dslParts.length; i++) {
      const logicalOp = conditions[i]?.logicalOperator === 'OR' ? ' || ' : ' && ';
      result += logicalOp + dslParts[i];
    }
    
    return result;
  };

  const validateExpression = async () => {
    const dsl = generateDSL();
    if (!dsl) {
      setValidationResult({ isValid: false, error: 'No conditions defined' });
      return;
    }

    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/expressions/validate`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ dsl })
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult({
          isValid: data.isValid,
          error: data.error
        });
      } else {
        setValidationResult({ isValid: false, error: 'Validation failed' });
      }
    } catch (error) {
      setValidationResult({ isValid: false, error: 'Network error' });
    }
  };

  const testExpression = async () => {
    const dsl = generateDSL();
    if (!dsl) return;

    // Create sample test data
    const testAnswers: Record<string, any> = {};
    const questionVar = question.variableName || `Q${question.id.slice(-4)}`;
    conditions.forEach(condition => {
      if (question.type === 'MULTIPLE_CHOICE' && Array.isArray(condition.value)) {
        testAnswers[questionVar] = condition.value;
      } else {
        testAnswers[questionVar] = condition.value;
      }
    });

    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/expressions/validate`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ dsl, testAnswers })
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult({
          isValid: data.isValid,
          error: data.error,
          testResult: data.result
        });
      }
    } catch (error) {
      console.error('Error testing expression:', error);
    }
  };

  const saveJumpLogic = async () => {
    if (!destination) {
      alert('Please select a destination');
      return;
    }

    setIsLoading(true);
    try {
      let expressionId: string | null = null;

      // Create expression if conditions exist
      if (conditions.length > 0) {
        const dsl = generateDSL();
        const expressionResponse = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/expressions`, {
          method: 'POST',
        headers: getApiHeaders(),
          body: JSON.stringify({
            dsl,
            description: `Jump logic for ${question.titleTemplate || 'question'}`
          })
        });

        if (expressionResponse.ok) {
          const expressionData = await expressionResponse.json();
          expressionId = expressionData.expression.id;
        }
      }

      // Create or update question jump
      const jumpData = {
        fromQuestionId: question.id,
        ...(destination.type === 'question' ? { toQuestionId: destination.id } : { toPageId: destination.id }),
        ...(expressionId ? { conditionExpressionId: expressionId } : {}),
        priority
      };

      if (existingJumpId) {
        // Update existing jump
        const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/question-jumps/${existingJumpId}`, {
          method: 'PUT',
        headers: getApiHeaders(),
          body: JSON.stringify(jumpData)
        });

        if (response.ok) {
          onJumpLogicUpdated();
          onClose();
        } else {
          const errorData = await response.json();
          alert(`Error updating jump logic: ${errorData.error}`);
        }
      } else {
        // Create new jump
        const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/question-jumps`, {
          method: 'POST',
        headers: getApiHeaders(),
          body: JSON.stringify(jumpData)
        });

        if (response.ok) {
          onJumpLogicUpdated();
          onClose();
        } else {
          const errorData = await response.json();
          alert(`Error creating jump logic: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving jump logic:', error);
      alert('Error saving jump logic');
    } finally {
      setIsLoading(false);
    }
  };

  const removeJumpLogic = async () => {
    if (!existingJumpId) return;

    if (!confirm('Are you sure you want to remove the jump logic?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/question-jumps/${existingJumpId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (response.ok) {
        onJumpLogicUpdated();
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Error removing jump logic: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error removing jump logic:', error);
      alert('Error removing jump logic');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Jump Logic - {question.titleTemplate || 'Question'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-blue-800">Loading...</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Jump Conditions */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Jump Conditions</h3>
              <p className="text-sm text-gray-600 mb-2">
                Define when this question should jump to another question or page.
              </p>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <strong>How it works:</strong> Define conditions based on <strong>this question's answer</strong> ({question.variableName || `Q${question.id.slice(-4)}`}). 
                    When someone answers this question, the survey will jump to your chosen destination if the conditions are met.
                  </div>
                </div>
              </div>

              {conditions.map((condition, index) => (
                <div key={condition.id} className="mb-4 p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {index > 0 && (
                      <select
                        value={condition.logicalOperator || 'AND'}
                        onChange={(e) => updateCondition(index, { logicalOperator: e.target.value as 'AND' | 'OR' })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}

                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm flex-1">
                      <span className="text-gray-700">
                        {question.variableName || `Q${question.id.slice(-4)}`} - {question.titleTemplate}
                      </span>
                    </div>

                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="equals">Equals</option>
                      <option value="notEquals">Not Equals</option>
                      <option value="greaterThan">Greater Than</option>
                      <option value="lessThan">Less Than</option>
                      <option value="contains">Contains</option>
                      <option value="startsWith">Starts With</option>
                      <option value="anySelected">Any Selected</option>
                      <option value="allSelected">All Selected</option>
                      <option value="noneSelected">None Selected</option>
                    </select>

                    <div className="flex-1">
                      {renderValueInput(condition, index)}
                    </div>

                    <button
                      onClick={() => removeCondition(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addCondition}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                + Add Condition
              </button>
            </div>

            {/* Jump Destination */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Jump Destination</h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose where to jump when the conditions are met.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination Type
                  </label>
                  <select
                    value={destination?.type || ''}
                    onChange={(e) => {
                      const type = e.target.value as 'question' | 'page';
                      setDestination(type ? { type, id: '', name: '' } : null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Type</option>
                    <option value="question">Question</option>
                    <option value="page">Page</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <select
                    value={destination?.id || ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (destination?.type === 'question') {
                        const question = allQuestions.find(q => q.id === id);
                        if (question) {
                          setDestination({
                            type: 'question',
                            id,
                            name: question.titleTemplate || `Q${question.variableName || question.id.slice(-4)}`
                          });
                        }
                      } else if (destination?.type === 'page') {
                        const page = allPages.find(p => p.id === id);
                        if (page) {
                          setDestination({
                            type: 'page',
                            id,
                            name: page.titleTemplate || `Page ${page.index + 1}`
                          });
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={!destination?.type}
                  >
                    <option value="">Select Destination</option>
                    {destination?.type === 'question' && allQuestions
                      .filter(q => q.id !== question.id)
                      .map(q => (
                        <option key={q.id} value={q.id}>
                          {q.variableName || `Q${q.id.slice(-4)}`} - {q.titleTemplate}
                        </option>
                      ))}
                    {destination?.type === 'page' && allPages
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          Page {p.index + 1} - {p.titleTemplate || `Page ${p.index + 1}`}
                        </option>
                      ))}
                    {destination?.type === 'question' && allQuestions.filter(q => q.id !== question.id).length === 0 && (
                      <option value="" disabled>No other questions available</option>
                    )}
                    {destination?.type === 'page' && allPages.length === 0 && (
                      <option value="" disabled>No pages available</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority (0 = highest priority)
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                min="0"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* DSL Preview */}
            {conditions.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Generated Logic</h3>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <code className="text-sm text-gray-800">{generateDSL()}</code>
                </div>
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={validateExpression}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Validate
                  </button>
                  <button
                    onClick={testExpression}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Test
                  </button>
                </div>
                {validationResult && (
                  <div className={`mt-2 p-3 rounded ${
                    validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {validationResult.isValid ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-sm ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                        {validationResult.isValid ? 'Valid' : validationResult.error}
                      </span>
                      {validationResult.testResult !== undefined && (
                        <span className="text-sm text-blue-800">
                          (Test result: {validationResult.testResult ? 'True' : 'False'})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {existingJumpId && (
                <button
                  onClick={removeJumpLogic}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Remove Jump Logic
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveJumpLogic}
                disabled={isLoading || !destination || (validationResult !== null && validationResult.isValid === false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {existingJumpId ? 'Update Jump Logic' : 'Save Jump Logic'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JumpLogicModal;
