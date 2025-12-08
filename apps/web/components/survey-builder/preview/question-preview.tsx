"use client";

import { QuestionWithDetails } from '@/lib/api/questions-api';
import { PreviewLogicEngine } from '@/lib/preview-logic-engine';
import { resolvePipingTokens } from '../piping-token-renderer';
import { resolveCarryForwardOptions, generateMockCarryForwardOptions, getCarryForwardConfig } from '../../../lib/carry-forward-utils';

interface QuestionPreviewProps {
  question: QuestionWithDetails;
  value: any;
  onChange: (value: any) => void;
  questionNumber: number;
  questionResponses?: Record<string, any>;
  embeddedData?: Record<string, any>;
  allQuestions?: QuestionWithDetails[];
  logicEngine?: PreviewLogicEngine;
}

export default function QuestionPreview({
  question,
  value,
  onChange,
  questionNumber,
  questionResponses = {},
  embeddedData = {},
  allQuestions = [],
  logicEngine
}: QuestionPreviewProps) {
  // Resolve piping tokens in question text
  const resolvedTitle = resolvePipingTokens(question.titleTemplate, questionResponses, embeddedData);
  const resolvedHelpText = question.helpTextTemplate 
    ? resolvePipingTokens(question.helpTextTemplate, questionResponses, embeddedData)
    : null;

  // Handle carry forward options
  const carryForwardConfig = getCarryForwardConfig(question);
  const carryForwardOptions = carryForwardConfig
    ? resolveCarryForwardOptions(question, allQuestions, questionResponses, carryForwardConfig)
    : [];

  // Get final options list (static options + carry forward options)
  let finalOptions;
  if (question.optionsSource === 'CARRY_FORWARD') {
    // For carry forward, combine existing static options with carried forward options
    const staticOptions = question.options || [];
    finalOptions = [...staticOptions, ...carryForwardOptions];
  } else {
    // For static sources, just use the question options
    finalOptions = question.options;
  }

  // Apply option visibility logic and randomization
  if (logicEngine && finalOptions) {
    if (question.optionsSource === 'CARRY_FORWARD') {
      // For carry forward, only apply randomization to static options, keep carried forward options as-is
      const staticOptions = question.options || [];
      const randomizedStatic = logicEngine.applyOptionRandomization(staticOptions, question);
      finalOptions = [...randomizedStatic, ...carryForwardOptions];
    } else {
      // For static options, apply full logic engine processing
      finalOptions = logicEngine.getVisibleOptionsForQuestion(question);
      finalOptions = logicEngine.applyOptionRandomization(finalOptions, question);
    }
  }

  const renderQuestionInput = () => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-2";
    const requiredIndicator = question.required ? " *" : "";

    switch (question.type) {
      case 'SINGLE_CHOICE':
        return (
          <div className="space-y-3">
            {finalOptions.map((option, index) => (
              <label key={option.id} className="flex items-center">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-4 w-4 border-gray-300"
                  style={{ accentColor: 'var(--theme-primary)' }}
                />
                <span className="ml-3 text-sm text-gray-700">
                  {option.labelTemplate}
                  {'isCarriedForward' in option && option.isCarriedForward && (
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                      carried forward
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        );

      case 'MULTIPLE_CHOICE':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-3">
            {finalOptions.map((option) => (
              <label key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, option.value]);
                    } else {
                      onChange(selectedValues.filter((v: string) => v !== option.value));
                    }
                  }}
                  className="h-4 w-4 border-gray-300 rounded"
                  style={{ accentColor: 'var(--theme-primary)' }}
                />
                <span className="ml-3 text-sm text-gray-700">{option.labelTemplate}</span>
              </label>
            ))}
          </div>
        );

      case 'DROPDOWN':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
          >
            <option value="">Select an option...</option>
            {finalOptions.map((option) => (
              <option key={option.id} value={option.value}>
                {option.labelTemplate}
              </option>
            ))}
          </select>
        );

      case 'TEXT':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your answer..."
            className={baseClasses}
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your answer..."
            rows={4}
            className={baseClasses}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder="Enter a number..."
            className={baseClasses}
          />
        );

      case 'DECIMAL':
        return (
          <input
            type="number"
            step="0.01"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
            placeholder="Enter a decimal number..."
            className={baseClasses}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
          />
        );

      case 'TIME':
        return (
          <input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="true"
                checked={value === true}
                onChange={() => onChange(true)}
                className="h-4 w-4 border-gray-300"
                style={{ accentColor: 'var(--theme-primary)' }}
              />
              <span className="ml-3 text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="false"
                checked={value === false}
                onChange={() => onChange(false)}
                className="h-4 w-4 border-gray-300"
                style={{ accentColor: 'var(--theme-primary)' }}
              />
              <span className="ml-3 text-sm text-gray-700">No</span>
            </label>
          </div>
        );

      case 'RANK':
        const rankValue = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">Drag to reorder or use the dropdowns to rank:</p>
            {finalOptions.map((option, index) => (
              <div key={option.id} className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 w-20">
                  Rank {index + 1}:
                </span>
                <select
                  value={rankValue[index] || ''}
                  onChange={(e) => {
                    const newRank = [...rankValue];
                    newRank[index] = e.target.value;
                    onChange(newRank);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select option...</option>
                  {finalOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>
                      {opt.labelTemplate}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );

      case 'SLIDER':
        return (
          <div className="space-y-4">
            <input
              type="range"
              min="0"
              max="100"
              value={value || 50}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>0</span>
              <span className="font-medium">Current: {value || 50}</span>
              <span>100</span>
            </div>
          </div>
        );

      case 'MATRIX_SINGLE':
      case 'MATRIX_MULTIPLE':
        return (
          <div className="overflow-x-auto">
            <table className="matrix-table min-w-full border border-gray-300 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question
                  </th>
                  {question.scales.map((scale) => (
                    <th key={scale.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {scale.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {question.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.label}
                    </td>
                    {question.scales.map((scale) => (
                      <td key={scale.id} className="px-4 py-3 text-center">
                        <input
                          type="radio"
                          name={`matrix-${question.id}-${item.id}`}
                          value={scale.value}
                          checked={value?.[item.id] === scale.value}
                          onChange={() => {
                            const newValue = { ...value };
                            newValue[item.id] = scale.value;
                            onChange(newValue);
                          }}
                          className="h-4 w-4 border-gray-300"
                  style={{ accentColor: 'var(--theme-primary)' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'DESCRIPTIVE':
        return (
          <div 
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--theme-surface)',
              border: '1px solid var(--theme-border)',
              borderRadius: 'var(--theme-radius-lg)'
            }}
          >
            <p 
              className="text-sm"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              This is a descriptive text block. No input required.
            </p>
          </div>
        );

      case 'FILE_UPLOAD':
        return (
          <div className="file-upload-area border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-4">
              <label htmlFor={`file-${question.id}`} className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Click to upload a file
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  or drag and drop
                </span>
                <input
                  id={`file-${question.id}`}
                  type="file"
                  className="sr-only"
                  onChange={(e) => onChange(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
        );

      case 'CONTACT_FORM':
        const contactValue = value?.jsonValue || { name: '', email: '', phone: '', company: '' };
        
        const handleContactChange = (field: string, fieldValue: string) => {
          const newContactValue = { ...contactValue, [field]: fieldValue };
          onChange({ jsonValue: newContactValue });
        };

        return (
          <div className="space-y-4">
            {/* IPSOS Branding Header */}
            {question.showIpsosBranding && (
              <div className="border-2 border-gray-300 rounded-lg p-6 mb-6">
                <div className="flex items-start space-x-8">
                  {/* Left: Logo */}
                  <div className="flex-shrink-0">
                    <img 
                      src="https://garthtarr.com/wp-content/uploads/2016/05/Ipsos_logo.svg.png"
                      alt="Ipsos Logo"
                      className="w-24 h-24"
                    />
                  </div>
                  
                  {/* Right: Company Details */}
                  <div className="flex-1 text-right">
                    <h2 className="text-xl font-bold text-gray-900">Ipsos GmbH</h2>
                    <p className="text-sm text-gray-600 uppercase tracking-wide">Qualitative Research</p>
                    <div className="mt-4 text-sm text-gray-700">
                      <p>Sachsenstraße 6</p>
                      <p>D – 20097 Hamburg</p>
                      <p>Tel. +49 (0)40 80096-0</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Form Fields */}
            {question.collectName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name {question.required && '*'}
                </label>
                <input
                  type="text"
                  value={contactValue.name || ''}
                  onChange={(e) => handleContactChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {question.collectEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email {question.required && '*'}
                </label>
                <input
                  type="email"
                  value={contactValue.email || ''}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {question.collectPhone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone {question.required && '*'}
                </label>
                <input
                  type="tel"
                  value={contactValue.phone || ''}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {question.collectCompany && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company {question.required && '*'}
                </label>
                <input
                  type="text"
                  value={contactValue.company || ''}
                  onChange={(e) => handleContactChange('company', e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        );

      case 'MESSAGE':
        // Function to format text with basic HTML-like formatting
        const formatMessageText = (text: string) => {
          if (!text) return '';
          
          // Convert line breaks to <br> tags
          let formatted = text.replace(/\n/g, '<br>');
          
          // Convert **text** to <strong>text</strong> for bold
          formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          
          // Convert *text* to <em>text</em> for italic
          formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
          
          return formatted;
        };

        return (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div 
              className="prose prose-sm max-w-none text-gray-900 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: formatMessageText(resolvedTitle || '') 
              }}
            />
          </div>
        );

      default:
        return (
          <div className="text-gray-500 italic">
            Question type "{question.type}" is not supported in preview.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div>
        <label className={question.required ? "block text-lg font-medium text-gray-900 mb-2" : "block text-lg font-medium text-gray-900 mb-2"}>
          <span 
            className="font-semibold"
            style={{ color: 'var(--theme-primary)' }}
          >
            Q{questionNumber}:
          </span> {resolvedTitle}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {resolvedHelpText && (
          <p className="text-sm text-gray-600 mb-4">{resolvedHelpText}</p>
        )}
      </div>

      {/* Question Input */}
      <div>
        {renderQuestionInput()}
      </div>

      {/* Validation Error */}
      {question.required && !value && (
        <p 
          className="text-sm mt-2"
          style={{ color: 'var(--theme-error)' }}
        >
          This question is required.
        </p>
      )}
    </div>
  );
}
