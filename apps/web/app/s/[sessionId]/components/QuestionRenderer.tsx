'use client';

import { useState } from 'react';
import { ResolvedQuestion, ResolvedOption, AnswerValue, ValidationViolation } from './types';

interface QuestionRendererProps {
  question: ResolvedQuestion;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  violation?: ValidationViolation;
}

export default function QuestionRenderer({ question, value, onChange, violation }: QuestionRendererProps) {
  const [otherText, setOtherText] = useState('');

  const handleChoiceChange = (optionValue: string, checked: boolean) => {
    if (question.type === 'SINGLE_CHOICE' || question.type === 'DROPDOWN' || question.type === 'YES_NO') {
      onChange({ choices: checked ? [optionValue] : [] });
    } else if (question.type === 'MULTIPLE_CHOICE') {
      const currentChoices = value?.choices || [];
      const newChoices = checked
        ? [...currentChoices, optionValue]
        : currentChoices.filter(c => c !== optionValue);
      
      // Check max selections
      if (question.maxSelections && newChoices.length > question.maxSelections) {
        return; // Don't allow more selections
      }
      
      onChange({ choices: newChoices });
    }
  };

  const handleTextChange = (text: string) => {
    onChange({ textValue: text });
  };

  const handleNumberChange = (num: number) => {
    onChange({ numericValue: num });
  };

  const handleBooleanChange = (bool: boolean) => {
    onChange({ booleanValue: bool });
  };

  const handleEmailChange = (email: string) => {
    onChange({ emailValue: email });
  };

  const handlePhoneChange = (phone: string) => {
    onChange({ phoneValue: phone });
  };

  const handleUrlChange = (url: string) => {
    onChange({ urlValue: url });
  };

  const handleDateChange = (date: string) => {
    onChange({ dateValue: date });
  };

  const handleTimeChange = (time: string) => {
    onChange({ timeValue: time });
  };

  const renderSingleChoice = () => (
    <div className="space-y-3">
      {question.options
        .filter(option => option.isVisible) // Only show visible options
        .map((option) => (
        <label key={option.id} className="flex items-center space-x-4 cursor-pointer p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
          <input
            type="radio"
            name={question.id}
            value={option.value}
            checked={value?.choices?.includes(option.value) || false}
            onChange={(e) => handleChoiceChange(option.value, e.target.checked)}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <span className="text-gray-900 font-medium">{option.label}</span>
        </label>
      ))}
      {question.allowOther && (
        <div className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
          <div className="flex items-center space-x-4">
            <input
              type="radio"
              name={question.id}
              value="other"
              checked={value?.choices?.includes('other') || false}
              onChange={(e) => handleChoiceChange('other', e.target.checked)}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="text-gray-900 font-medium">{question.otherLabel || 'Other'}</span>
          </div>
          {value?.choices?.includes('other') && (
            <div className="mt-3 ml-9">
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Please specify"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderMultipleChoice = () => (
    <div className="space-y-3">
      {question.options
        .filter(option => option.isVisible) // Only show visible options
        .map((option) => (
        <label key={option.id} className="flex items-center space-x-4 cursor-pointer p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
          <input
            type="checkbox"
            value={option.value}
            checked={value?.choices?.includes(option.value) || false}
            onChange={(e) => handleChoiceChange(option.value, e.target.checked)}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-gray-900 font-medium">{option.label}</span>
        </label>
      ))}
      {question.allowOther && (
        <div className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              value="other"
              checked={value?.choices?.includes('other') || false}
              onChange={(e) => handleChoiceChange('other', e.target.checked)}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-gray-900 font-medium">{question.otherLabel || 'Other'}</span>
          </div>
          {value?.choices?.includes('other') && (
            <div className="mt-3 ml-9">
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Please specify"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          )}
        </div>
      )}
      {question.maxSelections && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">
            Select up to {question.maxSelections} options
          </p>
        </div>
      )}
    </div>
  );

  const renderDropdown = () => (
    <select
      value={value?.choices?.[0] || ''}
      onChange={(e) => handleChoiceChange(e.target.value, true)}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
    >
      <option value="">Select an option</option>
      {question.options
        .filter(option => option.isVisible) // Only show visible options
        .map((option) => (
        <option key={option.id} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const renderText = () => (
    <input
      type="text"
      value={value?.textValue || ''}
      onChange={(e) => handleTextChange(e.target.value)}
      placeholder="Enter your answer"
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    />
  );

  const renderTextarea = () => (
    <textarea
      value={value?.textValue || ''}
      onChange={(e) => handleTextChange(e.target.value)}
      placeholder="Enter your answer"
      rows={4}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
    />
  );

  const renderEmail = () => (
    <input
      type="email"
      value={value?.emailValue || ''}
      onChange={(e) => handleEmailChange(e.target.value)}
      placeholder="Enter your email address"
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    />
  );

  const renderPhone = () => (
    <input
      type="tel"
      value={value?.phoneValue || ''}
      onChange={(e) => handlePhoneChange(e.target.value)}
      placeholder="Enter your phone number"
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    />
  );

  const renderUrl = () => (
    <input
      type="url"
      value={value?.urlValue || ''}
      onChange={(e) => handleUrlChange(e.target.value)}
      placeholder="Enter a URL"
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    />
  );

  const renderNumber = () => (
    <input
      type="number"
      value={value?.numericValue || ''}
      onChange={(e) => handleNumberChange(Number(e.target.value))}
      min={question.minValue}
      max={question.maxValue}
      step={question.stepValue}
      placeholder="Enter a number"
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    />
  );

  const renderSlider = () => (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="range"
          min={question.minValue || 0}
          max={question.maxValue || 100}
          step={question.stepValue || 1}
          value={value?.numericValue || question.defaultValue || 0}
          onChange={(e) => handleNumberChange(Number(e.target.value))}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500 font-medium">{question.minValue || 0}</span>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
          {value?.numericValue || question.defaultValue || 0}
        </div>
        <span className="text-gray-500 font-medium">{question.maxValue || 100}</span>
      </div>
    </div>
  );

  const renderOpinionScale = () => (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-gray-600 font-medium">
        <span>{question.scaleMinLabel || 'Poor'}</span>
        <span>{question.scaleMaxLabel || 'Excellent'}</span>
      </div>
      <div className="flex justify-between">
        {Array.from({ length: question.scaleSteps || 5 }, (_, i) => i + 1).map((step) => (
          <label key={step} className="flex flex-col items-center cursor-pointer group">
            <div className="relative">
              <input
                type="radio"
                name={question.id}
                value={step}
                checked={value?.numericValue === step}
                onChange={(e) => handleNumberChange(Number(e.target.value))}
                className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              {value?.numericValue === step && (
                <div className="absolute inset-0 bg-blue-600 rounded-full animate-pulse"></div>
              )}
            </div>
            <span className="text-sm text-gray-700 mt-2 font-medium group-hover:text-blue-600 transition-colors">
              {step}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderYesNo = () => (
    <div className="flex space-x-4">
      <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 flex-1">
        <input
          type="radio"
          name={question.id}
          value="yes"
          checked={value?.booleanValue === true}
          onChange={(e) => handleBooleanChange(true)}
          className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300"
        />
        <span className="text-gray-900 font-medium">Yes</span>
      </label>
      <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 flex-1">
        <input
          type="radio"
          name={question.id}
          value="no"
          checked={value?.booleanValue === false}
          onChange={(e) => handleBooleanChange(false)}
          className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300"
        />
        <span className="text-gray-900 font-medium">No</span>
      </label>
    </div>
  );

  const renderDate = () => (
    <input
      type="date"
      value={value?.dateValue || ''}
      onChange={(e) => handleDateChange(e.target.value)}
      min={question.minDate?.toISOString().split('T')[0]}
      max={question.maxDate?.toISOString().split('T')[0]}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    />
  );

  const renderTime = () => (
    <input
      type="time"
      value={value?.timeValue || ''}
      onChange={(e) => handleTimeChange(e.target.value)}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
    />
  );

  const handleMatrixChange = (itemId: string, scaleId: string, checked: boolean) => {
    const currentMatrix = value?.matrixValue || {};
    
    if (question.type === 'MATRIX_SINGLE') {
      // Single choice: only one selection per row
      const newMatrix = { ...currentMatrix };
      newMatrix[itemId] = checked ? scaleId : null;
      onChange({ matrixValue: newMatrix });
    } else if (question.type === 'MATRIX_MULTIPLE') {
      // Multiple choice: multiple selections per row
      const newMatrix = { ...currentMatrix };
      if (!newMatrix[itemId]) {
        newMatrix[itemId] = [];
      }
      
      if (checked) {
        newMatrix[itemId] = [...(newMatrix[itemId] || []), scaleId];
      } else {
        const currentArray = Array.isArray(newMatrix[itemId]) ? newMatrix[itemId] : [];
        newMatrix[itemId] = currentArray.filter((id: string) => id !== scaleId);
      }
      
      onChange({ matrixValue: newMatrix });
    }
  };

  const renderMatrix = () => {
    const items = question.items || [];
    const scales = question.scales || [];

    if (items.length === 0 || scales.length === 0) {
      return (
        <div className="text-gray-500 italic">
          Matrix question is not properly configured
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              {scales.map((scale: any) => (
                <th key={scale.id} className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {scale.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item: any) => (
              <tr key={item.id}>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                  {item.label}
                </td>
                {scales.map((scale: any) => (
                  <td key={scale.id} className="border border-gray-300 px-4 py-3 text-center">
                    <input
                      type={question.type === 'MATRIX_MULTIPLE' ? 'checkbox' : 'radio'}
                      name={`matrix-${item.id}`}
                      checked={
                        question.type === 'MATRIX_SINGLE'
                          ? (value?.matrixValue?.[item.id] === scale.id)
                          : (value?.matrixValue?.[item.id]?.includes(scale.id) || false)
                      }
                      onChange={(e) => handleMatrixChange(item.id, scale.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMessage = () => {
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
            __html: formatMessageText(question.title || '') 
          }}
        />
      </div>
    );
  };

  const renderContactForm = () => {
    const contactValue = value?.jsonValue || { name: '', email: '', phone: '', company: '' };
    
    // Debug logging
    console.log('🔍 Contact Form Debug:', {
      questionId: question.id,
      showIpsosBranding: question.showIpsosBranding,
      questionType: question.type,
      questionKeys: Object.keys(question)
    });
    
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Name {question.required && '*'}
            </label>
            <input
              type="text"
              value={contactValue.name || ''}
              onChange={(e) => handleContactChange('name', e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        )}
        
        {question.collectEmail && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email {question.required && '*'}
            </label>
            <input
              type="email"
              value={contactValue.email || ''}
              onChange={(e) => handleContactChange('email', e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        )}
        
        {question.collectPhone && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone {question.required && '*'}
            </label>
            <input
              type="tel"
              value={contactValue.phone || ''}
              onChange={(e) => handleContactChange('phone', e.target.value)}
              placeholder="Enter your phone number"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        )}
        
        {question.collectCompany && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Company {question.required && '*'}
            </label>
            <input
              type="text"
              value={contactValue.company || ''}
              onChange={(e) => handleContactChange('company', e.target.value)}
              placeholder="Enter your company name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        )}
      </div>
    );
  };

  const renderQuestion = () => {
    switch (question.type) {
      case 'SINGLE_CHOICE':
        return renderSingleChoice();
      case 'MULTIPLE_CHOICE':
        return renderMultipleChoice();
      case 'DROPDOWN':
        return renderDropdown();
      case 'TEXT':
        return renderText();
      case 'TEXTAREA':
        return renderTextarea();
      case 'EMAIL':
        return renderEmail();
      case 'PHONE_NUMBER':
        return renderPhone();
      case 'WEBSITE':
        return renderUrl();
      case 'NUMBER':
      case 'DECIMAL':
        return renderNumber();
      case 'SLIDER':
        return renderSlider();
      case 'OPINION_SCALE':
        return renderOpinionScale();
      case 'YES_NO':
        return renderYesNo();
      case 'DATE':
        return renderDate();
      case 'TIME':
        return renderTime();
      case 'MATRIX_SINGLE':
      case 'MATRIX_MULTIPLE':
        return renderMatrix();
      case 'CONTACT_FORM':
        return renderContactForm();
      case 'MESSAGE':
        return renderMessage();
      default:
        return (
          <div className="text-gray-500 italic">
            Question type "{question.type}" is not yet supported
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Don't show title for MESSAGE type questions as they handle their own display */}
      {question.type !== 'MESSAGE' && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 leading-relaxed">
            {question.title}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {question.helpText && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{question.helpText}</p>
          )}
        </div>
      )}
      
      <div className="mt-2">
        {renderQuestion()}
      </div>
      
      {violation && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 font-medium">{violation.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
