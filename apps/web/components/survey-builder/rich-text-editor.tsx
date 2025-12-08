"use client";

import { useState, useRef, useEffect } from 'react';
import PipingTokenRenderer, { validatePipingTokens } from './piping-token-renderer';
import PipingButton from './piping-button';
import PipingModal from './piping-modal';
import { QuestionWithDetails } from '@/lib/api/questions-api';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  availableQuestions?: QuestionWithDetails[];
  currentQuestionId?: string;
  showPipingButton?: boolean;
  label?: string;
  error?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  disabled = false,
  rows = 3,
  className = "",
  availableQuestions = [],
  currentQuestionId,
  showPipingButton = true,
  label,
  error
}: RichTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showPipingModal, setShowPipingModal] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Validation
  const validation = validatePipingTokens(value, availableQuestions);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(value);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleInsertPipe = (token: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = editValue.slice(0, start) + token + editValue.slice(end);
      setEditValue(newValue);
      
      // Set cursor position after the inserted token
      setTimeout(() => {
        const newPosition = start + token.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    } else {
      // Fallback: append to end
      setEditValue(prev => prev + token);
    }
  };

  const handleTokenDelete = (tokenToDelete: string) => {
    const newValue = editValue.replace(tokenToDelete, '');
    setEditValue(newValue);
  };

  const handleCursorPositionChange = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onSelect={handleCursorPositionChange}
            onClick={handleCursorPositionChange}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              error ? 'border-red-300' : 'border-blue-300'
            } ${className}`}
          />
          
          {/* Editing Controls */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              {showPipingButton && availableQuestions.length > 0 && (
                <PipingButton
                  onClick={() => setShowPipingModal(true)}
                  size="sm"
                />
              )}
              
              {!validation.isValid && (
                <div className="text-xs text-red-600">
                  {validation.errors.length} piping error{validation.errors.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
          
          {/* Validation Errors */}
          {!validation.isValid && (
            <div className="mt-1 text-xs text-red-600">
              {validation.errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          )}
        </div>

        {/* Piping Modal */}
        {showPipingModal && (
          <PipingModal
            isOpen={showPipingModal}
            onClose={() => setShowPipingModal(false)}
            onInsertPipe={handleInsertPipe}
            availableQuestions={availableQuestions}
            currentQuestionId={currentQuestionId}
          />
        )}
      </div>
    );
  }

  // Display Mode
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div
        onClick={handleStartEdit}
        className={`min-h-[2.5rem] p-3 border rounded-md cursor-text transition-colors ${
          disabled 
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${error ? 'border-red-300' : ''} ${className}`}
      >
        {value.trim() ? (
          <PipingTokenRenderer
            text={value}
            isEditable={false}
          />
        ) : (
          <span className="text-gray-400 italic">{placeholder}</span>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {!validation.isValid && (
        <div className="text-xs text-amber-600">
          <div className="font-medium">Piping Issues:</div>
          {validation.errors.map((error, index) => (
            <div key={index}>• {error}</div>
          ))}
        </div>
      )}
    </div>
  );
}
