"use client";

import { useState, useEffect } from 'react';
import { QuestionWithDetails } from '@/lib/api/questions-api';
import { config } from '@/lib/config';
import { getApiHeaders } from '@/lib/api-headers';
import { LoopBattery } from './types';

interface Page {
  id: string;
  index: number;
  titleTemplate: string | null;
}

interface LoopBatteryPanelProps {
  surveyId: string;
  pageId: string;
  allQuestions: QuestionWithDetails[];
  allPages: Page[];
  onLoopBatteryCreated?: (battery: LoopBattery) => void;
  onLoopBatteryUpdated?: (battery: LoopBattery) => void;
  onLoopBatteryDeleted?: (batteryId: string) => void;
}

export default function LoopBatteryPanel({
  surveyId,
  pageId,
  allQuestions,
  allPages,
  onLoopBatteryCreated,
  onLoopBatteryUpdated,
  onLoopBatteryDeleted
}: LoopBatteryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loopBatteries, setLoopBatteries] = useState<LoopBattery[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load loop batteries for this page
  useEffect(() => {
    loadLoopBatteries();
  }, [surveyId, pageId]);

  const loadLoopBatteries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/loop-batteries`, {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        // Filter batteries that include this page
        const relevantBatteries = data.loopBatteries?.filter((battery: LoopBattery) => 
          battery.startPageId === pageId || 
          (battery.startPage.index <= getPageIndex(pageId) && battery.endPage.index >= getPageIndex(pageId))
        ) || [];
        setLoopBatteries(relevantBatteries);
      }
    } catch (error) {
      console.error('Error loading loop batteries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPageIndex = (pageId: string): number => {
    const page = allPages.find(p => p.id === pageId);
    return page?.index || 1;
  };

  const handleCreateBattery = () => {
    setIsCreateModalOpen(true);
  };

  const handleBatteryCreated = (newBattery: LoopBattery) => {
    setLoopBatteries(prev => [...prev, newBattery]);
    onLoopBatteryCreated?.(newBattery);
    setIsCreateModalOpen(false);
  };

  const handleBatteryUpdated = (updatedBattery: LoopBattery) => {
    setLoopBatteries(prev => prev.map(b => b.id === updatedBattery.id ? updatedBattery : b));
    onLoopBatteryUpdated?.(updatedBattery);
  };

  const handleBatteryDeleted = async (batteryId: string) => {
    try {
      const response = await fetch(`${config.api.surveyService}/api/surveys/${surveyId}/loop-batteries/${batteryId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (response.ok) {
        setLoopBatteries(prev => prev.filter(b => b.id !== batteryId));
        onLoopBatteryDeleted?.(batteryId);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete loop battery');
      }
    } catch (error) {
      console.error('Error deleting loop battery:', error);
      alert('Failed to delete loop battery. Please try again.');
    }
  };

  // Get available source questions (multi-select questions that come before this page)
  const getAvailableSourceQuestions = (): QuestionWithDetails[] => {
    return allQuestions.filter(question => 
      question.type === 'MULTIPLE_CHOICE' && 
      question.pageId !== pageId // Exclude questions from the same page
    );
  };

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-2"
      >
        <span className="text-sm font-medium text-gray-900">🔄 Loop & merge</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="space-y-3 mt-3">
          {/* Create Loop Battery Button */}
          <button 
            onClick={handleCreateBattery}
            className="w-full p-3 text-left border border-purple-200 rounded-lg hover:border-purple-300 hover:shadow-sm bg-purple-50"
          >
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-purple-100 rounded">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Create Loop Battery</h4>
                <p className="text-xs text-gray-500">Repeat pages for each answer</p>
              </div>
            </div>
          </button>

          {/* Existing Loop Batteries */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
          ) : loopBatteries.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Active Loops</h4>
              {loopBatteries.map((battery) => (
                <LoopBatteryItem
                  key={battery.id}
                  battery={battery}
                  onEdit={() => {/* TODO: Open edit modal */}}
                  onDelete={() => handleBatteryDeleted(battery.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">No loop batteries created yet</p>
            </div>
          )}
        </div>
      )}

      {/* Dataset Management Panel - Only show if there are loop batteries */}
      {loopBatteries.length > 0 && (
        <div className="mt-4">
          <DatasetManagementPanel
            surveyId={surveyId}
            loopBatteries={loopBatteries}
            onDatasetUpdated={() => {
              // Refresh loop batteries to get updated dataset info
              loadLoopBatteries();
            }}
          />
        </div>
      )}

      {/* Create Loop Battery Modal */}
      {isCreateModalOpen && (
        <LoopBatteryCreateModal
          surveyId={surveyId}
          pageId={pageId}
          availableSourceQuestions={getAvailableSourceQuestions()}
          allPages={allPages}
          onBatteryCreated={handleBatteryCreated}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}

// Loop Battery Item Component
function LoopBatteryItem({ 
  battery, 
  onEdit, 
  onDelete 
}: { 
  battery: LoopBattery; 
  onEdit: () => void; 
  onDelete: () => void; 
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div 
      className="p-3 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-medium text-gray-900 truncate">
            {battery.name}
          </h5>
          <p className="text-xs text-gray-600 mt-1">
            Pages {battery.startPage.index}-{battery.endPage.index}
          </p>
          {battery.sourceQuestion && (
            <p className="text-xs text-purple-600 mt-1">
              Source: {battery.sourceQuestion.variableName}
            </p>
          )}
          <div className="flex items-center space-x-2 mt-2">
            {battery.randomize && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                Random
              </span>
            )}
            {battery.maxItems && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Max {battery.maxItems}
              </span>
            )}
          </div>
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
              title="Edit loop battery"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete loop battery"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Import the modal component (we'll create this next)
import LoopBatteryCreateModal from './loop-battery-create-modal';
import DatasetManagementPanel from './dataset-management-panel';
