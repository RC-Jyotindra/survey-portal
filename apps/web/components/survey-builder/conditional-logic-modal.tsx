"use client";

import { useState } from 'react';
import { QuestionWithDetails, QuestionType } from '@/lib/api/questions-api';
import { PageWithQuestions } from '@/lib/api/pages-api';

interface ConditionalLogicModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionWithDetails;
  allQuestions: QuestionWithDetails[];
  allPages: PageWithQuestions[];
  onSave: (logicRules: LogicRule[]) => void;
  existingRules?: LogicRule[];
}

export interface LogicRule {
  id: string;
  type: 'SKIP_QUESTION' | 'JUMP_TO_QUESTION' | 'JUMP_TO_PAGE';
  conditions: LogicCondition[];
  targetQuestionId?: string;
  targetPageId?: string;
  description: string;
}

export interface LogicCondition {
  questionId: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
  value: string | string[];
}

const OPERATORS = [
  { value: 'EQUALS', label: 'Equals', applicableTypes: ['SINGLE_CHOICE', 'DROPDOWN', 'TEXT', 'NUMBER', 'BOOLEAN'] },
  { value: 'NOT_EQUALS', label: 'Not Equals', applicableTypes: ['SINGLE_CHOICE', 'DROPDOWN', 'TEXT', 'NUMBER', 'BOOLEAN'] },
  { value: 'CONTAINS', label: 'Contains', applicableTypes: ['MULTIPLE_CHOICE', 'TEXT', 'TEXTAREA'] },
  { value: 'NOT_CONTAINS', label: 'Not Contains', applicableTypes: ['MULTIPLE_CHOICE', 'TEXT', 'TEXTAREA'] },
  { value: 'GREATER_THAN', label: 'Greater Than', applicableTypes: ['NUMBER', 'DECIMAL'] },
  { value: 'LESS_THAN', label: 'Less Than', applicableTypes: ['NUMBER', 'DECIMAL'] }
];

