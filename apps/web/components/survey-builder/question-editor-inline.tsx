"use client";

import { useState } from 'react';
import { QuestionWithDetails, QuestionType, questionsAPI } from '@/lib/api/questions-api';
import RichTextEditor from './rich-text-editor';
import OptionDisplayLogicModal from './option-display-logic-modal';
import { QuestionTerminationLogicModal } from './question-termination-logic-modal';
import ValidationEditor from './validation-editor';

interface QuestionEditorInlineProps {
  question: QuestionWithDetails;
  onSave: (question: QuestionWithDetails) => void;
  onCancel: () => void;
  surveyId: string;
  allQuestions?: QuestionWithDetails[];
}

export default function QuestionEditorInline({
  question,
  onSave,
  onCancel,
  surveyId,
  allQuestions = []
}: QuestionEditorInlineProps) {
  const [formData, setFormData] = useState({
    titleTemplate: question.titleTemplate,
    helpTextTemplate: question.helpTextTemplate || '',
    required: question.required,
    type: question.type,
    validation: question.validation,
    minValue: question.minValue,
    maxValue: question.maxValue
  });

  const [activeTab, setActiveTab] = useState<'question' | 'choices' | 'options'>('question');
  const [loading, setLoading] = useState(false);
  const [displayLogicModalOpen, setDisplayLogicModalOpen] = useState(false);
  const [selectedOptionForLogic, setSelectedOptionForLogic] = useState<any>(null);
  const [terminationLogicModalOpen, setTerminationLogicModalOpen] = useState(false);

  const handleSave = async () => {
    try {
      if (!question.id) {
        console.error('Question ID is missing');
        alert('Cannot save question: Question ID is missing');
        return;
      }
      
      setLoading(true);
      const updatedQuestion = await questionsAPI.updateQuestion(surveyId, question.id, {
        titleTemplate: formData.titleTemplate,
        helpTextTemplate: formData.helpTextTemplate,
        required: formData.required,
        type: formData.type as QuestionType,
        validation: formData.validation,
        minValue: formData.minValue,
        maxValue: formData.maxValue
      } as any);
      onSave(updatedQuestion);
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to save question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisplayLogicUpdated = async (expressionId: string | null) => {
    if (!selectedOptionForLogic || !question.id) return;

    try {
      // Update the option with the new expression ID
      await questionsAPI.updateQuestionOption(surveyId, question.id, selectedOptionForLogic.id, {
        visibleIfExpressionId: expressionId || undefined
      });

      // Update the question's options in the parent component
      const updatedQuestion = {
        ...question,
        options: question.options.map(option =>
          option.id === selectedOptionForLogic.id
            ? { ...option, visibleIfExpressionId: expressionId }
            : option
        )
      };
      onSave(updatedQuestion);

      setDisplayLogicModalOpen(false);
      setSelectedOptionForLogic(null);
    } catch (error) {
      console.error('Error updating option display logic:', error);
      alert('Failed to update display logic. Please try again.');
    }
  };

  const handleTerminationLogicUpdated = async (expressionId: string | null) => {
    try {
      const updatedQuestion = await questionsAPI.updateQuestion(surveyId, question.id, {
        terminateIfExpressionId: expressionId || undefined
      });
      onSave(updatedQuestion);
    } catch (error) {
      console.error('Error updating termination logic:', error);
      alert('Failed to update termination logic. Please try again.');
    }
  };

  const getQuestionTypeOptions = () => [
    { value: 'SINGLE_CHOICE', label: 'Single Choice' },
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
    { value: 'TEXT', label: 'Text Entry (Single Line)' },
    { value: 'TEXTAREA', label: 'Text Entry (Essay)' },
    { value: 'NUMBER', label: 'Text Entry (Number)' },
    { value: 'DROPDOWN', label: 'Dropdown' },
    { value: 'MATRIX', label: 'Matrix Table' },
    { value: 'RANK', label: 'Rank Order' },
    { value: 'SLIDER', label: 'Slider' },
    { value: 'DESCRIPTIVE', label: 'Text/Graphic' }
  ];

  return (
    <div className="border border-blue-500 rounded-lg bg-white shadow-lg">
      {/* Editor Header */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blue-900">Edit Question</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Editor Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('question')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'question'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Question
          </button>
          {(formData.type === 'SINGLE_CHOICE' || 
            formData.type === 'MULTIPLE_CHOICE' || 
            formData.type === 'DROPDOWN') && (
            <button
              onClick={() => setActiveTab('choices')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'choices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Answer Choices
            </button>
          )}
          <button
            onClick={() => setActiveTab('options')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'options'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Options
          </button>
        </nav>
      </div>

      {/* Editor Content */}
      <div className="p-6">
        {activeTab === 'question' && (
          <QuestionTab
            formData={formData}
            setFormData={setFormData}
            questionTypeOptions={getQuestionTypeOptions()}
            allQuestions={allQuestions}
            currentQuestionId={question.id}
            onTerminationLogicClick={() => setTerminationLogicModalOpen(true)}
            hasTerminationLogic={!!(question as any).terminateIfExpressionId}
          />
        )}

        {activeTab === 'choices' && (
          <ChoicesTab
            question={question}
            surveyId={surveyId}
            allQuestions={allQuestions}
            displayLogicModalOpen={displayLogicModalOpen}
            setDisplayLogicModalOpen={setDisplayLogicModalOpen}
            selectedOptionForLogic={selectedOptionForLogic}
            setSelectedOptionForLogic={setSelectedOptionForLogic}
            onDisplayLogicUpdated={handleDisplayLogicUpdated}
          />
        )}

        {activeTab === 'options' && (
          <OptionsTab
            formData={formData}
            setFormData={setFormData}
          />
        )}
      </div>

      {/* Question Termination Logic Modal */}
      {terminationLogicModalOpen && (
        <QuestionTerminationLogicModal
          isOpen={terminationLogicModalOpen}
          onClose={() => setTerminationLogicModalOpen(false)}
          question={question}
          allQuestions={allQuestions}
          surveyId={surveyId}
          onTerminationLogicUpdated={handleTerminationLogicUpdated}
        />
      )}
    </div>
  );
}

interface QuestionTabProps {
  formData: any;
  setFormData: (data: any) => void;
  questionTypeOptions: Array<{ value: string; label: string }>;
  allQuestions?: QuestionWithDetails[];
  currentQuestionId?: string;
  onTerminationLogicClick?: () => void;
  hasTerminationLogic?: boolean;
}

function QuestionTab({ formData, setFormData, questionTypeOptions, allQuestions = [], currentQuestionId, onTerminationLogicClick, hasTerminationLogic }: QuestionTabProps) {
  return (
    <div className="space-y-6">
      {/* Question Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Type
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as QuestionType })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {questionTypeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Question Text */}
      <div>
        <RichTextEditor
          value={formData.titleTemplate}
          onChange={(value) => setFormData({ ...formData, titleTemplate: value })}
          placeholder="Enter your question text..."
          rows={3}
          availableQuestions={allQuestions}
          currentQuestionId={currentQuestionId}
          label="Question Text"
        />
      </div>

      {/* Help Text */}
      <div>
        <RichTextEditor
          value={formData.helpTextTemplate}
          onChange={(value) => setFormData({ ...formData, helpTextTemplate: value })}
          placeholder="Additional instructions for respondents..."
          rows={2}
          availableQuestions={allQuestions}
          currentQuestionId={currentQuestionId}
          label="Help Text (Optional)"
        />
      </div>

      {/* Termination Logic */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Termination Logic</h3>
            <p className="text-xs text-gray-500 mt-1">
              Set conditions for when this question should terminate the survey
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {hasTerminationLogic && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Termination Set
              </span>
            )}
            <button
              type="button"
              onClick={onTerminationLogicClick}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {hasTerminationLogic ? 'Edit Termination' : 'Set Termination'}
            </button>
          </div>
        </div>
      </div>

      {/* Required Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="required"
          checked={formData.required}
          onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="required" className="ml-2 text-sm text-gray-700">
          Required question
        </label>
      </div>
    </div>
  );
}

interface ChoicesTabProps {
  question: QuestionWithDetails;
  surveyId: string;
  allQuestions: QuestionWithDetails[];
  displayLogicModalOpen: boolean;
  setDisplayLogicModalOpen: (open: boolean) => void;
  selectedOptionForLogic: any;
  setSelectedOptionForLogic: (option: any) => void;
  onDisplayLogicUpdated: (expressionId: string | null) => void;
}

function ChoicesTab({ 
  question, 
  surveyId, 
  allQuestions,
  displayLogicModalOpen,
  setDisplayLogicModalOpen,
  selectedOptionForLogic,
  setSelectedOptionForLogic,
  onDisplayLogicUpdated
}: ChoicesTabProps) {
  const [options, setOptions] = useState(question.options);
  const [newOptions, setNewOptions] = useState<Array<{id: string, labelTemplate: string, value: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleOptionChange = (optionId: string, newLabel: string) => {
    setOptions(prev => prev.map(opt => 
      opt.id === optionId ? { ...opt, labelTemplate: newLabel } : opt
    ));
  };

  const handleNewOptionChange = (tempId: string, newLabel: string) => {
    setNewOptions(prev => prev.map(opt => 
      opt.id === tempId ? { ...opt, labelTemplate: newLabel, value: newLabel } : opt
    ));
  };

  const handleAddOption = () => {
    const tempId = `temp_${Date.now()}`;
    const newOption = {
      id: tempId,
      labelTemplate: `Choice ${options.length + newOptions.length + 1}`,
      value: `Choice ${options.length + newOptions.length + 1}`
    };
    setNewOptions(prev => [...prev, newOption]);
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      if (!question.id) {
        console.error('Question ID is missing');
        alert('Cannot delete option: Question ID is missing');
        return;
      }
      
      setLoading(true);
      await questionsAPI.deleteQuestionOption(surveyId, question.id, optionId);
      setOptions(prev => prev.filter(opt => opt.id !== optionId));
    } catch (error) {
      console.error('Error deleting option:', error);
      alert('Failed to delete option. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNewOption = (tempId: string) => {
    setNewOptions(prev => prev.filter(opt => opt.id !== tempId));
  };

  const handleSaveOptions = async () => {
    try {
      if (!question.id) {
        console.error('Question ID is missing');
        alert('Cannot save options: Question ID is missing');
        return;
      }
      
      setSaving(true);
      
      // Save all new options
      for (const newOption of newOptions) {
        await questionsAPI.createQuestionOption(surveyId, question.id, {
          questionId: question.id,
          value: newOption.value,
          labelTemplate: newOption.labelTemplate,
          exclusive: false
        });
      }
      
      // Update the options list with the new options
      const createdOptions = newOptions.map(opt => ({
        id: `created_${Date.now()}_${Math.random()}`, // Temporary ID for UI
        tenantId: question.tenantId,
        surveyId: question.surveyId,
        questionId: question.id,
        index: options.length + newOptions.indexOf(opt) + 1,
        value: opt.value,
        labelTemplate: opt.labelTemplate,
        exclusive: false,
        groupKey: null,
        weight: null,
        visibleIfExpressionId: null,
        imageUrl: null,
        imageAlt: null,
        imageWidth: null,
        imageHeight: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      setOptions(prev => [...prev, ...createdOptions]);
      setNewOptions([]);
      
    } catch (error) {
      console.error('Error saving options:', error);
      alert('Failed to save options. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisplayLogicClick = (option: any) => {
    setSelectedOptionForLogic(option);
    setDisplayLogicModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-gray-900">Answer Choices</h4>
      
      {/* Existing Options */}
      {options.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-700">Saved Options</h5>
          {options.map((option, index) => (
            <div key={option.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-gray-500">
                  {index + 1}.
                </div>
                <input
                  type="text"
                  value={option.labelTemplate}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Choice ${index + 1}`}
                />
                <button 
                  onClick={() => handleDisplayLogicClick(option)}
                  className="text-gray-400 hover:text-blue-600 p-1"
                  title="Set Display Logic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleDeleteOption(option.id)}
                  disabled={loading}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-50 p-1"
                  title="Delete Option"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              {/* Display Logic Indicator */}
              {option.visibleIfExpressionId && (
                <div className="mt-2 flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Conditional Display
                  </span>
                  <button
                    onClick={() => handleDisplayLogicClick(option)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Edit Logic
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Options */}
      {newOptions.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-700">New Options (Unsaved)</h5>
          {newOptions.map((option, index) => (
            <div key={option.id} className="flex items-center space-x-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex-shrink-0 text-blue-600">
                {options.length + index + 1}.
              </div>
              <input
                type="text"
                value={option.labelTemplate}
                onChange={(e) => handleNewOptionChange(option.id, e.target.value)}
                className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Choice ${options.length + index + 1}`}
              />
              <button 
                onClick={() => handleDeleteNewOption(option.id)}
                className="text-blue-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Option Button */}
      <button 
        onClick={handleAddOption}
        className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
      >
        + Add choice
      </button>

      {/* Save Options Button */}
      {newOptions.length > 0 && (
        <button 
          onClick={handleSaveOptions}
          disabled={saving}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving Options...' : `Save ${newOptions.length} Option${newOptions.length > 1 ? 's' : ''}`}
        </button>
      )}

      {/* Option Display Logic Modal */}
      {selectedOptionForLogic && (
        <OptionDisplayLogicModal
          isOpen={displayLogicModalOpen}
          onClose={() => {
            setDisplayLogicModalOpen(false);
            setSelectedOptionForLogic(null);
          }}
          option={selectedOptionForLogic}
          surveyId={surveyId}
          allQuestions={allQuestions}
          onLogicUpdated={onDisplayLogicUpdated}
        />
      )}
    </div>
  );
}

interface OptionsTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

function OptionsTab({ formData, setFormData }: OptionsTabProps) {
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-gray-900">Question Options</h4>
      
      <div className="space-y-4">
        {/* Force Response */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900">Force Response</h5>
            <p className="text-sm text-gray-500">Require an answer to this question</p>
          </div>
          <input
            type="checkbox"
            checked={formData.required}
            onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        {/* Add Request Response */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900">Add Request Response</h5>
            <p className="text-sm text-gray-500">Ask respondents to answer if they skip</p>
          </div>
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        {/* Validation */}
        <div>
          <ValidationEditor
            questionType={formData.type}
            validation={formData.validation}
            minValue={formData.minValue}
            maxValue={formData.maxValue}
            onChange={(validation, minValue, maxValue) => {
              setFormData({
                ...formData,
                validation,
                minValue,
                maxValue
              });
            }}
          />
        </div>

        {/* Display Logic */}
        <div className="border-t pt-4">
          <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium">Add Display Logic</span>
          </button>
          <p className="text-sm text-gray-500 mt-1">
            Show this question only if certain conditions are met
          </p>
        </div>
      </div>
    </div>
  );
}
