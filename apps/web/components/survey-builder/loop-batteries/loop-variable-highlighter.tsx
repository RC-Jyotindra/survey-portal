"use client";

import { useState, useEffect } from 'react';

interface LoopVariable {
  name: string;
  description: string;
  example: string;
}

interface LoopVariableHighlighterProps {
  text: string;
  onTextChange?: (text: string) => void;
  isEditable?: boolean;
  className?: string;
}

const LOOP_VARIABLES: LoopVariable[] = [
  {
    name: 'loop.key',
    description: 'Current item key',
    example: 'Apple'
  },
  {
    name: 'loop.label',
    description: 'Current item label',
    example: 'Apple Inc.'
  },
  {
    name: 'loop.index',
    description: 'Current iteration number (1-based)',
    example: '1'
  },
  {
    name: 'loop.total',
    description: 'Total number of iterations',
    example: '3'
  },
  {
    name: 'loop.isFirst',
    description: 'True if this is the first iteration',
    example: 'true'
  },
  {
    name: 'loop.isLast',
    description: 'True if this is the last iteration',
    example: 'false'
  },
  {
    name: 'loop.progress',
    description: 'Progress percentage (rounded)',
    example: '33'
  }
];

export default function LoopVariableHighlighter({
  text,
  onTextChange,
  isEditable = false,
  className = ''
}: LoopVariableHighlighterProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [inputRef, setInputRef] = useState<HTMLTextAreaElement | null>(null);

  // Highlight loop variables in text
  const highlightLoopVariables = (text: string): React.JSX.Element[] => {
    if (!text) return [];

    const parts: React.JSX.Element[] = [];
    let lastIndex = 0;
    let key = 0;

    // Find all loop variables in the text
    const loopVariableRegex = /\{\{loop\.[^}]+\}\}/g;
    let match;

    while ((match = loopVariableRegex.exec(text)) !== null) {
      const variableName = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + variableName.length;

      // Add text before the variable
      if (startIndex > lastIndex) {
        parts.push(
          <span key={key++}>
            {text.slice(lastIndex, startIndex)}
          </span>
        );
      }

      // Add the highlighted variable
      parts.push(
        <span
          key={key++}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
          title={`Loop variable: ${variableName}`}
        >
          {variableName}
        </span>
      );

      lastIndex = endIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={key++}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  // Get suggestions based on current cursor position
  const getSuggestions = (): LoopVariable[] => {
    if (!inputRef) return [];

    const cursorPos = inputRef.selectionStart || 0;
    const textBeforeCursor = text.slice(0, cursorPos);
    
    // Check if we're inside or near a loop variable
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
    const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');
    
    if (lastOpenBrace > lastCloseBrace) {
      // We're inside a loop variable
      const currentVariable = textBeforeCursor.slice(lastOpenBrace);
      return LOOP_VARIABLES.filter(variable => 
        variable.name.toLowerCase().includes(currentVariable.toLowerCase())
      );
    }
    
    // Check if we're typing "loop." or similar
    const lastWord = textBeforeCursor.split(/\s+/).pop() || '';
    if (lastWord.toLowerCase().startsWith('loop.')) {
      return LOOP_VARIABLES.filter(variable => 
        variable.name.toLowerCase().startsWith(lastWord.toLowerCase())
      );
    }

    return [];
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCursorPosition(e.target.selectionStart || 0);
    onTextChange?.(newText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '{' && e.ctrlKey) {
      e.preventDefault();
      const cursorPos = inputRef?.selectionStart || 0;
      const newText = text.slice(0, cursorPos) + '{{loop.}}' + text.slice(cursorPos);
      onTextChange?.(newText);
      
      // Set cursor position after the inserted text
      setTimeout(() => {
        if (inputRef) {
          inputRef.setSelectionRange(cursorPos + 7, cursorPos + 7);
        }
      }, 0);
    }
  };

  const insertVariable = (variable: LoopVariable) => {
    if (!inputRef) return;

    const cursorPos = inputRef.selectionStart || 0;
    const newText = text.slice(0, cursorPos) + `{{${variable.name}}}` + text.slice(cursorPos);
    onTextChange?.(newText);
    setShowSuggestions(false);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      if (inputRef) {
        inputRef.setSelectionRange(cursorPos + variable.name.length + 4, cursorPos + variable.name.length + 4);
        inputRef.focus();
      }
    }, 0);
  };

  const suggestions = getSuggestions();

  if (isEditable) {
    return (
      <div className="relative">
        <textarea
          ref={setInputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${className}`}
          placeholder="Type your text here. Use Ctrl+{ to insert loop variables."
        />
        
        {/* Loop Variable Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 border-b border-gray-200">
              <div className="text-xs font-medium text-gray-700">Loop Variables</div>
              <div className="text-xs text-gray-500">Press Ctrl+{`{`} to insert</div>
            </div>
            {suggestions.map((variable, index) => (
              <button
                key={index}
                onClick={() => insertVariable(variable)}
                className="w-full px-3 py-2 text-left hover:bg-purple-50 focus:bg-purple-50 focus:outline-none"
              >
                <div className="flex items-center space-x-2">
                  <code className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                    {`{{${variable.name}}}`}
                  </code>
                  <span className="text-sm text-gray-600">{variable.description}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Example: {variable.example}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Read-only mode with highlighting
  return (
    <div className={`${className}`}>
      {highlightLoopVariables(text)}
    </div>
  );
}

// Loop Variable Tooltip Component
export function LoopVariableTooltip({ 
  variable, 
  children 
}: { 
  variable: LoopVariable; 
  children: React.ReactNode; 
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      
      {showTooltip && (
        <div className="absolute z-10 px-3 py-2 mt-1 text-sm text-white bg-gray-900 rounded-md shadow-lg bottom-full left-1/2 transform -translate-x-1/2">
          <div className="font-medium">{variable.name}</div>
          <div className="text-xs text-gray-300 mt-1">{variable.description}</div>
          <div className="text-xs text-gray-400 mt-1">Example: {variable.example}</div>
          
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Loop Variable Reference Panel
export function LoopVariableReference() {
  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <h4 className="text-sm font-medium text-purple-900 mb-3">Available Loop Variables</h4>
      <div className="space-y-2">
        {LOOP_VARIABLES.map((variable, index) => (
          <div key={index} className="flex items-start space-x-3">
            <code className="px-2 py-1 bg-white border border-purple-200 rounded text-xs font-mono text-purple-700 flex-shrink-0">
              {`{{${variable.name}}}`}
            </code>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-700">{variable.description}</div>
              <div className="text-xs text-gray-500 mt-1">Example: {variable.example}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-white border border-purple-200 rounded">
        <div className="text-xs text-gray-600">
          <strong>Tip:</strong> Use <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">{`{`}</kbd> to quickly insert loop variables.
        </div>
      </div>
    </div>
  );
}