export default function ConditionalLogicModal({
  isOpen,
  onClose,
  question,
  allQuestions,
  allPages,
  onSave,
  existingRules = []
}: ConditionalLogicModalProps) {
  const [rules, setRules] = useState<LogicRule[]>(existingRules);
  const [editingRule, setEditingRule] = useState<LogicRule | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);

  // Get questions that come before the current question (for condition selection)
  const previousQuestions = allQuestions.filter(q => {
    const currentQuestionIndex = allQuestions.findIndex(aq => aq.id === question.id);
    const qIndex = allQuestions.findIndex(aq => aq.id === q.id);
    return qIndex < currentQuestionIndex;
  });

  const handleAddRule = () => {
    const newRule: LogicRule = {
      id: `rule_${Date.now()}`,
      type: 'SKIP_QUESTION',
      conditions: [{
        questionId: '',
        operator: 'EQUALS',
        value: ''
      }],
      description: ''
    };
    setEditingRule(newRule);
    setShowAddRule(true);
  };

  const handleSaveRule = (rule: LogicRule) => {
    const updatedRules = rules.find(r => r.id === rule.id) 
      ? rules.map(r => r.id === rule.id ? rule : r)
      : [...rules, rule];
    
    setRules(updatedRules);
    setEditingRule(null);
    setShowAddRule(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const handleSaveAll = () => {
    onSave(rules);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Conditional Logic</h2>
              <p className="text-sm text-slate-600 mt-1">Configure logic rules for: {question.titleTemplate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Existing Rules */}
            {rules.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Current Logic Rules</h3>
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              {rule.type.replace('_', ' ')}
                            </span>
                            {rule.type === 'JUMP_TO_QUESTION' && rule.targetQuestionId && (
                              <span className="text-sm text-slate-600">
                                → {allQuestions.find(q => q.id === rule.targetQuestionId)?.titleTemplate}
                              </span>
                            )}
                            {rule.type === 'JUMP_TO_PAGE' && rule.targetPageId && (
                              <span className="text-sm text-slate-600">
                                → {allPages.find(p => p.id === rule.targetPageId)?.titleTemplate || 'Page'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700">{rule.description}</p>
                          <div className="mt-2 text-xs text-slate-500">
                            {rule.conditions.map((condition, index) => {
                              const conditionQuestion = allQuestions.find(q => q.id === condition.questionId);
                              return (
                                <div key={index} className="flex items-center space-x-1">
                                  <span>If "{conditionQuestion?.titleTemplate}" {condition.operator.toLowerCase().replace('_', ' ')} "{condition.value}"</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setShowAddRule(true);
                            }}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Rule Button */}
            {!showAddRule && (
              <button
                onClick={handleAddRule}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg p-6 text-slate-600 hover:border-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Logic Rule</span>
              </button>
            )}

            {/* Rule Editor */}
            {showAddRule && editingRule && (
              <RuleEditor
                rule={editingRule}
                allQuestions={allQuestions}
                allPages={allPages}
                currentQuestion={question}
                previousQuestions={previousQuestions}
                onSave={handleSaveRule}
                onCancel={() => {
                  setShowAddRule(false);
                  setEditingRule(null);
                }}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600">
              Logic rules will be applied in the order shown above.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Logic Rules
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RuleEditorProps {
  rule: LogicRule;
  allQuestions: QuestionWithDetails[];
  allPages: PageWithQuestions[];
  currentQuestion: QuestionWithDetails;
  previousQuestions: QuestionWithDetails[];
  onSave: (rule: LogicRule) => void;
  onCancel: () => void;
}

function RuleEditor({ rule, allQuestions, allPages, currentQuestion, previousQuestions, onSave, onCancel }: RuleEditorProps) {
  const [editedRule, setEditedRule] = useState<LogicRule>(rule);

  const handleConditionChange = (index: number, field: keyof LogicCondition, value: any) => {
    const updatedConditions = [...editedRule.conditions];
    updatedConditions[index] = { ...updatedConditions[index], [field]: value } as LogicCondition;
    setEditedRule({ ...editedRule, conditions: updatedConditions });
  };

  const addCondition = () => {
    setEditedRule({
      ...editedRule,
      conditions: [...editedRule.conditions, { questionId: '', operator: 'EQUALS', value: '' }]
    });
  };

  const removeCondition = (index: number) => {
    setEditedRule({
      ...editedRule,
      conditions: editedRule.conditions.filter((_, i) => i !== index)
    });
  };

  const getQuestionOptions = (questionId: string) => {
    const question = previousQuestions.find(q => q.id === questionId);
    return question?.options || [];
  };

  const getApplicableOperators = (questionId: string) => {
    const question = previousQuestions.find(q => q.id === questionId);
    if (!question) return [];
    
    return OPERATORS.filter(op => op.applicableTypes.includes(question.type));
  };

  const generateDescription = () => {
    const conditions = editedRule.conditions
      .filter(c => c.questionId && c.value)
      .map(condition => {
        const question = previousQuestions.find(q => q.id === condition.questionId);
        const operator = OPERATORS.find(op => op.value === condition.operator);
        return `"${question?.titleTemplate}" ${operator?.label.toLowerCase()} "${condition.value}"`;
      })
      .join(' AND ');

    let action = '';
    if (editedRule.type === 'SKIP_QUESTION') {
      action = 'skip this question';
    } else if (editedRule.type === 'JUMP_TO_QUESTION' && editedRule.targetQuestionId) {
      const targetQuestion = allQuestions.find(q => q.id === editedRule.targetQuestionId);
      action = `jump to "${targetQuestion?.titleTemplate}"`;
    } else if (editedRule.type === 'JUMP_TO_PAGE' && editedRule.targetPageId) {
      const targetPage = allPages.find(p => p.id === editedRule.targetPageId);
      action = `jump to "${targetPage?.titleTemplate || 'Page'}"`;
    }

    return `If ${conditions}, then ${action}`;
  };

  const handleSave = () => {
    const description = generateDescription();
    onSave({ ...editedRule, description });
  };

  return (
    <div className="border border-slate-200 rounded-lg p-6 bg-white">
      <h4 className="text-lg font-medium text-slate-900 mb-4">
        {rule.id.startsWith('rule_') ? 'Add New Logic Rule' : 'Edit Logic Rule'}
      </h4>

      {/* Rule Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Action</label>
        <select
          value={editedRule.type}
          onChange={(e) => setEditedRule({ ...editedRule, type: e.target.value as LogicRule['type'] })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="SKIP_QUESTION">Skip this question</option>
          <option value="JUMP_TO_QUESTION">Jump to another question</option>
          <option value="JUMP_TO_PAGE">Jump to another page</option>
        </select>
      </div>

      {/* Target Selection */}
      {editedRule.type === 'JUMP_TO_QUESTION' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Target Question</label>
          <select
            value={editedRule.targetQuestionId || ''}
            onChange={(e) => setEditedRule({ ...editedRule, targetQuestionId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a question</option>
            {allQuestions.filter(q => q.id !== currentQuestion.id).map(question => (
              <option key={question.id} value={question.id}>
                {question.titleTemplate}
              </option>
            ))}
          </select>
        </div>
      )}

      {editedRule.type === 'JUMP_TO_PAGE' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Target Page</label>
          <select
            value={editedRule.targetPageId || ''}
            onChange={(e) => setEditedRule({ ...editedRule, targetPageId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a page</option>
            {allPages.map(page => (
              <option key={page.id} value={page.id}>
                {page.titleTemplate || `Page ${page.index}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Conditions */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Conditions</label>
        <div className="space-y-3">
          {editedRule.conditions.map((condition, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg">
              {/* Question Selection */}
              <select
                value={condition.questionId}
                onChange={(e) => handleConditionChange(index, 'questionId', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select question</option>
                {previousQuestions.map(question => (
                  <option key={question.id} value={question.id}>
                    {question.titleTemplate}
                  </option>
                ))}
              </select>

              {/* Operator Selection */}
              <select
                value={condition.operator}
                onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {getApplicableOperators(condition.questionId).map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value Selection */}
              {condition.questionId && (
                <>
                  {getQuestionOptions(condition.questionId).length > 0 ? (
                    <select
                      value={condition.value}
                      onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select value</option>
                      {getQuestionOptions(condition.questionId).map(option => (
                        <option key={option.id} value={option.value}>
                          {option.labelTemplate}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                      placeholder="Enter value"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  )}
                </>
              )}

              {/* Remove Condition */}
              {editedRule.conditions.length > 1 && (
                <button
                  onClick={() => removeCondition(index)}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
        </div>

        <button
          onClick={addCondition}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Condition</span>
        </button>
      </div>

      {/* Preview */}
      <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <h5 className="text-sm font-medium text-slate-700 mb-1">Rule Preview:</h5>
        <p className="text-sm text-slate-600">{generateDescription()}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!editedRule.conditions.some(c => c.questionId && c.value)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save Rule
        </button>
      </div>
    </div>
  );
}
