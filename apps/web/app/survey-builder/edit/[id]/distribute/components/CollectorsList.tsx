'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import AnalyticsDashboard from './AnalyticsDashboard';

interface Collector {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  publicUrl: string;
  opensAt?: Date;
  closesAt?: Date;
  maxResponses?: number;
  allowMultiplePerDevice: boolean;
  allowTest: boolean;
  createdAt: Date;
}

interface CollectorStats {
  totalSessions: number;
  completedSessions: number;
  terminatedSessions: number;
  inProgressSessions: number;
  completionRate: number;
}

interface CollectorsListProps {
  collectors: Collector[];
  onDelete: (collectorId: string) => void;
  onOpenInvites: (collector: Collector) => void;
  surveyId: string;
}

export default function CollectorsList({ collectors, onDelete, onOpenInvites, surveyId }: CollectorsListProps) {
  const [stats, setStats] = useState<Record<string, CollectorStats>>({});
  const [loadingStats, setLoadingStats] = useState<Set<string>>(new Set());
  const [selectedCollector, setSelectedCollector] = useState<string | null>(null);

  useEffect(() => {
    // Load stats for each collector
    collectors.forEach(collector => {
      loadCollectorStats(collector.id);
    });
  }, [collectors]);

  const loadCollectorStats = async (collectorId: string) => {
    setLoadingStats(prev => new Set(prev).add(collectorId));
    
    try {
      const data: CollectorStats = await api.get(`/api/authoring/collectors/${collectorId}/stats`);
      setStats(prev => ({ ...prev, [collectorId]: data }));
    } catch (err) {
      console.error('Failed to load collector stats:', err);
    } finally {
      setLoadingStats(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectorId);
        return newSet;
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PUBLIC':
        return 'Public Link';
      case 'SINGLE_USE':
        return 'Single Use';
      case 'INTERNAL':
        return 'Internal';
      case 'PANEL':
        return 'Panel';
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {collectors.map((collector) => {
        const collectorStats = stats[collector.id];
        const isLoadingStats = loadingStats.has(collector.id);

        return (
          <div key={collector.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{collector.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(collector.status)}`}>
                    {collector.status}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {getTypeLabel(collector.type)}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>Created: {formatDate(collector.createdAt)}</span>
                    {collector.opensAt && (
                      <span>Opens: {formatDate(collector.opensAt)}</span>
                    )}
                    {collector.closesAt && (
                      <span>Closes: {formatDate(collector.closesAt)}</span>
                    )}
                  </div>
                  
                  {collector.maxResponses && (
                    <div>Max responses: {collector.maxResponses}</div>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <span>Multiple devices: {collector.allowMultiplePerDevice ? 'Yes' : 'No'}</span>
                    <span>Allow test: {collector.allowTest ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Stats */}
                {isLoadingStats ? (
                  <div className="mt-4 flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span>Loading stats...</span>
                  </div>
                ) : collectorStats ? (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Total Responses</div>
                      <div className="font-semibold text-gray-900">{collectorStats.totalSessions}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Completed</div>
                      <div className="font-semibold text-green-600">{collectorStats.completedSessions}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">In Progress</div>
                      <div className="font-semibold text-blue-600">{collectorStats.inProgressSessions}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Completion Rate</div>
                      <div className="font-semibold text-gray-900">{collectorStats.completionRate}%</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => copyToClipboard(collector.publicUrl)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy link"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setSelectedCollector(selectedCollector === collector.id ? null : collector.id)}
                  className={`p-2 transition-colors ${
                    selectedCollector === collector.id 
                      ? 'text-blue-600 bg-blue-100' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="View analytics"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
                
                {collector.type === 'SINGLE_USE' && (
                  <button
                    onClick={() => onOpenInvites(collector)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Manage invites"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </button>
                )}
                
                <button
                  onClick={() => onDelete(collector.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete collector"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Public URL */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-500 mb-1">Survey Link</div>
                  <div className="text-sm font-mono text-gray-900 truncate">
                    {collector.publicUrl}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(collector.publicUrl)}
                  className="ml-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Analytics Dashboard */}
            {selectedCollector === collector.id && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <AnalyticsDashboard 
                  surveyId={surveyId} 
                  collectorId={collector.id} 
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
