"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import MatrixItemDisplayLogicModal from './matrix-item-display-logic-modal';
import MatrixScaleDisplayLogicModal from './matrix-scale-display-logic-modal';
import { getApiHeaders } from '@/lib/api-headers';
import { config } from '@/lib/config';

interface MatrixEditorProps {
  question: QuestionWithDetails;
  surveyId: string;
  onQuestionUpdated: (question: QuestionWithDetails) => void;
  isUpdating?: boolean;
  allQuestions?: QuestionWithDetails[];
}

interface MatrixItem {
  id: string;
  value: string;
  label: string;
  index: number;
}

interface MatrixScale {
  id: string;
  value: string;
  label: string;
  index: number;
}

export default function MatrixEditor({
  question,
  surveyId,
  onQuestionUpdated,
  isUpdating = false,
  allQuestions = []
}: MatrixEditorProps) {
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [scales, setScales] = useState<MatrixScale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal state for conditional logic
  const [itemLogicModalOpen, setItemLogicModalOpen] = useState(false);
  const [scaleLogicModalOpen, setScaleLogicModalOpen] = useState(false);
  const [selectedItemForLogic, setSelectedItemForLogic] = useState<any>(null);
  const [selectedScaleForLogic, setSelectedScaleForLogic] = useState<any>(null);

  useEffect(() => {
    if (question) {
      setItems(question.items || []);
      setScales(question.scales || []);
    }
  }, [question]);

  const addItem = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const newItem = {
        questionId: question.id,
        value: `item_${items.length + 1}`,
        label: `Choice ${items.length + 1}`,
        index: items.length
      };

      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/items`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(newItem)
      });

      if (!response.ok) {
        throw new Error('Failed to add matrix item');
      }

      const result = await response.json();
      setItems(prev => [...prev, result.item]);
      
      // Refresh question data
      await refreshQuestion();
    } catch (error) {
      console.error('Error adding matrix item:', error);
      alert('Failed to add matrix item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addScale = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const newScale = {
        questionId: question.id,
        value: `scale_${scales.length + 1}`,
        label: `Scale Point ${scales.length + 1}`,
        index: scales.length
      };

      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/scales`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(newScale)
      });

      if (!response.ok) {
        throw new Error('Failed to add matrix scale');
      }

      const result = await response.json();
      setScales(prev => [...prev, result.scale]);
      
      // Refresh question data
      await refreshQuestion();
    } catch (error) {
      console.error('Error adding matrix scale:', error);
      alert('Failed to add matrix scale. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = async (itemId: string, field: 'value' | 'label', newValue: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/items/${itemId}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ [field]: newValue })
      });

      if (!response.ok) {
        throw new Error('Failed to update matrix item');
      }

      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, [field]: newValue } : item
      ));
    } catch (error) {
      console.error('Error updating matrix item:', error);
      alert('Failed to update matrix item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateScale = async (scaleId: string, field: 'value' | 'label', newValue: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/scales/${scaleId}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ [field]: newValue })
      });

      if (!response.ok) {
        throw new Error('Failed to update matrix scale');
      }

      setScales(prev => prev.map(scale => 
        scale.id === scaleId ? { ...scale, [field]: newValue } : scale
      ));
    } catch (error) {
      console.error('Error updating matrix scale:', error);
      alert('Failed to update matrix scale. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (isLoading) return;
    
    if (!confirm('Are you sure you want to delete this matrix item?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete matrix item');
      }

      setItems(prev => prev.filter(item => item.id !== itemId));
      
      // Refresh question data
      await refreshQuestion();
    } catch (error) {
      console.error('Error deleting matrix item:', error);
      alert('Failed to delete matrix item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteScale = async (scaleId: string) => {
    if (isLoading) return;
    
    if (!confirm('Are you sure you want to delete this matrix scale?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/scales/${scaleId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete matrix scale');
      }

      setScales(prev => prev.filter(scale => scale.id !== scaleId));
      
      // Refresh question data
      await refreshQuestion();
    } catch (error) {
      console.error('Error deleting matrix scale:', error);
      alert('Failed to delete matrix scale. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQuestion = async () => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        onQuestionUpdated(result.question);
      }
    } catch (error) {
      console.error('Error refreshing question:', error);
    }
  };

  // Handler functions for conditional logic
  const handleItemLogicClick = (item: any) => {
    setSelectedItemForLogic(item);
    setItemLogicModalOpen(true);
  };

  const handleScaleLogicClick = (scale: any) => {
    setSelectedScaleForLogic(scale);
    setScaleLogicModalOpen(true);
  };

  const handleItemLogicUpdated = async (expressionId: string | null) => {
    if (selectedItemForLogic) {
      try {
        const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/items/${selectedItemForLogic.id}`, {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({ visibleIfExpressionId: expressionId })
        });

        if (response.ok) {
          await refreshQuestion();
        }
      } catch (error) {
        console.error('Error updating item logic:', error);
        alert('Failed to update item logic. Please try again.');
      }
    }
  };

  const handleScaleLogicUpdated = async (expressionId: string | null) => {
    if (selectedScaleForLogic) {
      try {
        const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/questions/${question.id}/scales/${selectedScaleForLogic.id}`, {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({ visibleIfExpressionId: expressionId })
        });

        if (response.ok) {
          await refreshQuestion();
        }
      } catch (error) {
        console.error('Error updating scale logic:', error);
        alert('Failed to update scale logic. Please try again.');
      }
    }
  };

  const EditableField = ({ 
    value, 
    onChange, 
    placeholder, 
    disabled = false 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string;
    disabled?: boolean;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleSave = () => {
      if (editValue.trim() !== value) {
        onChange(editValue.trim());
      }
      setIsEditing(false);
    };

    const handleCancel = () => {
      setEditValue(value);
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          disabled={disabled}
        />
      );
    }

    return (
      <div
        className="w-full px-2 py-1 text-sm cursor-pointer hover:bg-gray-50 rounded"
        onClick={() => !disabled && setIsEditing(true)}
      >
        {value || placeholder}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Matrix Preview */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Matrix Preview</h4>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                {scales.map((scale) => (
                  <th key={scale.id} className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {scale.label}
                  </th>
                ))}
                {scales.length === 0 && (
                  <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Add scale points
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-200 px-3 py-2 text-sm text-gray-900">
                    {item.label}
                  </td>
                  {scales.map((scale) => (
                    <td key={scale.id} className="border border-gray-200 px-3 py-2 text-center">
                      <input
                        type={question.type === 'MATRIX_MULTIPLE' ? 'checkbox' : 'radio'}
                        name={`matrix-${item.id}`}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        disabled
                      />
                    </td>
                  ))}
                  {scales.length === 0 && (
                    <td className="border border-gray-200 px-3 py-2 text-center text-xs text-gray-400">
                      -
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={scales.length + 1} className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-500">
                    Add choices and scale points to see the matrix
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matrix Items (Rows) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Choices (Rows)</h4>
          <button
            onClick={addItem}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Choice
          </button>
        </div>
        
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <EditableField
                  value={item.label}
                  onChange={(value) => updateItem(item.id, 'label', value)}
                  placeholder="Click to write Choice"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleItemLogicClick(item)}
                  disabled={isLoading}
                  className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-50"
                  title="Set display logic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  disabled={isLoading}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50"
                  title="Delete choice"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          
          {items.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              No choices added yet. Click "Add Choice" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Matrix Scales (Columns) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Scale Points (Columns)</h4>
          <button
            onClick={addScale}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Scale Point
          </button>
        </div>
        
        <div className="space-y-2">
          {scales.map((scale, index) => (
            <div key={scale.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <EditableField
                  value={scale.label}
                  onChange={(value) => updateScale(scale.id, 'label', value)}
                  placeholder="Click to write Scale Point"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleScaleLogicClick(scale)}
                  disabled={isLoading}
                  className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-50"
                  title="Set display logic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteScale(scale.id)}
                  disabled={isLoading}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50"
                  title="Delete scale point"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          
          {scales.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              No scale points added yet. Click "Add Scale Point" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Matrix Table Tips
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Add choices (rows) to represent the questions or items being rated</li>
                <li>Add scale points (columns) to represent the response options</li>
                <li>Click on any text to edit it inline</li>
                <li>Use the matrix type setting to control single vs multiple choice per row</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Item Display Logic Modal */}
      {selectedItemForLogic && (
        <MatrixItemDisplayLogicModal
          isOpen={itemLogicModalOpen}
          onClose={() => {
            setItemLogicModalOpen(false);
            setSelectedItemForLogic(null);
          }}
          item={selectedItemForLogic}
          surveyId={surveyId}
          allQuestions={allQuestions}
          onLogicUpdated={handleItemLogicUpdated}
        />
      )}

      {/* Matrix Scale Display Logic Modal */}
      {selectedScaleForLogic && (
        <MatrixScaleDisplayLogicModal
          isOpen={scaleLogicModalOpen}
          onClose={() => {
            setScaleLogicModalOpen(false);
            setSelectedScaleForLogic(null);
          }}
          scale={selectedScaleForLogic}
          surveyId={surveyId}
          allQuestions={allQuestions}
          onLogicUpdated={handleScaleLogicUpdated}
        />
      )}
    </div>
  );
}
