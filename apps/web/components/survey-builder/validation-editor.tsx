'use client';

import { useState, useEffect } from 'react';
import { QuestionType } from '@/lib/api/questions-api';

interface ValidationEditorProps {
  questionType: QuestionType;
  validation: any;
  minValue?: number | null;
  maxValue?: number | null;
  onChange: (validation: any, minValue?: number | null, maxValue?: number | null) => void;
}

export default function ValidationEditor({
  questionType,
  validation,
  minValue,
  maxValue,
  onChange
}: ValidationEditorProps) {
  const [localValidation, setLocalValidation] = useState(validation || {});
  const [localMinValue, setLocalMinValue] = useState(minValue);
  const [localMaxValue, setLocalMaxValue] = useState(maxValue);

  // Update local state when props change
  useEffect(() => {
    setLocalValidation(validation || {});
    setLocalMinValue(minValue);
    setLocalMaxValue(maxValue);
  }, [validation, minValue, maxValue]);

  const handleValidationChange = (field: string, value: any) => {
    const newValidation = { ...localValidation, [field]: value };
    setLocalValidation(newValidation);
    onChange(newValidation, localMinValue, localMaxValue);
  };

  const handleMinValueChange = (value: number | null) => {
    setLocalMinValue(value);
    onChange(localValidation, value, localMaxValue);
  };

  const handleMaxValueChange = (value: number | null) => {
    setLocalMaxValue(value);
    onChange(localValidation, localMinValue, value);
  };

  const renderNumberValidation = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Value
          </label>
          <input
            type="number"
            value={localMinValue || ''}
            onChange={(e) => handleMinValueChange(e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="No minimum"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Value
          </label>
          <input
            type="number"
            value={localMaxValue || ''}
            onChange={(e) => handleMaxValueChange(e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="No maximum"
          />
        </div>
      </div>
    </div>
  );

  const renderTextValidation = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Length
        </label>
        <input
          type="number"
          min="0"
          value={localValidation.minLength || ''}
          onChange={(e) => handleValidationChange('minLength', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="No minimum length"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maximum Length
        </label>
        <input
          type="number"
          min="0"
          value={localValidation.maxLength || ''}
          onChange={(e) => handleValidationChange('maxLength', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="No maximum length"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pattern (Regex)
        </label>
        <input
          type="text"
          value={localValidation.pattern || ''}
          onChange={(e) => handleValidationChange('pattern', e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="e.g., ^[a-zA-Z]+$"
        />
        <p className="mt-1 text-xs text-gray-500">
          Regular expression pattern for text validation
        </p>
      </div>
    </div>
  );

  const renderDateValidation = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Date
        </label>
        <input
          type="date"
          value={localValidation.minDate || ''}
          onChange={(e) => handleValidationChange('minDate', e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maximum Date
        </label>
        <input
          type="date"
          value={localValidation.maxDate || ''}
          onChange={(e) => handleValidationChange('maxDate', e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );

  const renderFileValidation = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maximum File Size (MB)
        </label>
        <input
          type="number"
          min="1"
          value={localValidation.maxFileSize ? localValidation.maxFileSize / (1024 * 1024) : ''}
          onChange={(e) => handleValidationChange('maxFileSize', e.target.value ? parseInt(e.target.value) * 1024 * 1024 : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="No limit"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allowed File Types
        </label>
        <input
          type="text"
          value={localValidation.allowedFileTypes ? localValidation.allowedFileTypes.join(', ') : ''}
          onChange={(e) => handleValidationChange('allowedFileTypes', e.target.value ? e.target.value.split(',').map(t => t.trim()) : [])}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="jpg, png, pdf, doc"
        />
        <p className="mt-1 text-xs text-gray-500">
          Comma-separated list of allowed file extensions
        </p>
      </div>
    </div>
  );

  const renderMultipleChoiceValidation = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Selections
        </label>
        <input
          type="number"
          min="1"
          value={localValidation.minSelections || ''}
          onChange={(e) => handleValidationChange('minSelections', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="No minimum"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maximum Selections
        </label>
        <input
          type="number"
          min="1"
          value={localValidation.maxSelections || ''}
          onChange={(e) => handleValidationChange('maxSelections', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="No maximum"
        />
      </div>
    </div>
  );

  const getValidationType = () => {
    switch (questionType) {
      case 'NUMBER':
      case 'DECIMAL':
      case 'SLIDER':
      case 'OPINION_SCALE':
        return 'number';
      case 'TEXT':
      case 'TEXTAREA':
        return 'text';
      case 'EMAIL':
        return 'email';
      case 'PHONE_NUMBER':
        return 'phone';
      case 'WEBSITE':
        return 'url';
      case 'DATE':
      case 'DATETIME':
        return 'date';
      case 'FILE_UPLOAD':
      case 'PHOTO_CAPTURE':
        return 'file';
      case 'MULTIPLE_CHOICE':
        return 'multiple_choice';
      default:
        return 'none';
    }
  };

  const validationType = getValidationType();

  if (validationType === 'none') {
    return (
      <div className="text-sm text-gray-500 italic">
        No validation options available for this question type.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-gray-900">Validation Rules</h5>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {validationType.charAt(0).toUpperCase() + validationType.slice(1)} Validation
        </span>
      </div>

      {validationType === 'number' && renderNumberValidation()}
      {validationType === 'text' && renderTextValidation()}
      {validationType === 'email' && (
        <div className="text-sm text-gray-500 italic">
          Email validation is automatically applied.
        </div>
      )}
      {validationType === 'phone' && (
        <div className="text-sm text-gray-500 italic">
          Phone number validation is automatically applied.
        </div>
      )}
      {validationType === 'url' && (
        <div className="text-sm text-gray-500 italic">
          URL validation is automatically applied.
        </div>
      )}
      {validationType === 'date' && renderDateValidation()}
      {validationType === 'file' && renderFileValidation()}
      {validationType === 'multiple_choice' && renderMultipleChoiceValidation()}
    </div>
  );
}
