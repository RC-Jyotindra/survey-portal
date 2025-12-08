"use client";

import { useState } from 'react';

interface PipingToken {
  type: string;
  source: string;
  field: string;
  raw: string;
}

interface PipingTokenRendererProps {
  text: string;
  isEditable?: boolean;
  onTokenEdit?: (oldToken: string, newToken: string) => void;
  onTokenDelete?: (token: string) => void;
}

interface TokenChipProps {
  token: PipingToken;
  isEditable?: boolean;
  onEdit?: (oldToken: string, newToken: string) => void;
  onDelete?: (token: string) => void;
}

// Parse piping tokens from text
function parsePipingTokens(text: string): (string | PipingToken)[] {
  const tokenRegex = /\$\{pipe:([^:]+):([^:]+):([^}]+)\}/g;
  const parts: (string | PipingToken)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Add text before the token
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the token
    parts.push({
      type: match[1] || '',
      source: match[2] || '', 
      field: match[3] || '',
      raw: match[0]
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function TokenChip({ token, isEditable, onEdit, onDelete }: TokenChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getTokenDisplay = (token: PipingToken): { label: string; color: string; icon: string } => {
    switch (token.type) {
      case 'question':
        return { 
          label: `${token.source} (${token.field})`, 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '📝'
        };
      case 'embeddedData':
        return { 
          label: `ED: ${token.source}`, 
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: '💾'
        };
      case 'geoip':
        return { 
          label: `Location: ${token.field}`, 
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '🌍'
        };
      case 'datetime':
        return { 
          label: `Date: ${token.field}`, 
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: '📅'
        };
      default:
        return { 
          label: `${token.type}: ${token.source}`, 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '🔧'
        };
    }
  };

  const { label, color, icon } = getTokenDisplay(token);

  return (
    <span className="relative inline-block">
      <span
        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${color} cursor-default`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="mr-1">{icon}</span>
        {label}
        {isEditable && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(token.raw);
            }}
            className="ml-1 text-current opacity-60 hover:opacity-100"
            title="Remove piping"
          >
            ×
          </button>
        )}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
          {token.raw}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </span>
  );
}

export default function PipingTokenRenderer({ 
  text, 
  isEditable = false, 
  onTokenEdit, 
  onTokenDelete 
}: PipingTokenRendererProps) {
  const parts = parsePipingTokens(text);

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        } else {
          return (
            <TokenChip
              key={index}
              token={part}
              isEditable={isEditable}
              onEdit={onTokenEdit}
              onDelete={onTokenDelete}
            />
          );
        }
      })}
    </span>
  );
}

// Utility function to resolve tokens to actual values (for preview mode)
export function resolvePipingTokens(
  text: string, 
  questionResponses: Record<string, any> = {},
  embeddedData: Record<string, any> = {},
  geoipData: Record<string, any> = {}
): string {
  const tokenRegex = /\$\{pipe:([^:]+):([^:]+):([^}]+)\}/g;
  
  return text.replace(tokenRegex, (match, type, source, field) => {
    try {
      switch (type) {
        case 'question':
          const questionResponse = questionResponses[source];
          if (field === 'response') {
            return questionResponse?.value || '[No Response]';
          } else if (field === 'choiceText') {
            return questionResponse?.choiceText || '[No Choice]';
          }
          return '[Unknown Field]';

        case 'embeddedData':
          return embeddedData[source] || '[Missing Data]';

        case 'geoip':
          return geoipData[field] || '[Location Unknown]';

        case 'datetime':
          if (field === 'now') {
            return new Date().toLocaleDateString();
          } else if (field === 'time') {
            return new Date().toLocaleTimeString();
          }
          return '[Invalid Date]';

        default:
          return `[${type}:${source}:${field}]`;
      }
    } catch (error) {
      console.error('Error resolving piping token:', error);
      return '[Error]';
    }
  });
}

// Utility function to extract all piping tokens from text
export function extractPipingTokens(text: string): PipingToken[] {
  const parts = parsePipingTokens(text);
  return parts.filter((part): part is PipingToken => typeof part !== 'string');
}

// Utility function to validate piping tokens
export function validatePipingTokens(
  text: string, 
  availableQuestions: { variableName: string }[] = []
): { isValid: boolean; errors: string[] } {
  const tokens = extractPipingTokens(text);
  const errors: string[] = [];
  const questionVariables = new Set(availableQuestions.map(q => q.variableName));

  for (const token of tokens) {
    if (token.type === 'question' && !questionVariables.has(token.source)) {
      errors.push(`Question "${token.source}" not found or not available for piping`);
    }
    
    if (!token.type || !token.source || !token.field) {
      errors.push(`Invalid piping token format: ${token.raw}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
